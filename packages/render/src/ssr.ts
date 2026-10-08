import { withoutEffects } from "@arachnejs/signals";
import {
	createComponent,
	createUniqueId,
	effect,
	memo,
	mergeProps,
	omitProps,
	sharedConfig,
	splitProps,
} from "./core.ts";

export { isServerRender, untrack } from "@arachnejs/signals";
export { For, Show, Suspense } from "./control-flow-ssr.ts";
export {
	createComponent,
	createUniqueId,
	effect,
	memo,
	mergeProps,
	omitProps,
	sharedConfig,
	splitProps,
};

/** Trusted SSR fragment — passed through `escape` without re-escaping (dom-expressions). */
export type SSRNode = { t: string };

export type SSRPayload =
	| string
	| number
	| boolean
	| SSRNode
	| (() => SSRPayload)
	| SSRPayload[]
	| undefined
	| null;

/**
 * Portals target `document.body` at runtime, so the server emits nothing and
 * the client mounts the content after hydration (overlays start closed).
 */
export function Portal(_props: { mount?: unknown; children?: unknown }): string {
	return "";
}

/**
 * The compiler wraps a dynamic child (`{props.children}`, `{cond && <X/>}`) in
 * `scope(() => …)`: run it now, where it stands. Returning the function put it
 * off until the template was joined, after every eager hole beside it, so a
 * `<For>` after `{props.children}` took its hydration keys first; the client
 * renders in document order and then claimed the wrong server elements.
 */
export function scope<T extends () => unknown>(fn: T): ReturnType<T> {
	return fn() as ReturnType<T>;
}

export function resolveSSRNode(node: unknown): string {
	const t = typeof node;
	if (t === "string") return node as string;
	if (node == null || t === "boolean") return "";
	if (Array.isArray(node)) {
		let mapped = "";
		for (const child of node) mapped += resolveSSRNode(child);
		return mapped;
	}
	if (t === "object" && node !== null && "t" in (node as object)) {
		return String((node as SSRNode).t);
	}
	if (t === "function") return resolveSSRNode((node as () => unknown)());
	return String(node);
}

export function escape(s: unknown, attr = false): unknown {
	const t = typeof s;
	if (t === "string") return escapeString(s as string, attr);
	if (!attr && t === "function") return escape((s as () => unknown)());
	if (!attr && Array.isArray(s)) return (s as unknown[]).map((item) => escape(item));
	if (attr) {
		// Booleans stay booleans: ssrAttribute renders `true` as a bare attribute
		// and drops `false` (aria-* get "true"/"false"), as the DOM runtime does.
		if (s == null || t === "number" || t === "boolean") return s;
		// `classList` maps: ssrAttribute escapes the class names it keeps.
		if (t === "object" && !Array.isArray(s)) return s;
		return escape(String(s), attr);
	}
	return s;
}

function escapeString(str: string, attr: boolean): string {
	if (attr) {
		return str
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}
	return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function ssrHydrationKey(): string {
	if (!sharedConfig.context) return "";
	return ` data-hk="${getHydrationKey()}"`;
}

export function getHydrationKey(): string {
	const ctx = sharedConfig.context;
	if (!ctx) return "";
	return `${ctx.id}${ctx.count++}`;
}

/**
 * Compiler `ssrAttribute(key, value, isBoolean)`: `value` arrives already
 * attribute-escaped by the compiler, so it is not escaped again here.
 */
export function ssrAttribute(key: string, value: unknown, isBoolean = false): string {
	if (key === "classList") return classListMark(value);
	if (typeof value === "boolean" && key.startsWith("aria-")) return ` ${key}="${value}"`;
	if (value == null || value === false) return "";
	if (isBoolean || value === true) return ` ${key}`;
	return ` ${key}="${value as string}"`;
}

/** Runtime-side attribute (spread / ssrElement): escapes the raw value. */
function rawAttribute(key: string, value: unknown, isBoolean = false): string {
	return ssrAttribute(
		key,
		typeof value === "string" || typeof value === "number" ? escape(value, true) : value,
		isBoolean,
	);
}

/** Template + hole interpolations (dom-expressions `ssr` helper). */
/** Values for several template holes, computed once (compiler `ssrGroup`). */
type SSRGroup = { readonly values: unknown[]; index: number };

function isGroup(value: unknown): value is SSRGroup {
	return typeof value === "object" && value !== null && GROUP in value;
}

const GROUP = Symbol("ssrGroup");

/**
 * Compiler `ssrGroup(fn, count)`: evaluate every dynamic part of one element
 * once; the same group is passed for each hole and yields the next value.
 */
export function ssrGroup(fn: () => unknown[], _count: number): SSRGroup {
	return { [GROUP]: true, values: fn(), index: 0 } as SSRGroup;
}

/**
 * `classList={{ … }}` holes become a marked class value; `ssr()` merges it
 * into the element's `class` attribute (an element may have only one).
 */
const CLASS_MARK = "\uE000";

function classListMark(value: unknown): string {
	const map = (value ?? {}) as Record<string, unknown>;
	const names = Object.keys(map).filter((name) => map[name]);
	return `${CLASS_MARK}"${escape(names.join(" "), true) as string}"`;
}

/** Merge marked classList values into one `class` attribute per opening tag. */
function mergeClassLists(html: string): string {
	return html.replace(
		/<([a-zA-Z][\w-]*)([^<>]*\uE000[^<>]*)>/g,
		(_tag, name: string, attrs: string) => {
			const classes: string[] = [];
			const rest = attrs.replace(
				/ class="([^"]*)"|\uE000"([^"]*)"/g,
				(_m, own?: string, listed?: string) => {
					const value = own ?? listed;
					if (value) classes.push(value);
					return "";
				},
			);
			return `<${name}${classes.length ? ` class="${classes.join(" ")}"` : ""}${rest}>`;
		},
	);
}

/** Template + hole interpolations. Holes arrive already escaped by the compiler. */
export function ssr(templates: string[] | string, ...values: SSRPayload[]): SSRNode {
	if (typeof templates === "string") {
		return { t: templates + values.map(resolveSSRNode).join("") };
	}
	let out = templates[0] ?? "";
	for (let i = 0; i < values.length; i += 1) {
		const value = values[i] as unknown;
		out += resolveSSRNode(isGroup(value) ? value.values[value.index++] : value);
		out += templates[i + 1] ?? "";
	}
	return { t: out.includes(CLASS_MARK) ? mergeClassLists(out) : out };
}

const cssName = (name: string) =>
	name.startsWith("--") ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** `class="…"` hole: strings or `{ name: boolean }` maps, attribute-escaped. */
export function ssrClassName(value: unknown): string {
	if (value == null || value === false) return "";
	if (typeof value === "object") {
		const map = value as Record<string, unknown>;
		return escape(
			Object.keys(map)
				.filter((name) => map[name])
				.join(" "),
			true,
		) as string;
	}
	return escape(value, true) as string;
}

/** `style="…"` hole for a whole style value (string or object). */
export function ssrStyle(value: unknown): string {
	if (value == null || value === false) return "";
	if (typeof value === "string") return escape(value, true) as string;
	return Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v != null && v !== "" && v !== false)
		.map(([k, v]) => `${cssName(k)}:${escape(v, true) as string}`)
		.join(";");
}

