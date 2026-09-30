import { For, Show } from "@arachnejs/render";
import { effect, signal } from "@arachnejs/signals";
import { Icon } from "./icons.tsx";
import { type BaseProps, createId, type SlotProps, setup } from "./system.ts";

export type HoverCardSlot = "root" | "target" | "dropdown";

export type HoverCardProps = SlotProps<HoverCardSlot> & {
	/** Panel content shown on hover/focus. */
	dropdown: unknown;
	/** Milliseconds of hover or focus before the card opens. */
	openDelay?: number | undefined;
	/** Milliseconds after leaving before the card closes (lets the pointer reach it). */
	closeDelay?: number | undefined;
	/** The trigger (hovering or focusing it opens the card). */
	children?: unknown;
};

/**
 * Hover/focus card panel (Mantine HoverCard). Slots: `root` `target` `dropdown`.
 * State: `data-state="open|closed"` on the root.
 */
export function HoverCard(input: HoverCardProps) {
	const [props, rest, slot] = setup(
		"HoverCard",
		input,
		{ openDelay: 120, closeDelay: 160 },
		["dropdown", "openDelay", "closeDelay", "children", "id"],
		"root" as HoverCardSlot,
	);
	const dropdownId = `${createId("hovercard", props.id)}-dropdown`;
	const open = signal(false);
	let openTimer: ReturnType<typeof setTimeout> | undefined;
	let closeTimer: ReturnType<typeof setTimeout> | undefined;

	const clear = () => {
		if (openTimer !== undefined) clearTimeout(openTimer);
		if (closeTimer !== undefined) clearTimeout(closeTimer);
		openTimer = undefined;
		closeTimer = undefined;
	};
	const scheduleOpen = () => {
		clear();
		openTimer = setTimeout(() => open.set(true), props.openDelay ?? 120);
	};
	const scheduleClose = () => {
		clear();
		closeTimer = setTimeout(() => open.set(false), props.closeDelay ?? 160);
	};

	effect(() => clear);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover/focus bridge; keyboard users trigger it via focusin on the target
		<div
			{...rest}
			id={props.id}
			class={slot.class("root", "a-hovercard")}
			style={slot.style("root")}
			data-state={open() ? "open" : "closed"}
			onMouseEnter={scheduleOpen}
			onMouseLeave={scheduleClose}
			onFocusIn={scheduleOpen}
			onFocusOut={scheduleClose}
		>
			<div
				class={slot.class("target", "a-hovercard-target")}
				style={slot.style("target")}
				aria-describedby={open() ? dropdownId : undefined}
			>
				{props.children}
			</div>
			<Show when={open()}>
				<div
					id={dropdownId}
					class={slot.class("dropdown", "a-hovercard-dropdown")}
					style={slot.style("dropdown")}
				>
					{props.dropdown}
				</div>
			</Show>
		</div>
	);
}

export type BurgerProps = BaseProps & {
	/** Show the close (×) state instead of the three lines. */
	opened?: boolean | undefined;
	/** Called when the button is pressed; toggle `opened` here. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Accessible name (default: "Open menu" / "Close menu" by state). */
	label?: string | undefined;
	/** Button size. */
	size?: "sm" | "md" | undefined;
};

/** Standalone hamburger control (Mantine Burger). Slots: `root`. */
export function Burger(input: BurgerProps) {
	const [props, rest, slot] = setup("Burger", input, {}, ["opened", "onClick", "label", "size"]);
	return (
		<button
			aria-label={props.label ?? (props.opened ? "Close menu" : "Open menu")}
			{...rest}
			type="button"
			class={slot.class(
				"root",
				"a-burger",
				props.opened && "a-burger-opened",
				props.size === "sm" && "a-burger-sm",
			)}
			style={slot.style("root")}
			data-state={props.opened ? "open" : "closed"}
			aria-expanded={props.opened ?? false}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			<span />
			<span />
			<span />
		</button>
	);
}

export type ColorSwatchProps = BaseProps & {
	/** Any CSS colour. */
	color: string;
	/** Diameter in pixels. */
	size?: number | undefined;
	/** Adds a soft drop shadow. */
	withShadow?: boolean | undefined;
	/** Accessible name (default `Color <color>`). */
	label?: string | undefined;
	/** Marks the chosen swatch (ring + check; `aria-pressed` when clickable). */
	selected?: boolean | undefined;
	/** Makes the swatch a button; called when it is pressed. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Content inside the swatch (replaces the check mark when `selected`). */
	children?: unknown;
};

/**
 * Color chip; renders a `<button>` when `onClick` is set (use `selected` for a
 * picker). Slots: `root`. State: `data-state`.
 */
