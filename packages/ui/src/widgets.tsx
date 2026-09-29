import { Show } from "@arachne/render";
import { signal } from "@arachne/signals";
import { Icon, type IconName } from "./icons.tsx";
import { type BaseProps, createId, type SlotProps, type StyleValue, setup } from "./system.ts";

export type GroupProps = BaseProps & {
	gap?: string | undefined;
	wrap?: boolean | undefined;
	align?: "start" | "center" | "end" | "stretch" | undefined;
	justify?: "start" | "center" | "end" | "between" | "around" | undefined;
	grow?: boolean | undefined;
	children?: unknown;
};

/** Horizontal flex group (Mantine Group / Bootstrap btn-group row). */
export function Group(input: GroupProps) {
	const [props, rest, slot] = setup("Group", input, {}, [
		"gap",
		"wrap",
		"align",
		"justify",
		"grow",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-group",
				props.wrap && "a-group-wrap",
				props.grow && "a-group-grow",
				props.align === "start" && "a-group-align-start",
				props.align === "end" && "a-group-align-end",
				props.align === "stretch" && "a-group-align-stretch",
				props.justify === "center" && "a-group-justify-center",
				props.justify === "end" && "a-group-justify-end",
				props.justify === "between" && "a-group-justify-between",
				props.justify === "around" && "a-group-justify-around",
			)}
			style={slot.style("root", props.gap ? { gap: props.gap } : undefined)}
		>
			{props.children}
		</div>
	);
}

export type CenterProps = BaseProps & {
	inline?: boolean | undefined;
	children?: unknown;
};

