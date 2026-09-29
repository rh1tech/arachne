import { Show } from "@arachne/render";
import { effect } from "@arachne/signals";
import { ButtonGroup } from "./composite.tsx";
import { Label } from "./layout.tsx";
import { type BaseProps, createId, type SlotProps, setup } from "./system.ts";
import { DynamicHeading } from "./widgets.tsx";

export type ControlProps = BaseProps & {
	expanded?: boolean | undefined;
	iconsLeft?: boolean | undefined;
	iconsRight?: boolean | undefined;
	children?: unknown;
};

/** Single control wrapper (Bulma `control`). Slots: `root`. */
export function Control(input: ControlProps) {
	const [props, rest, slot] = setup("Control", input, {}, [
		"expanded",
		"iconsLeft",
		"iconsRight",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-control",
				props.expanded && "a-control-expanded",
				props.iconsLeft && "a-control-icons-left",
				props.iconsRight && "a-control-icons-right",
			)}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type HelpProps = BaseProps & {
	tone?: "muted" | "success" | "danger" | undefined;
	children?: unknown;
};

/** Field help / validation text (Bulma `help`). Slots: `root`. State: `data-tone`. */
export function Help(input: HelpProps) {
	const [props, rest, slot] = setup("Help", input, { tone: "muted" }, ["tone", "children"]);
	return (
		<p
			role={props.tone === "danger" ? "alert" : undefined}
			{...rest}
			class={slot.class(
				"root",
				"a-help",
				props.tone === "success" && "a-help-success",
				props.tone === "danger" && "a-help-danger",
				props.tone === "muted" && "a-help-muted",
			)}
			style={slot.style("root")}
			data-tone={props.tone}
		>
			{props.children}
		</p>
	);
}

export type FormRegionSlot = "root" | "header" | "title" | "description" | "body";

export type FormSectionProps = SlotProps<FormRegionSlot> & {
	title?: unknown;
	/** Heading level of the title, to fit the page outline. Default 3. */
	order?: 2 | 3 | 4 | 5 | 6 | undefined;
	description?: unknown;
	children?: unknown;
};

/**
 * Titled form region (grouping of related fields).
 * Slots: `root` `header` `title` `description` `body`.
 */
export function FormSection(input: FormSectionProps) {
	const [props, rest, slot] = setup(
		"FormSection",
		input,
		{},
		["title", "description", "order", "children"],
		"root" as FormRegionSlot,
	);
	return (
		<section {...rest} class={slot.class("root", "a-form-section")} style={slot.style("root")}>
			{props.title || props.description ? (
				<header class={slot.class("header", "a-form-section-header")} style={slot.style("header")}>
					{props.title ? (
						<DynamicHeading
							level={props.order ?? 3}
							class={slot.class("title", "a-form-section-title")}
							style={slot.style("title")}
						>
							{props.title}
						</DynamicHeading>
					) : null}
					{props.description ? (
						<p class={slot.class("description", "a-form-section-desc")}>{props.description}</p>
					) : null}
				</header>
			) : null}
			<div class={slot.class("body", "a-form-section-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</section>
	);
}

export type FormAreaProps = SlotProps<FormRegionSlot> & {
	title?: unknown;
	/** Heading level of the title, to fit the page outline. Default 4. */
	order?: 2 | 3 | 4 | 5 | 6 | undefined;
	description?: unknown;
	/** Visually emphasize as a bordered panel. Default true. */
	bordered?: boolean | undefined;
	children?: unknown;
};

/**
 * Grouped form area / panel (related fields in a boxed region).
 * Slots: `root` `header` `title` `description` `body`.
 */
export function FormArea(input: FormAreaProps) {
	const [props, rest, slot] = setup(
		"FormArea",
		input,
		{ bordered: true },
		["title", "description", "order", "bordered", "children"],
		"root" as FormRegionSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-form-area", props.bordered !== false && "a-form-area-bordered")}
			style={slot.style("root")}
		>
			{props.title || props.description ? (
				<header class={slot.class("header", "a-form-area-header")} style={slot.style("header")}>
					{props.title ? (
						<DynamicHeading
							level={props.order ?? 4}
							class={slot.class("title", "a-form-area-title")}
							style={slot.style("title")}
						>
							{props.title}
						</DynamicHeading>
					) : null}
					{props.description ? (
						<p class={slot.class("description", "a-form-area-desc")}>{props.description}</p>
					) : null}
				</header>
			) : null}
			<div class={slot.class("body", "a-form-area-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</div>
	);
}

export type FormFieldSlot = "root" | "label" | "body" | "inner" | "help";

export type FormFieldProps = SlotProps<FormFieldSlot> & {
	label?: unknown;
	labelFor?: string | undefined;
	help?: string | undefined;
	error?: string | undefined;
	/** Horizontal label + body (Bulma `field is-horizontal`). */
	horizontal?: boolean | undefined;
	/** Attach controls edge-to-edge (Bulma `has-addons`). */
	addons?: boolean | undefined;
	/** Group controls with gap (Bulma `is-grouped`). */
	grouped?: boolean | undefined;
	groupedMultiline?: boolean | undefined;
	narrow?: boolean | undefined;
	expanded?: boolean | undefined;
	children?: unknown;
};

/**
 * Structured field: label, control(s), help/error.
 * Supports horizontal, addons, and grouped layouts (Bulma `field`).
 */
function linkHelp(control: HTMLElement, helpId: string, hasText: boolean, invalid: boolean): void {
	const ids = (control.getAttribute("aria-describedby") ?? "")
		.split(/\s+/)
		.filter((id) => id && id !== helpId);
	if (hasText) ids.push(helpId);
	if (ids.length) control.setAttribute("aria-describedby", ids.join(" "));
	else control.removeAttribute("aria-describedby");
	if (invalid) control.setAttribute("aria-invalid", "true");
	else if (!control.classList.contains("a-input-invalid")) control.removeAttribute("aria-invalid");
}

/** Labelled form control wrapper: label, control, help or error text, with `aria-describedby` / `aria-invalid` wired to the control. */
export function FormField(input: FormFieldProps) {
	const [props, rest, slot] = setup(
		"FormField",
		input,
		{},
		[
			"label",
			"labelFor",
			"help",
			"error",
			"horizontal",
			"addons",
			"grouped",
			"groupedMultiline",
			"narrow",
			"expanded",
			"children",
		],
		"root" as FormFieldSlot,
	);
	const helpId = props.labelFor ? `${props.labelFor}-help` : createId("help");
	const helpTone = () => (props.error ? "danger" : "muted");
	const helpText = () => props.error ?? props.help;
	let root: HTMLElement | undefined;

	// Link the labelled control to the help/error text (aria-describedby / aria-invalid).
	effect(() => {
		const hasText = Boolean(helpText());
		const invalid = Boolean(props.error);
		const target = props.labelFor;
		const apply = () => {
			const control = target ? root?.querySelector<HTMLElement>(`[id="${target}"]`) : null;
			if (control) linkHelp(control, helpId, hasText, invalid);
		};
		apply();
		queueMicrotask(apply);
	});

	const layout = () => [
		props.addons && "a-form-field-addons",
		props.grouped && "a-form-field-grouped",
		props.groupedMultiline && "a-form-field-grouped-multiline",
		props.narrow && "a-form-field-narrow",
		props.expanded && "a-form-field-expanded",
	];
	const label = () =>
		props.label ? (
			<Label for={props.labelFor} unstyled={props.unstyled} class={slot.class("label")}>
				{props.label}
			</Label>
		) : null;

	const help = (
		<Show when={helpText()}>
			<Help id={helpId} tone={helpTone()} unstyled={props.unstyled} class={slot.class("help")}>
				{helpText()}
			</Help>
		</Show>
	);

	if (props.horizontal) {
		return (
			<div
				{...rest}
				ref={(el: HTMLElement) => {
					root = el;
				}}
				class={slot.class("root", "a-form-field", "a-form-field-horizontal")}
				style={slot.style("root")}
				data-invalid={props.error ? "" : undefined}
			>
				<div class={slot.class("label", "a-form-field-label")}>{label()}</div>
				<div class={slot.class("body", "a-form-field-body")} style={slot.style("body")}>
					<div class={slot.class("inner", "a-form-field-inner", ...layout())}>{props.children}</div>
					{help}
				</div>
			</div>
		);
	}

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			class={slot.class("root", "a-form-field", ...layout())}
			style={slot.style("root")}
			data-invalid={props.error ? "" : undefined}
		>
			{label()}
			{props.children}
			{help}
		</div>
	);
}

export type ButtonsProps = BaseProps & {
	children?: unknown;
};

/** @deprecated Use `<ButtonGroup attached={false}>`. */
export function Buttons(input: ButtonsProps) {
	return ButtonGroup({ attached: false, ...input });
}

export type FieldSlot = "root" | "label" | "control" | "hint";

export type FieldProps = SlotProps<FieldSlot> & {
	label?: string | undefined;
	htmlFor?: string | undefined;
	hint?: string | undefined;
	children?: unknown;
};

/**
 * @deprecated Use `FormField` (`labelFor` / `help`), which also links the help
 * text to the control with `aria-describedby`.
 */
export function Field(input: FieldProps) {
	const { htmlFor, hint, classes, styles, ...rest } = input;
	return FormField({ ...rest, labelFor: htmlFor, help: hint });
}