export function ColorSwatch(input: ColorSwatchProps) {
	const [props, rest, slot] = setup("ColorSwatch", input, {}, [
		"color",
		"size",
		"withShadow",
		"label",
		"selected",
		"onClick",
		"children",
	]);
	const style = () => {
		const size = `${props.size ?? 28}px`;
		return slot.style("root", { width: size, height: size, background: props.color });
	};
	const className = () =>
		slot.class(
			"root",
			"a-swatch",
			props.withShadow && "a-swatch-shadow",
			props.selected && "a-swatch-active",
		);
	const content = () =>
		props.children ??
		(props.selected ? <Icon name="check" size={14} class="a-swatch-check" /> : null);
	const label = () => props.label ?? `Color ${props.color}`;
	return (
		<Show
			when={props.onClick}
			fallback={
				<div aria-label={label()} {...rest} class={className()} style={style()} role="img">
					{content()}
				</div>
			}
		>
			<button
				aria-label={label()}
				{...rest}
				type="button"
				class={className()}
				style={style()}
				aria-pressed={props.selected === undefined ? undefined : props.selected}
				data-state={props.selected ? "active" : undefined}
				onClick={(e: MouseEvent) => props.onClick?.(e)}
			>
				{content()}
			</button>
		</Show>
	);
}

export type VisuallyHiddenProps = BaseProps & {
	/** Text read by screen readers but not shown. */
	children?: unknown;
};

/** Screen-reader-only text. Slots: `root`. */
export function VisuallyHidden(input: VisuallyHiddenProps) {
	const [props, rest, slot] = setup("VisuallyHidden", input, {}, ["children"]);
	return (
		<span {...rest} class={slot.class("root", "a-sr-only")} style={slot.style("root")}>
			{props.children}
		</span>
	);
}

export type HighlightSlot = "root" | "mark";

export type HighlightProps = SlotProps<HighlightSlot> & {
	/** The full text to show. */
	text: string;
	/** Term(s) to mark wherever they occur. */
	highlight: string | string[];
	/** Mark colour (default `"warning"`, highlighter yellow), as on `Mark`. */
	tone?: "accent" | "warning" | "success" | undefined;
};

/**
 * Mark every case-insensitive match of `highlight` inside `text`, e.g. search
 * results. To mark a span you choose, use `Mark`. Slots: `root` `mark`.
 */
export function Highlight(input: HighlightProps) {
	const [props, rest, slot] = setup(
		"Highlight",
		input,
		{ tone: "warning" },
		["text", "highlight", "tone"],
		"root" as HighlightSlot,
	);
	const terms = () =>
		(Array.isArray(props.highlight) ? props.highlight : [props.highlight])
			.map((t) => t.trim())
			.filter(Boolean);
	const parts = () => {
		const list = terms();
		if (!list.length) return [props.text];
		const escaped = list.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
		return props.text.split(new RegExp(`(${escaped.join("|")})`, "gi")).filter((p) => p !== "");
	};
	const isMatch = (part: string) => terms().some((t) => t.toLowerCase() === part.toLowerCase());

	return (
		<span {...rest} class={slot.class("root", "a-highlight")} style={slot.style("root")}>
			<For each={parts()}>
				{(part) =>
					isMatch(part) ? (
						<mark
							class={slot.class("mark", "a-mark", `a-mark-${props.tone ?? "warning"}`)}
							style={slot.style("mark")}
						>
							{part}
						</mark>
					) : (
						part
					)
				}
			</For>
		</span>
	);
}

export type BackgroundImageProps = BaseProps & {
	/** Image URL (data URIs work too). */
	src: string;
	/** Round the corners (theme radius). */
	radius?: boolean | undefined;
	/** Content drawn over the image. */
	children?: unknown;
};

/**
 * Box with a background image behind its content.
 * Slots: `root`.
 */
/**
 * `url("…")` for any URL, data URIs included: escape only what could end the
 * string. (encodeURI would double-encode the `%xx` escapes a URL already has.)
 */
function cssUrl(src: string): string {
	return `url("${src.replace(/["\\\n\r]/g, (c) => encodeURIComponent(c))}")`;
}

export function BackgroundImage(input: BackgroundImageProps) {
	const [props, rest, slot] = setup("BackgroundImage", input, {}, ["src", "radius", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-bg-image", props.radius && "a-bg-image-radius")}
			style={slot.style("root", {
				"background-image": cssUrl(props.src),
			})}
		>
			{props.children}
		</div>
	);
}

export type StickyProps = BaseProps & {
	/** Distance in pixels from the edge it sticks to. */
	offset?: number | undefined;
	/** Edge to stick to while scrolling. */
	position?: "top" | "bottom" | undefined;
	/** Content to keep in view. */
	children?: unknown;
};

/**
 * Sticks its content to an edge of the scroll container.
 * Slots: `root`.
 */
export function Sticky(input: StickyProps) {
	const [props, rest, slot] = setup("Sticky", input, {}, ["offset", "position", "children"]);
	const position = () => {
		const offset = `${props.offset ?? 0}px`;
		const edge = props.position === "bottom" ? { bottom: offset } : { top: offset };
		return { position: "sticky", "z-index": "var(--a-z-sticky, 20)", ...edge };
	};
	return (
		<div
			{...rest}
			class={slot.class("root", "a-sticky")}
			style={slot.style("root", position())}
			data-position={props.position ?? "top"}
		>
			{props.children}
		</div>
	);
}
