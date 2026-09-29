import { deferEffects, renderEffect as trackEffect, untrack } from "@arachne/signals";
import {
	createComponent,
	createUniqueId,
	effect,
	memo,
	mergeProps,
	omitProps,
	scope,
	sharedConfig,
	splitProps,
} from "./core.ts";

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

const TEMPLATE_TAG = new WeakMap<() => Element, string>();

function tmplTag(tmpl: () => Element): string | undefined {
	return TEMPLATE_TAG.get(tmpl);
}

/** Parsing context for table-part roots: `[open, close, depth to the root]`. */
const TABLE_CONTEXT: Record<string, [string, string, number]> = {
	caption: ["<table>", "</table>", 1],
	colgroup: ["<table>", "</table>", 1],
	thead: ["<table>", "</table>", 1],
	tbody: ["<table>", "</table>", 1],
	tfoot: ["<table>", "</table>", 1],
	col: ["<table><colgroup>", "</colgroup></table>", 2],
	tr: ["<table><tbody>", "</tbody></table>", 2],
	td: ["<table><tbody><tr>", "</tr></tbody></table>", 3],
	th: ["<table><tbody><tr>", "</tr></tbody></table>", 3],
};

/**
 * Some DOM implementations drop table-part roots (`<tr>`, `<td>`, …) outside a
 * table even in `<template>`; re-parse inside the right context when that happens.
 */
function parseTemplateRoot(html: string): Node | null {
	const t = document.createElement("template");
	t.innerHTML = html;
	const first = t.content.firstChild;
	const tag = /^<([a-z]+)/i.exec(html)?.[1]?.toLowerCase() ?? "";
	const context = TABLE_CONTEXT[tag];
	if (!context || (first as Element | null)?.tagName?.toLowerCase() === tag) return first;
	const [open, close, depth] = context;
	t.innerHTML = open + html + close;
	let node: Node | null = t.content.firstChild;
	for (let i = 0; i < depth && node; i++) node = node.firstChild;
	return node;
}

export function template(html: string, flag?: 1 | 2): () => Element {
	let node = parseTemplateRoot(html) as Element;
	if (flag === 2 && node) node = node.firstChild as Element;
	const factory = () => node.cloneNode(true) as Element;
	if (node?.tagName) TEMPLATE_TAG.set(factory, node.tagName);
	return factory;
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
		// A tag mismatch means server and client diverged: render fresh rather than
		// walking the wrong subtree (insert() then replaces the server nodes).
		if (el && (!tmpl || el.tagName === tmplTag(tmpl))) return el;
	}
	if (!tmpl) throw new Error("getNextElement: missing template");
	return tmpl();
}

/**
 * JSX compiler bookkeeping for `<a>` (and hydratable trees).
 * Receives an already-created element — must not treat it as a template factory.
 */
export function claimElement(node: Element): Element {
	return node;
}

