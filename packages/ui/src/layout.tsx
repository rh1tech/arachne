import { type BaseProps, setup } from "./system.ts";

export type LabelProps = BaseProps & {
	for?: string | undefined;
	children?: unknown;
};

/** Form label. */
export function Label(input: LabelProps) {
	const [props, rest, slot] = setup("Label", input, {}, ["for", "children"]);
	return (
		<label
			{...rest}
			class={slot.class("root", "a-label")}
			style={slot.style("root")}
			for={props.for}
		>
			{props.children}
		</label>
	);
}

export type TextProps = BaseProps & {
	muted?: boolean | undefined;
	danger?: boolean | undefined;
	/** Element to render; fixed at mount. */
	as?: "p" | "span" | "div" | undefined;
	children?: unknown;
};

/** Body text. State: `data-tone` (`default` | `muted` | `danger`). */
export function Text(input: TextProps) {
	const [props, rest, slot] = setup("Text", input, {}, ["muted", "danger", "as", "children"]);
	const className = () =>
		slot.class("root", "a-text", props.muted && "a-text-muted", props.danger && "a-text-danger");
	const tone = () => (props.danger ? "danger" : props.muted ? "muted" : "default");
	if (props.as === "span") {
		return (
			<span {...rest} class={className()} style={slot.style("root")} data-tone={tone()}>
				{props.children}
			</span>
		);
	}
	if (props.as === "div") {
		return (
			<div {...rest} class={className()} style={slot.style("root")} data-tone={tone()}>
				{props.children}
			</div>
		);
	}
	return (
		<p {...rest} class={className()} style={slot.style("root")} data-tone={tone()}>
			{props.children}
		</p>
	);
}

export type StackProps = BaseProps & {
	direction?: "column" | "row" | undefined;
	gap?: string | undefined;
	children?: unknown;
};

/** Flex stack; `gap` maps to `--a-stack-gap`. */
export function Stack(input: StackProps) {
	const [props, rest, slot] = setup("Stack", input, {}, ["direction", "gap", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-stack", props.direction === "row" && "a-stack-row")}
			style={slot.style("root", props.gap ? { "--a-stack-gap": props.gap } : undefined)}
			data-direction={props.direction ?? "column"}
		>
			{props.children}
		</div>
	);
}

export type BadgeTone = "accent" | "success" | "warning" | "danger" | "muted" | undefined;

export type BadgeProps = BaseProps & {
	/** Compact count / status pill — prefer Tag for labeled chips. */
	tone?: BadgeTone;
	rounded?: boolean | undefined;
	children?: unknown;
};

/** Count / status pill. State: `data-tone`. */
export function Badge(input: BadgeProps) {
	const [props, rest, slot] = setup("Badge", input, {}, ["tone", "rounded", "children"]);
	return (
		<span
			{...rest}
			class={slot.class(
				"root",
				"a-badge",
				props.tone === "success" && "a-badge-success",
				props.tone === "warning" && "a-badge-warning",
				props.tone === "danger" && "a-badge-danger",
				props.tone === "muted" && "a-badge-muted",
				props.rounded && "a-badge-rounded",
			)}
			style={slot.style("root")}
			data-tone={props.tone ?? "accent"}
		>
			{props.children}
		</span>
	);
}
