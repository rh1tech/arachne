/**
 * Customization system shared by every component:
 *
 * - **Pass-through** — unknown props (`id`, `style`, `data-*`, `aria-*`, handlers)
 *   land on the component root via {@link splitProps} + JSX spread.
 * - **Slots** — `classes` / `styles` target inner parts by name
 *   (`<Modal classes={{ panel: "my-panel" }} />`).
 * - **Theme** — {@link configureUI} registers default props and slot classes per
 *   component, so a design system can restyle the kit without wrappers.
 * - **Unstyled** — `unstyled` drops the built-in `a-*` classes; state still
 *   surfaces through `data-*` attributes for your own CSS.
 */
import { createUniqueId, mergeProps, omitProps } from "@arachne/render";
import { cx } from "./cx.ts";

export type StyleValue = string | Record<string, string | number | null | undefined>;

export type SlotClasses<S extends string> = Partial<Record<S, string>>;
export type SlotStyles<S extends string> = Partial<Record<S, StyleValue>>;

/** DOM event handler forwarded as-is (`onClick`, `onPointerEnter`, `on:custom`, …). */
// biome-ignore lint/suspicious/noExplicitAny: handlers are contravariant; `any` lets every concrete event type fit
export type EventHandler = ((...args: any[]) => unknown) | undefined;

/**
 * Global HTML attributes forwarded to a component's host element. Explicit keys
 * (instead of a string index signature) keep typos in component props an error.
 */
export type HTMLPassThrough = {
	id?: string | undefined;
	title?: string | undefined;
	role?: string | undefined;
	tabindex?: number | string | undefined;
	hidden?: boolean | undefined;
	inert?: boolean | undefined;
	lang?: string | undefined;
	dir?: "ltr" | "rtl" | "auto" | undefined;
	translate?: "yes" | "no" | undefined;
	draggable?: boolean | "true" | "false" | undefined;
	ref?: ((el: HTMLElement) => void) | undefined;
	[attr: `data-${string}`]: unknown;
	[attr: `aria-${string}`]: unknown;
	[handler: `on${Capitalize<string>}`]: EventHandler;
	[handler: `on:${string}`]: EventHandler;
};

/** Native form-control attributes forwarded to `<input>` / `<textarea>` / `<select>`. */
export type InputPassThrough = {
	autocomplete?: string | undefined;
	autofocus?: boolean | undefined;
	inputmode?:
		| "none"
		| "text"
		| "tel"
		| "url"
		| "email"
		| "numeric"
		| "decimal"
		| "search"
		| undefined;
	enterkeyhint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send" | undefined;
	required?: boolean | undefined;
	readonly?: boolean | undefined;
	maxlength?: number | undefined;
	minlength?: number | undefined;
	pattern?: string | undefined;
	min?: number | string | undefined;
	max?: number | string | undefined;
	step?: number | string | undefined;
	spellcheck?: boolean | "true" | "false" | undefined;
	form?: string | undefined;
	list?: string | undefined;
};

/** Props every component accepts; unknown DOM attributes go to the host element. */
export type BaseProps = HTMLPassThrough & {
	class?: string | undefined;
	style?: StyleValue | undefined;
	/** Drop built-in `a-*` classes (state stays on `data-*` attributes). */
	unstyled?: boolean | undefined;
};

/** Adds per-slot `classes` / `styles` for components with named inner parts. */
export type SlotProps<S extends string> = BaseProps & {
	classes?: SlotClasses<S> | undefined;
	styles?: SlotStyles<S> | undefined;
};

export type ComponentTheme<P = Record<string, unknown>> = {
	defaultProps?: Partial<P> | undefined;
	classes?: Record<string, string> | undefined;
	styles?: Record<string, StyleValue> | undefined;
};

export type UITheme = {
	components?: Record<string, ComponentTheme> | undefined;
};

let theme: UITheme = {};

/**
 * Register app-wide component defaults and slot classes. Later calls replace
 * the theme (pass the merged object yourself to layer themes).
 *
 * ```ts
 * configureUI({
 *   components: {
 *     Button: { defaultProps: { size: "sm" }, classes: { root: "btn" } },
 *     Modal: { classes: { panel: "glass" }, styles: { panel: { "--a-modal-width": "40rem" } } },
 *   },
 * });
 * ```
 */
export function configureUI(next: UITheme): void {
	theme = next;
}

export function getComponentTheme(name: string): ComponentTheme | undefined {
	return theme.components?.[name];
}

