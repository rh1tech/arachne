/** Lightweight DOM JSX runtime for Bun/tsc paths that don't use @arachnejs/jsx. */

export function Fragment(props: { children?: unknown }): unknown {
	return props.children;
}

function flatten(children: unknown): unknown[] {
	if (children == null || typeof children === "boolean") return [];
	if (Array.isArray(children)) return children.flatMap(flatten);
	return [children];
}

const BOOLEAN_PROPS = new Set(["checked", "disabled", "selected", "multiple"]);

function applyEvent(el: Element, key: string, value: unknown): boolean {
	if (!key.startsWith("on") || typeof value !== "function") return false;
	el.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
	return true;
}

function applyProp(el: Element, key: string, value: unknown): void {
	if (value == null || key === "children" || key === "ref") return;
	if (applyEvent(el, key, value)) return;
	if (key === "class" || key === "className") {
		(el as HTMLElement).className = String(value);
	} else if (key === "style") {
		if (typeof value === "string") (el as HTMLElement).style.cssText = value;
	} else if (BOOLEAN_PROPS.has(key)) {
		(el as unknown as Record<string, boolean>)[key] = Boolean(value);
	} else if (key === "value") {
		(el as HTMLInputElement).value = String(value);
	} else if (typeof value === "boolean") {
		value ? el.setAttribute(key, "") : el.removeAttribute(key);
	} else {
		el.setAttribute(key, String(value));
	}
}

function create(type: unknown, props: Record<string, unknown> | null | undefined): unknown {
	if (typeof type === "function") {
		return (type as (p: Record<string, unknown>) => unknown)(props ?? {});
	}
	if (typeof type !== "string") return null;
	if (typeof document === "undefined") return null;

	const el = document.createElement(type);
	const p = props ?? {};
	for (const [key, value] of Object.entries(p)) {
		applyProp(el, key, value);
	}
	// `flatten` already expands nested arrays and drops null/boolean children.
	for (const child of flatten(p["children"])) {
		if (typeof child === "string" || typeof child === "number") {
			el.appendChild(document.createTextNode(String(child)));
		} else if (typeof child === "object" && child && "nodeType" in child) {
			el.appendChild(child as Node);
		}
	}
	return el;
}

export function jsx(type: unknown, props: unknown, _key?: unknown): unknown {
	return create(type, props as Record<string, unknown>);
}

export function jsxs(type: unknown, props: unknown, _key?: unknown): unknown {
	return create(type, props as Record<string, unknown>);
}

export function jsxDEV(
	type: unknown,
	props: unknown,
	_key?: unknown,
	_isStatic?: boolean,
	_source?: unknown,
	_self?: unknown,
): unknown {
	return create(type, props as Record<string, unknown>);
}
