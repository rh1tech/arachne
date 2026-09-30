import { Show } from "@arachnejs/render";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type AlertTone = "info" | "success" | "warning" | "danger";

export type AlertSlot = "root" | "title" | "body";

export type AlertProps = SlotProps<AlertSlot> & {
	/** Colour and icon: `info`, `success`, `warning` or `danger`. */
	tone?: AlertTone | undefined;
	/** Bold first line. */
	title?: unknown;
	/** Message text or content. */
	children?: unknown;
};

/**
 * Inline status message; danger/warning are assertive alerts.
 * Slots: `root` `title` `body`. State: `data-tone`.
 */
export function Alert(input: AlertProps) {
	const [props, rest, slot] = setup(
		"Alert",
		input,
		{ tone: "info" },
		["tone", "title", "children"],
		"root" as AlertSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-alert", `a-alert-${props.tone}`)}
			style={slot.style("root")}
			role={props.tone === "danger" || props.tone === "warning" ? "alert" : "status"}
			data-tone={props.tone}
		>
			<Show when={props.title}>
				<strong class={slot.class("title", "a-alert-title")} style={slot.style("title")}>
					{props.title}
				</strong>
			</Show>
			<div class={slot.class("body", "a-alert-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</div>
	);
}

export type DividerProps = BaseProps;

/** Horizontal rule. Slots: `root`. */
export function Divider(input: DividerProps) {
	const [, rest, slot] = setup("Divider", input, {}, []);
	return <hr {...rest} class={slot.class("root", "a-divider")} style={slot.style("root")} />;
}

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingProps = BaseProps & {
	/** Heading level (`h1`–`h3`). */
	level?: 1 | 2 | 3 | undefined;
	/** Heading text. */
	children?: unknown;
};

/** Section heading whose level can change after mount. Slots: `root`. */
export function Heading(input: HeadingProps) {
	const [props, rest, slot] = setup("Heading", input, { level: 2 }, ["level", "children"]);
	const attrs = () => ({
		...rest,
		class: slot.class("root", "a-heading", `a-heading-${props.level}`),
		style: slot.style("root"),
	});
	return (
		<Show when={props.level as HeadingLevel} keyed>
			{(level: HeadingLevel) => {
				if (level === 1) return <h1 {...attrs()}>{props.children}</h1>;
				if (level === 3) return <h3 {...attrs()}>{props.children}</h3>;
				return <h2 {...attrs()}>{props.children}</h2>;
			}}
		</Show>
	);
}
