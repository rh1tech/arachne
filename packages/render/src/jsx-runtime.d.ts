export namespace JSX {
	type Element = unknown;
	type ElementClass = never;
	interface ElementAttributesProperty {
		props: unknown;
	}
	interface ElementChildrenAttribute {
		children: unknown;
	}
	interface IntrinsicElements {
		[elemName: string]: Record<string, unknown>;
	}
}

export type { JSX };

export function Fragment(props: { children?: unknown }): JSX.Element;
export function jsx(type: unknown, props: unknown, key?: unknown): JSX.Element;
export function jsxs(type: unknown, props: unknown, key?: unknown): JSX.Element;
export function jsxDEV(
	type: unknown,
	props: unknown,
	key?: unknown,
	isStatic?: boolean,
	source?: unknown,
	self?: unknown,
): JSX.Element;
