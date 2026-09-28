import { createComponent, effect, memo, mergeProps, sharedConfig } from "./core.ts";

export { untrack } from "@arachne/signals";
export { createComponent, effect, memo, mergeProps, sharedConfig };

type SSRPayload = string | (() => SSRPayload) | SSRPayload[] | undefined | null | false;

export function scope<T extends () => unknown>(fn: T): T {
	return fn;
}

export function escape(value: unknown, attr = false): string {
	if (value == null || value === false) return "";
	if (typeof value === "function") return escape((value as () => unknown)(), attr);
	const s = String(value);
	if (attr) {
		return s
			.replace(/&/g, "&amp;")
			.replace(/"/g, "&quot;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");
	}
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
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
	return ` ${key}="${escape(value, true)}"`;
}

function resolve(value: SSRPayload): string {
	if (value == null || value === false) return "";
	if (typeof value === "function") return resolve(value());
	if (Array.isArray(value)) return value.map(resolve).join("");
	return value;
}

/** Template + hole interpolations (dom-expressions `ssr` helper). */
export function ssr(templates: string[] | string, ...values: SSRPayload[]): string {
	if (typeof templates === "string") {
		return templates + values.map(resolve).join("");
	}
	let out = templates[0] ?? "";
	for (let i = 0; i < values.length; i += 1) {
		out += resolve(values[i]);
		out += templates[i + 1] ?? "";
	}
	return out;
}

export function ssrElement(
	tag: string,
	props: Record<string, unknown> | (() => Record<string, unknown>) | null | undefined,
	children?: SSRPayload,
	needsId = false,
): string {
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
	const child = children === undefined ? "" : resolve(children);
	return `<${tag}${attrs}>${child}</${tag}>`;
}

export function renderToString(code: () => SSRPayload, options?: { renderId?: string }): string {
	sharedConfig.context = { id: options?.renderId ?? "", count: 0 };
	try {
		return resolve(code());
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
		yield resolve(await code());
	} finally {
		sharedConfig.context = undefined;
	}
}

export function wrapIsland(
	html: string,
	opts: { chunkId: string; propsJson: string; hydrate: string },
): string {
	return (
		`<a-island data-c="${escape(opts.chunkId, true)}" data-p="${escape(opts.propsJson, true)}" data-h="${escape(opts.hydrate, true)}">` +
		html +
		`</a-island>`
	);
}