/** One `name:value` pair of a static style object; `prefix` includes the `:` (and `;`). */
export function ssrStyleProperty(prefix: string, value: unknown): string {
	return value == null || value === "" || value === false ? "" : `${prefix}${value as string}`;
}

function ssrStyleAttribute(value: Record<string, unknown>): string {
	const css = Object.entries(value)
		.filter(([, v]) => v != null && v !== "")
		.map(
			([k, v]) =>
				`${k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`,
		)
		.join(";");
	return css ? rawAttribute("style", css) : "";
}

function ssrClassList(value: Record<string, unknown>): string {
	const names = Object.keys(value).filter((name) => value[name]);
	return names.length ? rawAttribute("class", names.join(" ")) : "";
}

/** One spread prop as SSR attribute text (handlers, refs and children are skipped). */
function ssrProp(key: string, value: unknown): string {
	if (key === "children" || key === "ref" || typeof value === "function") return "";
	if (key === "class" || key === "className") return rawAttribute("class", value);
	if (key === "style" && value && typeof value === "object") {
		return ssrStyleAttribute(value as Record<string, unknown>);
	}
	if (key === "classList" && value && typeof value === "object") {
		return ssrClassList(value as Record<string, unknown>);
	}
	return rawAttribute(key, value, typeof value === "boolean");
}

export function ssrElement(
	tag: string,
	props: Record<string, unknown> | (() => Record<string, unknown>) | null | undefined,
	children?: SSRPayload,
	needsId = false,
): SSRNode {
	const p = typeof props === "function" ? props() : (props ?? {});
	let attrs = needsId ? ssrHydrationKey() : "";
	for (const [key, value] of Object.entries(p)) attrs += ssrProp(key, value);
	if (VOID_ELEMENTS.has(tag)) return { t: `<${tag}${attrs}>` };
	// Children arrive compiled: text is already escaped and markers are raw HTML.
	const child = children === undefined ? "" : resolveSSRNode(children);
	return { t: `<${tag}${attrs}>${child}</${tag}>` };
}

const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"source",
	"track",
	"wbr",
]);

export function renderToString(code: () => SSRPayload, options?: { renderId?: string }): string {
	sharedConfig.context = { id: options?.renderId ?? "", count: 0 };
	try {
		// Effects are client-only (listeners, timers, rAF): skip them on the server.
		return withoutEffects(() => resolveSSRNode(escape(code())));
	} finally {
		sharedConfig.context = undefined;
	}
}

export async function* renderToStream(
	code: () => SSRPayload | Promise<SSRPayload>,
	options?: { renderId?: string },
): AsyncGenerator<string> {
	sharedConfig.context = { id: options?.renderId ?? "", count: 0 };
	try {
		const payload = await withoutEffects(code);
		yield withoutEffects(() => resolveSSRNode(escape(payload)));
	} finally {
		sharedConfig.context = undefined;
	}
}

export function wrapIsland(
	html: string,
	opts: { chunkId: string; propsJson: string; hydrate: string },
): string {
	return (
		`<a-island data-c="${escape(opts.chunkId, true) as string}" data-p="${escape(opts.propsJson, true) as string}" data-h="${escape(opts.hydrate, true) as string}">` +
		html +
		`</a-island>`
	);
}
