import { For, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { type BaseProps, createId, type SlotProps, setup } from "./system.ts";

export type HoverCardSlot = "root" | "target" | "dropdown";

export type HoverCardProps = SlotProps<HoverCardSlot> & {
	/** Panel content shown on hover/focus. */
	dropdown: unknown;
	openDelay?: number | undefined;
	closeDelay?: number | undefined;
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
	opened?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	label?: string | undefined;
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
	color: string;
	size?: number | undefined;
	withShadow?: boolean | undefined;
	/** Accessible name (default `Color <color>`). */
	label?: string | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** Color chip; renders a `<button>` when `onClick` is set. Slots: `root`. */
export function ColorSwatch(input: ColorSwatchProps) {
	const [props, rest, slot] = setup("ColorSwatch", input, {}, [
		"color",
		"size",
		"withShadow",
		"label",
		"onClick",
		"children",
	]);
	const style = () => {
		const size = `${props.size ?? 28}px`;
		return slot.style("root", { width: size, height: size, background: props.color });
	};
	const className = () => slot.class("root", "a-swatch", props.withShadow && "a-swatch-shadow");
	const label = () => props.label ?? `Color ${props.color}`;
	return (
		<Show
			when={props.onClick}
			fallback={
				<div aria-label={label()} {...rest} class={className()} style={style()} role="img">
					{props.children}
				</div>
			}
		>
			<button
				aria-label={label()}
				{...rest}
				type="button"
				class={className()}
				style={style()}
				onClick={(e: MouseEvent) => props.onClick?.(e)}
			>
				{props.children}
			</button>
		</Show>
	);
}

export type VisuallyHiddenProps = BaseProps & {
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
	text: string;
	highlight: string | string[];
};

/** Highlight matching substrings in text (Mantine Highlight). Slots: `root` `mark`. */
export function Highlight(input: HighlightProps) {
	const [props, rest, slot] = setup(
		"Highlight",
		input,
		{},
		["text", "highlight"],
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
						<mark class={slot.class("mark", "a-mark", "a-mark-accent")} style={slot.style("mark")}>
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
	src: string;
	radius?: boolean | undefined;
	children?: unknown;
};

/** Slots: `root`. */
export function BackgroundImage(input: BackgroundImageProps) {
	const [props, rest, slot] = setup("BackgroundImage", input, {}, ["src", "radius", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-bg-image", props.radius && "a-bg-image-radius")}
			style={slot.style("root", {
				"background-image": `url("${encodeURI(props.src).replace(/"/g, "%22")}")`,
			})}
		>
			{props.children}
		</div>
	);
}

export type StickyProps = BaseProps & {
	offset?: number | undefined;
	position?: "top" | "bottom" | undefined;
	children?: unknown;
};

/** Slots: `root`. */
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
