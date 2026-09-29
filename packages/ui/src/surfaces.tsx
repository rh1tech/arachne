import { Show } from "@arachne/render";
import { Prose } from "./kit-more.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type CardProps = BaseProps & {
	children?: unknown;
};

/** Content card (Bulma/Mantine/Bootstrap). Slots: `root`. */
export function Card(input: CardProps) {
	const [props, rest, slot] = setup("Card", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-card")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type CardPartProps = BaseProps & {
	children?: unknown;
};

/** Card header row. */
export function CardHeader(input: CardPartProps) {
	const [props, rest, slot] = setup("CardHeader", input, {}, ["children"]);
	return (
		<header {...rest} class={slot.class("root", "a-card-header")} style={slot.style("root")}>
			{props.children}
		</header>
	);
}

/** Title text inside a card header. */
export function CardHeaderTitle(input: CardPartProps) {
	const [props, rest, slot] = setup("CardHeaderTitle", input, {}, ["children"]);
	return (
		<p {...rest} class={slot.class("root", "a-card-header-title")} style={slot.style("root")}>
			{props.children}
		</p>
	);
}

/** Full-bleed media at the top of a card. */
export function CardImage(input: CardPartProps) {
	const [props, rest, slot] = setup("CardImage", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-card-image")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

/** Padded body of a card. */
export function CardContent(input: CardPartProps) {
	const [props, rest, slot] = setup("CardContent", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-card-content")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

/** Card footer row of actions. */
export function CardFooter(input: CardPartProps) {
	const [props, rest, slot] = setup("CardFooter", input, {}, ["children"]);
	return (
		<footer {...rest} class={slot.class("root", "a-card-footer")} style={slot.style("root")}>
			{props.children}
		</footer>
	);
}

export type CardFooterItemProps = CardPartProps & {
	onClick?: ((e: MouseEvent) => void) | undefined;
};

/** One action cell in a card footer (a button when `onClick` is set). */
export function CardFooterItem(input: CardFooterItemProps) {
	const [props, rest, slot] = setup("CardFooterItem", input, {}, ["children", "onClick"]);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-card-footer-item")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</button>
	);
}

export type PanelProps = BaseProps & {
	/** Accessible name of the panel's `<nav>` landmark; set it when a page has several panels. */
	label?: string | undefined;
	children?: unknown;
};

/** Side panel / filter panel (Bulma). Slots: `root`. */
export function Panel(input: PanelProps) {
	const [props, rest, slot] = setup("Panel", input, {}, ["label", "children"]);
	return (
		<nav
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-panel")}
			style={slot.style("root")}
		>
			{props.children}
		</nav>
	);
}

/** Heading row of a panel. */
export function PanelHeading(input: CardPartProps) {
	const [props, rest, slot] = setup("PanelHeading", input, {}, ["children"]);
	return (
		<p {...rest} class={slot.class("root", "a-panel-heading")} style={slot.style("root")}>
			{props.children}
		</p>
	);
}

/** Tab row inside a panel. */
export function PanelTabs(input: CardPartProps) {
	const [props, rest, slot] = setup("PanelTabs", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-panel-tabs")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type PanelTabProps = BaseProps & {
	active?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** One tab in a panel's tab row. */
export function PanelTab(input: PanelTabProps) {
	const [props, rest, slot] = setup("PanelTab", input, {}, ["active", "onClick", "children"]);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-panel-tab", props.active && "a-panel-tab-active")}
			style={slot.style("root")}
			aria-pressed={Boolean(props.active)}
			data-state={props.active ? "active" : "inactive"}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</button>
	);
}

export type PanelBlockProps = BaseProps & {
	active?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** Panel row; renders a `<button>` when `onClick` is set. */
export function PanelBlock(input: PanelBlockProps) {
	const [props, rest, slot] = setup("PanelBlock", input, {}, ["active", "onClick", "children"]);
	const className = () =>
		slot.class("root", "a-panel-block", props.active && "a-panel-block-active");
	const state = () => (props.active ? "active" : "inactive");
	return (
		<Show
			when={props.onClick}
			fallback={
				<div {...rest} class={className()} style={slot.style("root")} data-state={state()}>
					{props.children}
				</div>
			}
		>
			<button
				{...rest}
				type="button"
				class={className()}
				style={slot.style("root")}
				data-state={state()}
				onClick={(e: MouseEvent) => props.onClick?.(e)}
			>
				{props.children}
			</button>
		</Show>
	);
}

export type TileProps = BaseProps & {
	ancestor?: boolean | undefined;
	parent?: boolean | undefined;
	child?: boolean | undefined;
	vertical?: boolean | undefined;
	size?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | undefined;
	children?: unknown;
};

/** Nestable tile grid (Bulma). Slots: `root`. */
export function Tile(input: TileProps) {
	const [props, rest, slot] = setup("Tile", input, {}, [
		"ancestor",
		"parent",
		"child",
		"vertical",
		"size",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-tile",
				props.ancestor && "a-tile-ancestor",
				props.parent && "a-tile-parent",
				props.child && "a-tile-child",
				props.vertical && "a-tile-vertical",
				props.size != null && `a-tile-${props.size}`,
			)}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type MessageTone = "info" | "success" | "warning" | "danger" | "muted";

export type MessageProps = BaseProps & {
	tone?: MessageTone | undefined;
	children?: unknown;
};

/** Colored message block for longer contextual notes. Slots: `root`. */
export function Message(input: MessageProps) {
	const [props, rest, slot] = setup("Message", input, {}, ["tone", "children"]);
	return (
		<article
			{...rest}
			class={slot.class("root", "a-message", props.tone && `a-message-${props.tone}`)}
			style={slot.style("root")}
			data-tone={props.tone}
		>
			{props.children}
		</article>
	);
}

export type MessageHeaderSlot = "root" | "text" | "close";

export type MessageHeaderProps = SlotProps<MessageHeaderSlot> & {
	onClose?: (() => void) | undefined;
	/** Accessible label for the close button (default "Close"). */
	closeLabel?: string | undefined;
	children?: unknown;
};

/**
 * Message title bar, with an optional close button.
 * Slots: `root` `text` `close`.
 */
export function MessageHeader(input: MessageHeaderProps) {
	const [props, rest, slot] = setup(
		"MessageHeader",
		input,
		{},
		["onClose", "closeLabel", "children"],
		"root" as MessageHeaderSlot,
	);
	return (
		<header {...rest} class={slot.class("root", "a-message-header")} style={slot.style("root")}>
			<div class={slot.class("text", "a-message-header-text")} style={slot.style("text")}>
				{props.children}
			</div>
			<Show when={props.onClose}>
				<button
					type="button"
					class={slot.class("close", "a-delete")}
					style={slot.style("close")}
					aria-label={props.closeLabel ?? "Close"}
					onClick={() => props.onClose?.()}
				/>
			</Show>
		</header>
	);
}

/** Body text of a message. */
export function MessageBody(input: CardPartProps) {
	const [props, rest, slot] = setup("MessageBody", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-message-body")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type BlockProps = BaseProps & {
	children?: unknown;
};

/** Vertical spacing block (Bulma). Slots: `root`. */
export function Block(input: BlockProps) {
	const [props, rest, slot] = setup("Block", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-block")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type ContentProps = BaseProps & {
	children?: unknown;
};

/**
 * @deprecated Use `Prose` (`<Prose measure={false}>` matches the old full-width layout).
 */
export function Content(input: ContentProps) {
	return Prose({ measure: false, ...input });
}

export type PaperProps = BaseProps & {
	withBorder?: boolean | undefined;
	shadow?: boolean | undefined;
	padding?: "sm" | "md" | "lg" | undefined;
	children?: unknown;
};

/** Surface paper (Mantine). Slots: `root`. */
export function Paper(input: PaperProps) {
	const [props, rest, slot] = setup("Paper", input, {}, [
		"withBorder",
		"shadow",
		"padding",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-paper",
				props.withBorder && "a-paper-bordered",
				props.shadow !== false && "a-paper-shadow",
				props.padding === "sm" && "a-paper-sm",
				props.padding === "lg" && "a-paper-lg",
			)}
			style={slot.style("root")}
			data-padding={props.padding}
		>
			{props.children}
		</div>
	);
}