/** Resolve component props over theme defaults and local defaults (props win). */
export function withDefaults<P extends object>(name: string, defaults: Partial<P>, props: P): P {
	return mergeProps(
		defaults,
		() => getComponentTheme(name)?.defaultProps as Partial<P> | undefined,
		props,
	) as P;
}

function styleToRecord(value: StyleValue | undefined): Record<string, string> | undefined {
	if (value == null) return undefined;
	if (typeof value !== "string") {
		const out: Record<string, string> = {};
		for (const [key, v] of Object.entries(value)) if (v != null) out[key] = String(v);
		return out;
	}
	const out: Record<string, string> = {};
	for (const decl of value.split(";")) {
		const i = decl.indexOf(":");
		if (i > 0) out[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
	}
	return out;
}

/** Merge style values left-to-right into one object (`undefined` when empty). */
export function mergeStyles(
	...values: Array<StyleValue | undefined>
): Record<string, string> | undefined {
	let out: Record<string, string> | undefined;
	for (const value of values) {
		const record = styleToRecord(value);
		if (record) out = { ...(out ?? {}), ...record };
	}
	return out;
}

type SlotSource<S extends string> = {
	unstyled?: boolean | undefined;
	class?: string | undefined;
	style?: StyleValue | undefined;
	classes?: SlotClasses<S> | undefined;
	styles?: SlotStyles<S> | undefined;
};

export type Slots<S extends string> = {
	/** Class list for `slot`: built-in base, theme, then user classes. */
	class: (
		slot: S,
		base?: string | false | null | undefined,
		...extra: Array<string | false | null | undefined>
	) => string;
	/** Inline style for `slot`: theme first, then user styles. */
	style: (slot: S, base?: StyleValue | undefined) => Record<string, string> | undefined;
};

/**
 * Slot resolver for a component. Call the returned functions inside JSX so they
 * stay reactive. The `host` slot (default `root`) also receives `props.class`
 * / `props.style` — it is the element that forwarded attributes land on.
 */
export function createSlots<S extends string>(
	name: string,
	props: SlotSource<S>,
	host: S = "root" as S,
): Slots<S> {
	return {
		class: (slot, base, ...extra) =>
			cx(
				!props.unstyled && base,
				...(props.unstyled ? [] : extra),
				getComponentTheme(name)?.classes?.[slot],
				props.classes?.[slot],
				slot === host && props.class,
			),
		style: (slot, base) =>
			mergeStyles(
				base,
				getComponentTheme(name)?.styles?.[slot],
				props.styles?.[slot],
				slot === host ? props.style : undefined,
			),
	};
}

/** Keys consumed by {@link createSlots}; strip them before spreading onto the root. */
export const SLOT_KEYS = ["class", "style", "classes", "styles", "unstyled"] as const;

type SlotKey = (typeof SLOT_KEYS)[number];

/** Slot names declared by a props type via `SlotProps<S>` (falls back to `"root"`). */
export type SlotsOf<P> = P extends { classes?: infer C }
	? NonNullable<C> extends Partial<Record<infer S, string>>
		? S extends string
			? S
			: "root"
		: "root"
	: "root";

/**
 * One-call component setup: theme + local defaults, slot resolver, and the
 * pass-through remainder (everything except `own` keys and slot keys).
 *
 * ```tsx
 * export function Badge(input: BadgeProps) {
 *   const [props, rest, slot] = setup("Badge", input, { tone: "neutral" }, ["tone", "children"]);
 *   return <span {...rest} class={slot.class("root", "a-badge", `a-badge-${props.tone}`)} style={slot.style("root")}>…</span>;
 * }
 * ```
 */
export function setup<
	P extends object,
	const K extends ReadonlyArray<keyof P>,
	S extends string = SlotsOf<P>,
>(
	name: string,
	input: P,
	defaults: Partial<P>,
	own: K,
	host?: S,
): [P, Omit<P, K[number] | SlotKey>, Slots<S>] {
	const props = withDefaults(name, defaults, input);
	const rest = omitProps(props, [...own, ...SLOT_KEYS] as unknown as ReadonlyArray<keyof P>);
	const slot = createSlots<S>(name, props as SlotSource<S>, host);
	return [props, rest as Omit<P, K[number] | SlotKey>, slot];
}

/**
 * Element id for ARIA wiring. Matches between SSR and hydration (per-render
 * counter from `@arachne/render`); an explicit `id` prop always wins.
 */
export function createId(prefix: string, explicit?: string | undefined): string {
	return explicit ?? `a-${prefix}-${createUniqueId()}`;
}

/** `data-*` boolean helper: `true` → `""`, falsy → attribute removed. */
export function dataFlag(value: unknown): "" | undefined {
	return value ? "" : undefined;
}
