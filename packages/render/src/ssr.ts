import { createComponent, effect, memo, mergeProps, sharedConfig } from "./core.ts";

export { untrack } from "@arachne/signals";
export { For, Show, Suspense } from "./control-flow-ssr.ts";
export { createComponent, effect, memo, mergeProps, sharedConfig };

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

export function scope<T extends () => unknown>(fn: T): T {
	return fn;
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
		if (t === "boolean") return String(s);
		if (s == null || t === "number") return s;
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

export function ssrAttribute(key: string, value: unknown, isBoolean = false): string {
	if (value == null || value === false) return "";
	if (isBoolean || value === true) return ` ${key}`;
	return ` ${key}="${escape(value, true) as string}"`;
}

/** Template + hole interpolations (dom-expressions `ssr` helper). */
export function ssr(templates: string[] | string, ...values: SSRPayload[]): SSRNode {
	if (typeof templates === "string") {
		return { t: templates + values.map(resolveSSRNode).join("") };
	}
	let out = templates[0] ?? "";
	for (let i = 0; i < values.length; i += 1) {
		out += resolveSSRNode(escape(values[i]));
		out += templates[i + 1] ?? "";
	}
	return { t: out };
}

export function ssrElement(
	tag: string,
	props: Record<string, unknown> | (() => Record<string, unknown>) | null | undefined,
	children?: SSRPayload,
	needsId = false,
): SSRNode {
	const p = typeof props === "function" ? props() : (props ?? {});
	let attrs = needsId ? ssrHydrationKey() : "";
	for (const [key, value] of Object.entries(p)) {
		if (key === "children" || key === "ref") continue;
		if (key === "class" || key === "className") {
			attrs += ssrAttribute("class", value);
			continue;
		}
		if (typeof value === "boolean") {
			attrs += ssrAttribute(key, value, true);
			continue;
		}
		attrs += ssrAttribute(key, value);
	}
	const child = children === undefined ? "" : resolveSSRNode(escape(children));
	return { t: `<${tag}${attrs}>${child}</${tag}>` };
}

export function renderToString(code: () => SSRPayload, options?: { renderId?: string }): string {
	sharedConfig.context = { id: options?.renderId ?? "", count: 0 };
	try {
		return resolveSSRNode(escape(code()));
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
		yield resolveSSRNode(escape(await code()));
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