/** Centres its content horizontally and vertically. */
export function Center(input: CenterProps) {
	const [props, rest, slot] = setup("Center", input, {}, ["inline", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-center", props.inline && "a-center-inline")}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type SpaceProps = BaseProps & {
	h?: string | number | undefined;
	w?: string | number | undefined;
};

const toLength = (v: string | number | undefined) =>
	v == null ? undefined : typeof v === "number" ? `${v}px` : v;

/** Fixed spacer; `h` / `w` accept numbers (px) or CSS lengths. */
export function Space(input: SpaceProps) {
	const [props, rest, slot] = setup("Space", input, {}, ["h", "w"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-space")}
			style={slot.style("root", { height: toLength(props.h), width: toLength(props.w) })}
			aria-hidden="true"
		/>
	);
}

export type FlexProps = BaseProps & {
	direction?: "row" | "column" | undefined;
	gap?: string | undefined;
	align?: string | undefined;
	justify?: string | undefined;
	wrap?: boolean | undefined;
	children?: unknown;
};

/** Flexbox layout primitive (direction, gap, align, justify, wrap). */
export function Flex(input: FlexProps) {
	const [props, rest, slot] = setup("Flex", input, {}, [
		"direction",
		"gap",
		"align",
		"justify",
		"wrap",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-flex",
				props.direction === "column" && "a-flex-col",
				props.wrap && "a-flex-wrap",
			)}
			style={slot.style("root", {
				gap: props.gap,
				"align-items": props.align,
				"justify-content": props.justify,
			})}
		>
			{props.children}
		</div>
	);
}

export type AspectRatioSlot = "root" | "inner";

export type AspectRatioProps = SlotProps<AspectRatioSlot> & {
	ratio?: number | undefined;
	children?: unknown;
};

/** Fixed-ratio box (`--a-aspect`). Slots: `root` `inner`. */
export function AspectRatio(input: AspectRatioProps) {
	const [props, rest, slot] = setup(
		"AspectRatio",
		input,
		{ ratio: 16 / 9 },
		["ratio", "children"],
		"root" as AspectRatioSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-aspect")}
			style={slot.style("root", { "--a-aspect": String(props.ratio) })}
		>
			<div class={slot.class("inner", "a-aspect-inner")} style={slot.style("inner")}>
				{props.children}
			</div>
		</div>
	);
}

export type AffixProps = BaseProps & {
	position?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | undefined;
	offset?: string | undefined;
	children?: unknown;
};

/** Viewport-pinned container. State: `data-position`. */
export function Affix(input: AffixProps) {
	const [props, rest, slot] = setup("Affix", input, { position: "bottom-right" }, [
		"position",
		"offset",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-affix", `a-affix-${props.position}`)}
			style={slot.style("root", props.offset ? { "--a-affix-offset": props.offset } : undefined)}
			data-position={props.position}
		>
			{props.children}
		</div>
	);
}

export type OverlayProps = BaseProps & {
	blur?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** Dimmed layer over its positioned parent. */
export function Overlay(input: OverlayProps) {
	const [props, rest, slot] = setup("Overlay", input, {}, ["blur", "onClick", "children"]);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pointer-only dismiss surface; owners provide a keyboard close control
		// biome-ignore lint/a11y/useKeyWithClickEvents: see above — the dim layer is not a focus target
		<div
			{...rest}
			class={slot.class("root", "a-dim", props.blur && "a-dim-blur")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</div>
	);
}

export type LoadingOverlaySlot = "root" | "spinner";

export type LoadingOverlayProps = SlotProps<LoadingOverlaySlot> & {
	visible: boolean;
	label?: string | undefined;
};

/** Covers its positioned parent with a spinner while `visible`. Slots: `root` `spinner`. */
export function LoadingOverlay(input: LoadingOverlayProps) {
	const [props, rest, slot] = setup(
		"LoadingOverlay",
		input,
		{},
		["visible", "label"],
		"root" as LoadingOverlaySlot,
	);
	return (
		<Show when={props.visible}>
			<div
				aria-label={props.label ?? "Loading"}
				{...rest}
				class={slot.class("root", "a-loading-overlay")}
				style={slot.style("root")}
				role="status"
			>
				<span class={slot.class("spinner", "a-spinner")} style={slot.style("spinner")} />
			</div>
		</Show>
	);
}

export type IndicatorSlot = "root" | "badge";

export type IndicatorProps = SlotProps<IndicatorSlot> & {
	label?: string | number | undefined;
	dot?: boolean | undefined;
	processing?: boolean | undefined;
	position?: "top-end" | "top-start" | "bottom-end" | "bottom-start" | undefined;
	children?: unknown;
};

/** Corner badge / dot over its children. Slots: `root` `badge`. */
export function Indicator(input: IndicatorProps) {
	const [props, rest, slot] = setup(
		"Indicator",
		input,
		{ position: "top-end" },
		["label", "dot", "processing", "position", "children"],
		"root" as IndicatorSlot,
	);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-indicator", `a-indicator-${props.position}`)}
			style={slot.style("root")}
			data-position={props.position}
		>
			{props.children}
			<span
				class={slot.class(
					"badge",
					"a-indicator-badge",
					props.dot && "a-indicator-dot",
					props.processing && "a-indicator-processing",
				)}
				style={slot.style("badge")}
			>
				{props.dot ? null : props.label}
			</span>
		</span>
	);
}

export type ListProps = BaseProps & {
	/** Render `<ol>` instead of `<ul>`; fixed at mount. */
	ordered?: boolean | undefined;
	children?: unknown;
};

/** Styled list (`ordered` for numbers). */
export function List(input: ListProps) {
	const [props, rest, slot] = setup("List", input, {}, ["ordered", "children"]);
	if (props.ordered) {
		return (
			<ol
				{...rest}
				class={slot.class("root", "a-list", "a-list-ordered")}
				style={slot.style("root")}
			>
				{props.children}
			</ol>
		);
	}
	return (
		<ul {...rest} class={slot.class("root", "a-list")} style={slot.style("root")}>
			{props.children}
		</ul>
	);
}

export type ListItemSlot = "root" | "icon" | "body";

export type ListItemProps = SlotProps<ListItemSlot> & {
	icon?: IconName | undefined;
	children?: unknown;
};

/**
 * List item with an optional icon.
 * Slots: `root` `icon` `body`.
 */
export function ListItem(input: ListItemProps) {
	const [props, rest, slot] = setup(
		"ListItem",
		input,
		{},
		["icon", "children"],
		"root" as ListItemSlot,
	);
	return (
		<li {...rest} class={slot.class("root", "a-list-item")} style={slot.style("root")}>
			<Show when={props.icon}>
				{(icon: IconName) => <Icon name={icon} class={slot.class("icon", "a-list-icon")} />}
			</Show>
			<span class={slot.class("body", "a-list-item-body")} style={slot.style("body")}>
				{props.children}
			</span>
		</li>
	);
}

export type ListGroupProps = BaseProps & {
	flush?: boolean | undefined;
	children?: unknown;
};

/** Bordered group of list rows. */
export function ListGroup(input: ListGroupProps) {
	const [props, rest, slot] = setup("ListGroup", input, {}, ["flush", "children"]);
	return (
		<ul
			{...rest}
			class={slot.class("root", "a-list-group", props.flush && "a-list-group-flush")}
			style={slot.style("root")}
		>
			{props.children}
		</ul>
	);
}

export type ListGroupItemSlot = "root" | "item";

export type ListGroupItemProps = SlotProps<ListGroupItemSlot> & {
	active?: boolean | undefined;
	disabled?: boolean | undefined;
	/** Makes the row a button (fixed at mount); the `<li>` becomes the `item` slot. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/**
 * List-group row. Slots: `root` (the `<li>`, or the `<button>` when clickable)
 * `item` (wrapping `<li>` of a clickable row). State: `data-state`.
 */
export function ListGroupItem(input: ListGroupItemProps) {
	const [props, rest, slot] = setup(
		"ListGroupItem",
		input,
		{},
		["active", "disabled", "onClick", "children"],
		"root" as ListGroupItemSlot,
	);
	const className = () =>
		slot.class(
			"root",
			"a-list-group-item",
			props.active && "a-list-group-item-active",
			props.disabled && "a-list-group-item-disabled",
		);
	const state = () => (props.active ? "active" : "inactive");
	if (props.onClick) {
		return (
			<li class={slot.class("item")} style={slot.style("item")}>
				<button
					{...rest}
					type="button"
					class={className()}
					style={slot.style("root")}
					disabled={props.disabled}
					aria-current={props.active ? "true" : undefined}
					data-state={state()}
					onClick={(e: MouseEvent) => props.onClick?.(e)}
				>
					{props.children}
				</button>
			</li>
		);
	}
	return (
		<li {...rest} class={className()} style={slot.style("root")} data-state={state()}>
			{props.children}
		</li>
	);
}

export type TimelineProps = BaseProps & {
	children?: unknown;
};

/** Vertical timeline. */
export function Timeline(input: TimelineProps) {
	const [props, rest, slot] = setup("Timeline", input, {}, ["children"]);
	return (
		<ol {...rest} class={slot.class("root", "a-timeline")} style={slot.style("root")}>
			{props.children}
		</ol>
	);
}

export type TimelineItemSlot = "root" | "bullet" | "body" | "title" | "content";

export type TimelineItemProps = SlotProps<TimelineItemSlot> & {
	title?: string | undefined;
	bullet?: IconName | undefined;
	active?: boolean | undefined;
	children?: unknown;
};

/**
 * Timeline entry with a bullet, title and content.
 * Slots: `root` `bullet` `body` `title` `content`. State: `data-state`.
 */
export function TimelineItem(input: TimelineItemProps) {
	const [props, rest, slot] = setup(
		"TimelineItem",
		input,
		{},
		["title", "bullet", "active", "children"],
		"root" as TimelineItemSlot,
	);
	return (
		<li
			{...rest}
			class={slot.class("root", "a-timeline-item", props.active && "a-timeline-item-active")}
			style={slot.style("root")}
			data-state={props.active ? "active" : "inactive"}
		>
			<span
				class={slot.class("bullet", "a-timeline-bullet")}
				style={slot.style("bullet")}
				aria-hidden="true"
			>
				<Show when={props.bullet}>{(bullet: IconName) => <Icon name={bullet} size={12} />}</Show>
			</span>
			<div class={slot.class("body", "a-timeline-body")} style={slot.style("body")}>
				<Show when={props.title}>
					<p class={slot.class("title", "a-timeline-title")} style={slot.style("title")}>
						{props.title}
					</p>
				</Show>
				<div class={slot.class("content", "a-timeline-content")} style={slot.style("content")}>
					{props.children}
				</div>
			</div>
		</li>
	);
}

export type NavLinkSlot = "root" | "left" | "main" | "label" | "description" | "right";

export type NavLinkProps = SlotProps<NavLinkSlot> & {
	label: string;
	/** Render as a real link (middle-click, open in new tab, crawlable). Fixed at mount. */
	href?: string | undefined;
	description?: string | undefined;
	active?: boolean | undefined;
	disabled?: boolean | undefined;
	leftSection?: unknown;
	rightSection?: unknown;
	onClick?: ((e: MouseEvent) => void) | undefined;
};

/**
 * Navigation row (button, or `<a>` with `href`).
 * Slots: `root` `left` `main` `label` `description` `right`. State: `data-state`.
 */
export function NavLink(input: NavLinkProps) {
	const [props, rest, slot] = setup(
		"NavLink",
		input,
		{},
		[
			"label",
			"href",
			"description",
			"active",
			"disabled",
			"leftSection",
			"rightSection",
			"onClick",
		],
		"root" as NavLinkSlot,
	);
	const className = () =>
		slot.class(
			"root",
			"a-navlink",
			props.active && "a-navlink-active",
			props.disabled && "a-navlink-disabled",
		);
	const state = () => (props.active ? "active" : "inactive");
	const body = () => (
		<>
			<Show when={props.leftSection}>
				<span class={slot.class("left", "a-navlink-left")}>{props.leftSection}</span>
			</Show>
			<span class={slot.class("main", "a-navlink-main")}>
				<span class={slot.class("label", "a-navlink-label")}>{props.label}</span>
				<Show when={props.description}>
					<span class={slot.class("description", "a-navlink-desc")}>{props.description}</span>
				</Show>
			</span>
			<Show when={props.rightSection}>
				<span class={slot.class("right", "a-navlink-right")}>{props.rightSection}</span>
			</Show>
		</>
	);
	if (props.href !== undefined) {
		return (
			<a
				{...rest}
				class={className()}
				style={slot.style("root")}
				href={props.disabled ? undefined : props.href}
				aria-current={props.active ? "page" : undefined}
				aria-disabled={props.disabled || undefined}
				data-state={state()}
				onClick={(e: MouseEvent) => {
					if (props.disabled) e.preventDefault();
					else props.onClick?.(e);
				}}
			>
				{body()}
			</a>
		);
	}
	return (
		<button
			{...rest}
			type="button"
			class={className()}
			style={slot.style("root")}
			aria-current={props.active ? "page" : undefined}
			disabled={props.disabled}
			data-state={state()}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{body()}
		</button>
	);
}

export type ActionIconProps = BaseProps & {
	label: string;
	variant?: "subtle" | "filled" | "outline" | undefined;
	size?: "sm" | "md" | "lg" | undefined;
	disabled?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** Icon-only button (`label` is its accessible name). State: `data-variant`, `data-size`. */
export function ActionIcon(input: ActionIconProps) {
	const [props, rest, slot] = setup("ActionIcon", input, { variant: "subtle", size: "md" }, [
		"label",
		"variant",
		"size",
		"disabled",
		"onClick",
		"children",
	]);
	return (
		<button
			aria-label={props.label}
			{...rest}
			type="button"
			class={slot.class(
				"root",
				"a-action-icon",
				`a-action-icon-${props.variant}`,
				props.size !== "md" && `a-action-icon-${props.size}`,
			)}
			style={slot.style("root")}
			disabled={props.disabled}
			data-variant={props.variant}
			data-size={props.size}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</button>
	);
}

export type CollapseProps = BaseProps & {
	open: boolean;
	children?: unknown;
};

/** Show/hide region. State: `data-state`. */
export function Collapse(input: CollapseProps) {
	const [props, rest, slot] = setup("Collapse", input, {}, ["open", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-collapse", props.open && "a-collapse-open")}
			style={slot.style("root")}
			hidden={!props.open}
			data-state={props.open ? "open" : "closed"}
		>
			{props.children}
		</div>
	);
}

export type SpoilerSlot = "root" | "content" | "toggle";

export type SpoilerProps = SlotProps<SpoilerSlot> & {
	maxHeight?: number | undefined;
	showLabel?: string | undefined;
	hideLabel?: string | undefined;
	children?: unknown;
};

/** Height-clamped content with a toggle. Slots: `root` `content` `toggle`. State: `data-state`. */
export function Spoiler(input: SpoilerProps) {
	const [props, rest, slot] = setup(
		"Spoiler",
		input,
		{ maxHeight: 80 },
		["maxHeight", "showLabel", "hideLabel", "children", "id"],
		"root" as SpoilerSlot,
	);
	const open = signal(false);
	const contentId = `${createId("spoiler", props.id)}-content`;
	return (
		<div
			{...rest}
			id={props.id}
			class={slot.class("root", "a-spoiler", open() && "a-spoiler-open")}
			style={slot.style("root")}
			data-state={open() ? "open" : "closed"}
		>
			<div
				id={contentId}
				class={slot.class("content", "a-spoiler-content")}
				style={slot.style("content", open() ? undefined : { "max-height": `${props.maxHeight}px` })}
			>
				{props.children}
			</div>
			<button
				type="button"
				class={slot.class("toggle", "a-spoiler-toggle")}
				style={slot.style("toggle")}
				aria-expanded={open()}
				aria-controls={contentId}
				onClick={() => open.set(!open())}
			>
				{open() ? (props.hideLabel ?? "Show less") : (props.showLabel ?? "Show more")}
			</button>
		</div>
	);
}

export type MarkProps = BaseProps & {
	tone?: "accent" | "warning" | "success" | undefined;
	children?: unknown;
};

/** Highlighted text. State: `data-tone`. */
export function Mark(input: MarkProps) {
	const [props, rest, slot] = setup("Mark", input, { tone: "accent" }, ["tone", "children"]);
	return (
		<mark
			{...rest}
			class={slot.class("root", "a-mark", `a-mark-${props.tone}`)}
			style={slot.style("root")}
			data-tone={props.tone}
		>
			{props.children}
		</mark>
	);
}

export type QuoteSlot = "root" | "body" | "cite";

export type QuoteProps = SlotProps<QuoteSlot> & {
	cite?: string | undefined;
	children?: unknown;
};

/**
 * Block quote with an optional citation.
 * Slots: `root` `body` `cite`.
 */
export function Quote(input: QuoteProps) {
	const [props, rest, slot] = setup("Quote", input, {}, ["cite", "children"], "root" as QuoteSlot);
	return (
		<blockquote {...rest} class={slot.class("root", "a-quote")} style={slot.style("root")}>
			<div class={slot.class("body", "a-quote-body")} style={slot.style("body")}>
				{props.children}
			</div>
			<Show when={props.cite}>
				<cite class={slot.class("cite", "a-quote-cite")} style={slot.style("cite")}>
					{props.cite}
				</cite>
			</Show>
		</blockquote>
	);
}

export type ScrollAreaProps = BaseProps & {
	maxHeight?: string | undefined;
	children?: unknown;
};

/** Scrollable region with a max height. */
export function ScrollArea(input: ScrollAreaProps) {
	const [props, rest, slot] = setup("ScrollArea", input, {}, ["maxHeight", "children"]);
	return (
		// Focusable so keyboard users can scroll it; pass tabindex={-1} if the content is focusable.
		<div
			tabindex="0"
			{...rest}
			class={slot.class("root", "a-scroll-area")}
			style={slot.style("root", props.maxHeight ? { "max-height": props.maxHeight } : undefined)}
		>
			{props.children}
		</div>
	);
}

export type AnchorProps = BaseProps & {
	href: string;
	external?: boolean | undefined;
	children?: unknown;
};

const SAFE_HREF = /^(?:[a-z][a-z0-9+.-]*:)?/i;

/** Drop `javascript:` / `vbscript:` / `data:` URLs so user-supplied hrefs can't run script. */
function safeHref(href: string): string | undefined {
	const scheme = SAFE_HREF.exec(href.trim())?.[0].toLowerCase() ?? "";
	return scheme === "javascript:" || scheme === "vbscript:" || scheme === "data:"
		? undefined
		: href;
}

/** Text link; `external` opens a new tab with `rel="noreferrer noopener"`. */
export function Anchor(input: AnchorProps) {
	const [props, rest, slot] = setup("Anchor", input, {}, ["href", "external", "children"]);
	return (
		<a
			{...rest}
			class={slot.class("root", "a-anchor")}
			style={slot.style("root")}
			href={safeHref(props.href)}
			target={props.external ? "_blank" : undefined}
			rel={props.external ? "noreferrer noopener" : undefined}
		>
			{props.children}
		</a>
	);
}

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Heading whose level can change after mount (re-creates the element per level). */
export function DynamicHeading(props: {
	level: HeadingLevel;
	class: string;
	style?: StyleValue | undefined;
	/** Extra attributes forwarded to the heading element. */
	attrs?: Record<string, unknown> | undefined;
	children?: unknown;
}) {
	return (
		<Show when={props.level} keyed>
			{(level: HeadingLevel) => {
				const a = () => props.attrs ?? {};
				if (level === 1)
					return (
						<h1 {...a()} class={props.class} style={props.style}>
							{props.children}
						</h1>
					);
				if (level === 2)
					return (
						<h2 {...a()} class={props.class} style={props.style}>
							{props.children}
						</h2>
					);
				if (level === 4)
					return (
						<h4 {...a()} class={props.class} style={props.style}>
							{props.children}
						</h4>
					);
				if (level === 5)
					return (
						<h5 {...a()} class={props.class} style={props.style}>
							{props.children}
						</h5>
					);
				if (level === 6)
					return (
						<h6 {...a()} class={props.class} style={props.style}>
							{props.children}
						</h6>
					);
				return (
					<h3 {...a()} class={props.class} style={props.style}>
						{props.children}
					</h3>
				);
			}}
		</Show>
	);
}

type HeadingOrder = 1 | 2 | 3 | 4 | 5 | 6;

export type TitleProps = BaseProps & {
	/** Heading level (`<h1>`–`<h6>`) for the document outline. Default 2. */
	order?: HeadingOrder | undefined;
	/** Visual size 1–6 (1 is largest), independent of the level. Default: `order`, else 3. */
	size?: HeadingOrder | undefined;
	spaced?: boolean | undefined;
	children?: unknown;
};

/**
 * Section title. `order` picks the semantic level and `size` only the look, so
 * a small title never breaks the heading outline. Slots: `root`.
 */
export function Title(input: TitleProps) {
	const [props, rest, slot] = setup("Title", input, {}, ["size", "order", "spaced", "children"]);
	const size = () => props.size ?? props.order ?? 3;
	return (
		<DynamicHeading
			level={props.order ?? 2}
			class={slot.class("root", "a-title", `a-title-${size()}`, props.spaced && "a-title-spaced")}
			style={slot.style("root")}
			attrs={rest}
		>
			{props.children}
		</DynamicHeading>
	);
}

export type SubtitleProps = BaseProps & {
	/** Visual size 1–6. Default 5. */
	size?: HeadingOrder | undefined;
	/** Render as a heading at this level; by default a subtitle is a `<p>`. */
	order?: HeadingOrder | undefined;
	children?: unknown;
};

/** Secondary line under a title. Slots: `root`. */
export function Subtitle(input: SubtitleProps) {
	const [props, rest, slot] = setup("Subtitle", input, { size: 5 }, ["size", "order", "children"]);
	const className = () => slot.class("root", "a-subtitle", `a-subtitle-${props.size ?? 5}`);
	return (
		<Show
			when={props.order}
			fallback={
				<p {...rest} class={className()} style={slot.style("root")}>
					{props.children}
				</p>
			}
		>
			<DynamicHeading
				level={props.order ?? 5}
				class={className()}
				style={slot.style("root")}
				attrs={rest}
			>
				{props.children}
			</DynamicHeading>
		</Show>
	);
}

export type RingProgressSlot = "root" | "track" | "bar" | "label";

export type RingProgressProps = SlotProps<RingProgressSlot> & {
	value: number;
	size?: number | undefined;
	thickness?: number | undefined;
	label?: unknown;
};

/** Circular progress. Slots: `root` `track` `bar` `label`. */
export function RingProgress(input: RingProgressProps) {
	const [props, rest, slot] = setup(
		"RingProgress",
		input,
		{ size: 72, thickness: 6 },
		["value", "size", "thickness", "label"],
		"root" as RingProgressSlot,
	);
	const size = () => props.size ?? 72;
	const thickness = () => props.thickness ?? 6;
	const r = () => Math.max(0, (size() - thickness()) / 2);
	const c = () => 2 * Math.PI * r();
	const pct = () => (Number.isFinite(props.value) ? Math.max(0, Math.min(100, props.value)) : 0);
	const offset = () => c() - (pct() / 100) * c();
	return (
		<div
			aria-label="Progress"
			{...rest}
			class={slot.class("root", "a-ring")}
			style={slot.style("root", { width: `${size()}px`, height: `${size()}px` })}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={pct()}
		>
			<svg width={size()} height={size()} viewBox={`0 0 ${size()} ${size()}`} aria-hidden="true">
				<circle
					class={slot.class("track", "a-ring-track")}
					cx={size() / 2}
					cy={size() / 2}
					r={r()}
					fill="none"
					stroke-width={thickness()}
				/>
				<circle
					class={slot.class("bar", "a-ring-bar")}
					cx={size() / 2}
					cy={size() / 2}
					r={r()}
					fill="none"
					stroke-width={thickness()}
					stroke-dasharray={String(c())}
					stroke-dashoffset={String(offset())}
					transform={`rotate(-90 ${size() / 2} ${size() / 2})`}
				/>
			</svg>
			<Show when={props.label}>
				<div class={slot.class("label", "a-ring-label")} style={slot.style("label")}>
					{props.label}
				</div>
			</Show>
		</div>
	);
}
