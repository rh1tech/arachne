import { effect as trackEffect, untrack } from "@arachne/signals";
import { createComponent, effect, memo, mergeProps, scope, sharedConfig } from "./core.ts";

const delegatedEvents = new Set<string>();

function eventHandler(e: Event): void {
	const key = `$$${e.type}`;
	let node = (e.composedPath?.()[0] ?? e.target) as (Node & { host?: Node }) | null;
	while (node) {
		const handler = (node as unknown as Record<string, unknown>)[key];
		if (typeof handler === "function") {
			const current = node;
			try {
				Object.defineProperty(e, "currentTarget", {
					configurable: true,
					get: () => current,
				});
			} catch {
				// Some environments expose a non-configurable currentTarget.
			}
			(handler as (ev: Event) => void).call(current, e);
			if (e.cancelBubble) return;
		}
		node = (node.host && node !== node.host ? node.host : node.parentNode) as
			| (Node & { host?: Node })
			| null;
	}
}

export function delegateEvents(eventNames: string[], doc = globalThis.document): void {
	for (const name of eventNames) {
		if (delegatedEvents.has(name)) continue;
		delegatedEvents.add(name);
		doc.addEventListener(name, eventHandler);
	}
}

export function clearDelegatedEvents(doc = globalThis.document): void {
	for (const name of delegatedEvents) {
		doc.removeEventListener(name, eventHandler);
	}
	delegatedEvents.clear();
}

export function template(html: string, flag?: 1 | 2): () => Element {
	const t = document.createElement("template");
	t.innerHTML = html;
	let node = t.content.firstChild as Element;
	if (flag === 2 && node) node = node.firstChild as Element;
	return () => node.cloneNode(true) as Element;
}

export function getHydrationKey(): string {
	const ctx = sharedConfig.context;
	if (!ctx) return "";
	return `${ctx.id}${ctx.count++}`;
}

export function getNextElement(tmpl?: () => Element): Element {
	if (sharedConfig.context && sharedConfig.has) {
		const key = getHydrationKey();
		const el = sharedConfig.get?.(key);
		if (el) return el;
	}
	if (!tmpl) throw new Error("getNextElement: missing template");
	return tmpl();
}

export function getNextMarker(start: ChildNode | null): [ChildNode | null, ChildNode | null] {
	let end: ChildNode | null = start;
	let count = 0;
	while (end) {
		if (end.nodeType === 8) {
			const data = (end as Comment).data;
			if (data.startsWith("#") || data === "$" || data === "!") {
				count += 1;
			} else if (data.startsWith("/") || data === "/") {
				if (count === 0) return [start, end];
				count -= 1;
			}
		}
		end = end.nextSibling;
	}
	return [start, end];
}

export function setAttribute(node: Element, name: string, value: unknown): void {
	if (value == null || value === false) {
		node.removeAttribute(name);
		return;
	}
	node.setAttribute(name, value === true ? "" : String(value));
}

export function setProperty(node: Element, name: string, value: unknown): void {
	if (name === "className") {
		(node as HTMLElement).className = value == null ? "" : String(value);
		return;
	}
	(node as unknown as Record<string, unknown>)[name] = value;
}

export function setBoolAttribute(node: Element, name: string, value: unknown): void {
	if (value) node.setAttribute(name, "");
	else node.removeAttribute(name);
}

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		"nodeType" in value &&
		typeof (value as Node).nodeType === "number"
	);
}

function normalizeChild(value: unknown): Node | Node[] | null {
	if (value == null || typeof value === "boolean") return null;
	if (isNode(value)) return value;
	if (Array.isArray(value)) {
		const nodes: Node[] = [];
		for (const item of value) {
			const n = normalizeChild(item);
			if (!n) continue;
			if (Array.isArray(n)) nodes.push(...n);
			else nodes.push(n);
		}
		return nodes;
	}
	return document.createTextNode(String(value));
}

function readAccessor(accessor: () => unknown): unknown {
	let value: unknown = accessor();
	while (typeof value === "function") {
		value = (value as () => unknown)();
	}
	return value;
}

function replaceNodes(
	parent: Node,
	marker: Node | null | undefined,
	prev: Node | Node[] | null,
	next: Node | Node[] | null,
): Node | Node[] | null {
	if (prev) {
		for (const n of Array.isArray(prev) ? prev : [prev]) {
			n.parentNode?.removeChild(n);
		}
	}
	if (!next) return null;
	const before = marker ?? null;
	if (Array.isArray(next)) {
		for (const n of next) parent.insertBefore(n, before);
		return next;
	}
	parent.insertBefore(next, before);
	return next;
}

export function insert(
	parent: Node,
	accessor: unknown,
	marker?: Node | null,
	_end?: Node | null,
): void {
	if (typeof accessor !== "function") {
		replaceNodes(parent, marker, null, normalizeChild(accessor));
		return;
	}
	let prev: Node | Node[] | null = null;
	trackEffect(() => {
		const value = readAccessor(accessor as () => unknown);
		untrack(() => {
			prev = replaceNodes(parent, marker, prev, normalizeChild(value));
		});
	});
}

export function runHydrationEvents(): void {
	sharedConfig.done = true;
}

export function render(code: () => unknown, element: Element): () => void {
	element.textContent = "";
	const stop = trackEffect(() => {
		insert(element, code);
	});
	return () => {
		stop();
		element.textContent = "";
	};
}

export function hydrate(code: () => unknown, element: Element): () => void {
	sharedConfig.hydrate = true;
	sharedConfig.context = { id: "", count: 0 };
	const map = new Map<string, Element>();
	let i = 0;
	const walk = (nodes: Iterable<ChildNode>): void => {
		for (const node of nodes) {
			if (node.nodeType === 1) {
				map.set(String(i++), node as Element);
				walk((node as Element).childNodes);
			}
		}
	};
	walk(element.childNodes);
	sharedConfig.get = (key) => map.get(key);
	sharedConfig.has = (key) => map.has(key);
	try {
		const stop = trackEffect(() => {
			code();
		});
		runHydrationEvents();
		return () => {
			stop();
			element.textContent = "";
		};
	} finally {
		sharedConfig.context = undefined;
		sharedConfig.hydrate = false;
		sharedConfig.get = undefined;
		sharedConfig.has = undefined;
	}
}

export { createComponent, effect, memo, mergeProps, scope, sharedConfig, untrack };