/** `paddingLeft` → `padding-left`; custom properties and kebab names pass through. */
function cssName(name: string): string {
	return name.startsWith("--") ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/** Set a single CSS property (dom-expressions `setStyleProperty`). */
export function setStyleProperty(
	node: Element,
	name: string,
	value: string | null | undefined,
): void {
	const el = node as HTMLElement;
	name = cssName(name);
	if (value == null || value === "") el.style.removeProperty(name);
	else el.style.setProperty(name, value);
}

/**
 * Compiler `getNextMarker(start)`: from the node after a `<!--$-->` open
 * marker, return `[closeMarker, nodesInBetween]` (dom-expressions contract).
 * Nested holes are skipped by depth; outside hydration the hole is empty.
 */
export function getNextMarker(start: ChildNode | null): [ChildNode | null, ChildNode[]] {
	let end: ChildNode | null = start;
	let depth = 0;
	const current: ChildNode[] = [];
	while (end) {
		if (end.nodeType === 8) {
			const data = (end as Comment).data;
			if (data === "$" || data.startsWith("#") || data === "!") depth += 1;
			else if (data === "/" || data.startsWith("/")) {
				if (depth === 0) return [end, current];
				depth -= 1;
			}
		}
		current.push(end);
		end = end.nextSibling;
	}
	return [end, current];
}

export function setAttribute(node: Element, name: string, value: unknown): void {
	// ARIA states are enumerated strings: `aria-expanded="false"` is meaningful.
	if (typeof value === "boolean" && name.startsWith("aria-")) {
		node.setAttribute(name, String(value));
		return;
	}
	if (value == null || value === false) {
		node.removeAttribute(name);
		return;
	}
	node.setAttribute(name, value === true ? "" : String(value));
}

export function setProperty(node: Element, name: string, value: unknown): void {
	if (name === "className" || name === "class") {
		className(node, value);
		return;
	}
	(node as unknown as Record<string, unknown>)[name] = value;
}

export function setBoolAttribute(node: Element, name: string, value: unknown): void {
	if (value) node.setAttribute(name, "");
	else node.removeAttribute(name);
}

/** dom-expressions `className(node, value[, prev])` — SVG-safe (className is read-only on SVG). */
export function className(node: Element, value: unknown, _prev?: unknown): void {
	if (value == null || value === false) {
		node.removeAttribute("class");
		return;
	}
	node.setAttribute("class", String(value));
}

/** dom-expressions `addEvent(node, name, handler, delegate)` */
export function addEvent(
	node: Element,
	name: string,
	handler: EventListenerOrEventListenerObject | null | undefined | unknown,
	delegate?: boolean,
): void {
	if (delegate) {
		if (Array.isArray(handler)) {
			(node as unknown as Record<string, unknown>)[`$$${name}`] = handler[0];
			(node as unknown as Record<string, unknown>)[`$$${name}Data`] = handler[1];
		} else {
			(node as unknown as Record<string, unknown>)[`$$${name}`] = handler;
		}
		return;
	}
	if (Array.isArray(handler)) {
		const handlerFn = handler[0] as (data: unknown, e: Event) => void;
		const wrapped = (e: Event) => handlerFn.call(node, handler[1], e);
		handler[0] = wrapped;
		node.addEventListener(name, wrapped);
		return;
	}
	if (handler == null) return;
	node.addEventListener(
		name,
		handler as EventListenerOrEventListenerObject,
		typeof handler !== "function" ? (handler as AddEventListenerOptions) : undefined,
	);
}

/** dom-expressions `style(node, value, prev)` */
export function style(
	node: Element,
	value: string | Record<string, string | null | undefined> | null | undefined,
	prev?: string | Record<string, string | null | undefined> | null,
): string | Record<string, string | null | undefined> | null | undefined {
	const el = node as HTMLElement;
	if (!value) {
		if (prev) el.removeAttribute("style");
		return value;
	}
	if (typeof value === "string") {
		el.style.cssText = value;
		return value;
	}
	return assignStyleObject(el, value, typeof prev === "string" ? undefined : (prev ?? undefined));
}

function assignStyleObject(
	el: HTMLElement,
	value: Record<string, string | null | undefined>,
	prev?: Record<string, string | null | undefined>,
): Record<string, string | null | undefined> {
	if (prev === undefined && el.style.cssText) el.style.cssText = "";
	const next: Record<string, string | null | undefined> = { ...(prev ?? {}) };
	for (const key of Object.keys(next)) {
		if (value[key] == null) {
			el.style.removeProperty(cssName(key));
			delete next[key];
		}
	}
	for (const [key, v] of Object.entries(value)) {
		if (v === next[key]) continue;
		if (v == null) el.style.removeProperty(cssName(key));
		else el.style.setProperty(cssName(key), String(v));
		next[key] = v;
	}
	return next;
}

function isNode(value: unknown): value is Node {
	return (
		typeof value === "object" &&
		value !== null &&
		"nodeType" in value &&
		typeof (value as Node).nodeType === "number"
	);
}

function unwrapAccessor(value: unknown): unknown {
	let current = value;
	while (typeof current === "function") {
		current = (current as () => unknown)();
	}
	return current;
}

/** Resolve nested accessors/memos while the caller is still tracking. */
function resolveDeep(value: unknown): unknown {
	const resolved = typeof value === "function" ? unwrapAccessor(value) : value;
	if (Array.isArray(resolved)) return resolved.map((item) => resolveDeep(item));
	return resolved;
}

/**
 * Live run of sibling nodes between two empty comment markers. Control flow
 * (Show/For/Suspense) renders into a range instead of a wrapper element, so it
 * stays valid inside `<ul>`, `<table>`, `<select>` and adds no layout box.
 */
export class NodeRange {
	readonly start: Comment = document.createComment("");
	readonly end: Comment = document.createComment("");

	constructor() {
		document.createDocumentFragment().append(this.start, this.end);
	}

	/** Parent the range currently lives in (a fragment until inserted). */
	get parent(): Node {
		return this.end.parentNode as Node;
	}

	/** Current nodes from `start` to `end`, inclusive. */
	nodes(): Node[] {
		const out: Node[] = [];
		for (let n: Node | null = this.start; n; n = n.nextSibling) {
			out.push(n);
			if (n === this.end) break;
		}
		return out;
	}
}

type Child = Node | NodeRange;

function expand(items: Child | Child[] | null): Node[] {
	if (!items) return [];
	const list = Array.isArray(items) ? items : [items];
	return list.flatMap((item) => (item instanceof NodeRange ? item.nodes() : [item]));
}

function normalizeChild(value: unknown): Child | Child[] | null {
	if (value == null || typeof value === "boolean") return null;
	if (isNode(value) || value instanceof NodeRange) return value;
	if (Array.isArray(value)) {
		const nodes: Child[] = [];
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

const isText = (value: unknown): value is string | number =>
	typeof value === "string" || typeof value === "number";

/**
 * Same-shape text update: when the previous render was text node(s) and the
 * new value is the same number of strings/numbers, update `data` in place
 * instead of recreating nodes (keeps text selection, avoids layout churn).
 */
function patchText(prev: Child | Child[] | null, value: unknown): boolean {
	if (!prev) return false;
	const nodes = Array.isArray(prev) ? prev : [prev];
	if (nodes.some((n) => n instanceof NodeRange)) return false;
	const values = Array.isArray(value) ? value : [value];
	if (nodes.length === 0 || nodes.length !== values.length) return false;
	for (let i = 0; i < nodes.length; i++) {
		if ((nodes[i] as Node).nodeType !== 3 || !isText(values[i])) return false;
	}
	for (let i = 0; i < nodes.length; i++) {
		const text = nodes[i] as Text;
		const next = String(values[i]);
		if (text.data !== next) text.data = next;
	}
	return true;
}

function replaceNodes(
	parent: Node,
	marker: Node | null | undefined,
	prev: Child | Child[] | null,
	next: Child | Child[] | null,
): Child | Child[] | null {
	const incoming = expand(next);
	for (const n of expand(prev)) {
		// Keep nodes that are part of (or inside) the new content — reordering and
		// hydration claims move them instead of detaching them.
		if (incoming.some((m) => m === n || m.contains(n))) continue;
		n.parentNode?.removeChild(n);
	}
	if (!next) return null;
	// After a range is inserted its marker's real parent is the target.
	const target = marker?.parentNode ?? parent;
	const before = marker ?? null;
	for (const n of incoming) target.insertBefore(n, before);
	return next;
}

/**
 * Compiler `insert(parent, accessor, marker?, initial?)`. `initial` holds the
 * server-rendered nodes of the hole while hydrating; they are replaced on the
 * first run (claimed nodes are kept), so markup is adopted, not duplicated.
 */
export function insert(
	parent: Node,
	accessor: unknown,
	marker?: Node | null,
	initial?: Node | Node[] | null,
): void {
	// A sole dynamic child owns all of the parent's server-rendered children.
	const existing: Child | Child[] | null =
		initial !== undefined
			? initial
			: sharedConfig.hydrate && !marker
				? [...parent.childNodes]
				: null;
	if (typeof accessor !== "function") {
		replaceNodes(parent, marker, existing, normalizeChild(resolveDeep(accessor)));
		return;
	}
	let prev: Child | Child[] | null = existing;
	trackEffect(() => {
		// Resolve nested memos/signals here so dependencies are tracked.
		const value = resolveDeep((accessor as () => unknown)());
		untrack(() => {
			if (patchText(prev, value)) return;
			prev = replaceNodes(parent, marker, prev, normalizeChild(value));
		});
	});
}

const DOM_PROPERTIES = new Set([
	"value",
	"checked",
	"selected",
	"indeterminate",
	"muted",
	"textContent",
	"innerHTML",
]);

type Listener = (e: Event) => void;

function eventName(key: string): string | null {
	if (key.startsWith("on:")) return key.slice(3);
	if (key.length > 2 && key.startsWith("on") && key[2] === key[2]?.toUpperCase()) {
		return key.slice(2).toLowerCase();
	}
	return null;
}

function assignClassList(node: Element, value: unknown, prev: unknown): void {
	const next = (value ?? {}) as Record<string, unknown>;
	const before = (prev ?? {}) as Record<string, unknown>;
	for (const name of Object.keys(before)) {
		if (!next[name]) node.classList.remove(name);
	}
	for (const [name, on] of Object.entries(next)) {
		if (Boolean(on) !== Boolean(before[name])) node.classList.toggle(name, Boolean(on));
	}
}

function assignProp(node: Element, key: string, value: unknown, prev: unknown): unknown {
	if (key === "class" || key === "className") {
		className(node, value);
		return value;
	}
	if (key === "classList") {
		assignClassList(node, value, prev);
		return value;
	}
	if (key === "style") {
		return style(node, value as Parameters<typeof style>[1], prev as Parameters<typeof style>[2]);
	}
	const event = eventName(key);
	if (event) {
		if (prev) node.removeEventListener(event, prev as Listener);
		if (typeof value === "function") node.addEventListener(event, value as Listener);
		return value;
	}
	if (key.startsWith("prop:")) {
		(node as unknown as Record<string, unknown>)[key.slice(5)] = value;
		return value;
	}
	if (DOM_PROPERTIES.has(key)) {
		(node as unknown as Record<string, unknown>)[key] = value ?? "";
		return value;
	}
	setAttribute(node, key.startsWith("attr:") ? key.slice(5) : key, value);
	return value;
}

/**
 * Compiler-emitted `spread(node, props, skipChildren)` — applies a props
 * object (usually from `mergeProps`) to an element and keeps it in sync.
 * Handlers are attached directly (not delegated) so they can be swapped.
 */
export function spread(
	node: Element,
	props: Record<string, unknown> | (() => Record<string, unknown>),
	skipChildren?: boolean,
): void {
	const read = () => (typeof props === "function" ? props() : props) ?? {};
	if (!skipChildren) insert(node, () => read()["children"]);

	const prev: Record<string, unknown> = {};
	trackEffect(() => {
		const current = read();
		const seen = new Set<string>();
		for (const key of Object.keys(current)) {
			if (key === "children" || key === "ref") continue;
			seen.add(key);
			const value = current[key];
			if (value === prev[key] && key !== "style" && key !== "classList") continue;
			prev[key] = untrack(() => assignProp(node, key, value, prev[key]));
		}
		for (const key of Object.keys(prev)) {
			if (seen.has(key)) continue;
			untrack(() => assignProp(node, key, undefined, prev[key]));
			delete prev[key];
		}
	});

	const ref = untrack(() => read()["ref"]);
	if (typeof ref === "function") untrack(() => (ref as (el: Element) => void)(node));
}

/** Compiler-emitted `ref(() => fn | fn[], node)` — calls each ref with the element. */
export function ref(accessor: () => unknown, node: Element): void {
	const value = untrack(accessor);
	for (const fn of Array.isArray(value) ? value : [value]) {
		if (typeof fn === "function") untrack(() => (fn as (el: Element) => void)(node));
	}
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
	// Claim server elements by the `data-hk` keys `ssrHydrationKey()` emitted.
	const map = new Map<string, Element>();
	for (const node of element.querySelectorAll("[data-hk]")) {
		const key = node.getAttribute("data-hk");
		if (key !== null) map.set(key, node);
	}
	const endHydration = () => {
		sharedConfig.context = undefined;
		sharedConfig.hydrate = false;
		sharedConfig.get = undefined;
		sharedConfig.has = undefined;
	};
	sharedConfig.hydrate = true;
	sharedConfig.context = { id: "", count: 0 };
	sharedConfig.get = (key) => map.get(key);
	sharedConfig.has = (key) => map.has(key);
	try {
		// Component effects are queued until every server node is claimed and the
		// hydration context is gone, so the claim order matches the server (where
		// effects never run) and deferred effects can't claim nodes themselves.
		const stop = deferEffects(() => {
			try {
				return trackEffect(() => {
					insert(element, code, null, [...element.childNodes]);
				});
			} finally {
				endHydration();
			}
		});
		runHydrationEvents();
		return () => {
			stop();
			element.textContent = "";
		};
	} finally {
		endHydration();
	}
}

export {
	createComponent,
	createUniqueId,
	effect,
	memo,
	mergeProps,
	omitProps,
	scope,
	sharedConfig,
	splitProps,
	untrack,
};
