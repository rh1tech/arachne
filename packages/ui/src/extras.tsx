import { Show } from "@arachne/render";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type TagColor =
	| "neutral"
	| "black"
	| "dark"
	| "light"
	| "white"
	| "primary"
	| "link"
	| "info"
	| "success"
	| "warning"
	| "danger"
	| "accent"
	| undefined;

export type TagSlot = "root" | "label" | "remove";

export type TagProps = SlotProps<TagSlot> & {
	/** Color / tone. Prefer semantic colors (primary, success, …). */
	color?: TagColor;
	/** @deprecated use `color` */
	tone?: "neutral" | "accent" | "danger" | undefined;
	/** Tag size. */
	size?: "normal" | "medium" | "large" | undefined;
	/** Pill shape. */
	rounded?: boolean | undefined;
	/** Pale background with coloured text instead of a solid fill. */
	light?: boolean | undefined;
	/** Shows a remove (×) button; called when it is pressed. */
	onRemove?: (() => void) | undefined;
	/** Accessible label for the remove button (default "Remove"). */
	removeLabel?: string | undefined;
	/** Tag text. */
	children?: unknown;
};

/**
 * Small label for categories and filters, optionally removable.
 * Slots: `root` `label` `remove`.
 */
export function Tag(input: TagProps) {
	const [props, rest, slot] = setup(
		"Tag",
		input,
		{},
		["color", "tone", "size", "rounded", "light", "onRemove", "removeLabel", "children"],
		"root" as TagSlot,
	);
	const color = () => props.color ?? props.tone ?? "neutral";
	return (
		<span
			{...rest}
			class={slot.class(
				"root",
				"a-tag",
				`a-tag-${color()}`,
				props.light && "a-tag-light",
				props.size === "medium" && "a-tag-md",
				props.size === "large" && "a-tag-lg",
				props.rounded && "a-tag-rounded",
			)}
			style={slot.style("root")}
			data-color={color()}
		>
			<span class={slot.class("label", "a-tag-label")} style={slot.style("label")}>
				{props.children}
			</span>
			<Show when={props.onRemove}>
				<button
					type="button"
					class={slot.class("remove", "a-tag-remove")}
					style={slot.style("remove")}
					aria-label={props.removeLabel ?? "Remove"}
					onClick={() => props.onRemove?.()}
				>
					×
				</button>
			</Show>
		</span>
	);
}

export type TagsProps = BaseProps & {
	/** Size for every tag in the group. */
	size?: "medium" | "large" | undefined;
	/** Join pairs of tags edge to edge (e.g. a name and a value). */
	addons?: boolean | undefined;
	/** The `Tag`s to group. */
	children?: unknown;
};

/** Group of tags — wraps evenly and supports addon pairs. Slots: `root`. */
export function Tags(input: TagsProps) {
	const [props, rest, slot] = setup("Tags", input, {}, ["size", "addons", "children"]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-tags",
				props.size === "medium" && "a-tags-md",
				props.size === "large" && "a-tags-lg",
				props.addons && "a-tags-addons",
			)}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type SkeletonProps = BaseProps & {
	/** Width (any CSS length). */
	width?: string | undefined;
	/** Height (any CSS length). */
	height?: string | undefined;
};

/** Loading placeholder sized by `width` / `height`. Slots: `root`. */
export function Skeleton(input: SkeletonProps) {
	const [props, rest, slot] = setup("Skeleton", input, {}, ["width", "height"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-skeleton")}
			style={slot.style("root", {
				width: props.width ?? "100%",
				height: props.height ?? "0.9rem",
			})}
			aria-hidden="true"
		/>
	);
}

export type FileInputProps = BaseProps & {
	/** Field name submitted with the form. */
	name?: string | undefined;
	/** Disables the field. */
	disabled?: boolean | undefined;
	/** Marks the value invalid (`aria-invalid` and error styling). */
	invalid?: boolean | undefined;
	/** Allowed file types, e.g. `image/*,.pdf`. */
	accept?: string | undefined;
	/** Allow choosing several files. */
	multiple?: boolean | undefined;
	/** A file must be chosen before the form submits. */
	required?: boolean | undefined;
	/** Called when the selection changes; read `e.target.files`. */
	onChange?: ((e: Event) => void) | undefined;
};

/** Native file input. Slots: `root`. */
export function FileInput(input: FileInputProps) {
	const [props, rest, slot] = setup("FileInput", input, {}, [
		"name",
		"disabled",
		"invalid",
		"accept",
		"multiple",
		"required",
		"onChange",
	]);
	return (
		<input
			{...rest}
			name={props.name}
			type="file"
			class={slot.class("root", "a-file", props.invalid && "a-file-invalid")}
			style={slot.style("root")}
			disabled={props.disabled}
			required={props.required}
			accept={props.accept}
			multiple={props.multiple}
			aria-invalid={props.invalid ? true : undefined}
			onChange={(e: Event) => props.onChange?.(e)}
		/>
	);
}

export type InputGroupProps = BaseProps & {
	/** Inputs, buttons and `InputAddon`s to join edge to edge. */
	children?: unknown;
};

/**
 * Joins inputs and addons into one control.
 * Slots: `root`.
 */
export function InputGroup(input: InputGroupProps) {
	const [props, rest, slot] = setup("InputGroup", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-input-group")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type InputAddonProps = BaseProps & {
	/** Addon text or content, e.g. `https://` or a unit. */
	children?: unknown;
};

/**
 * Static addon (text, icon) attached to an input.
 * Slots: `root`.
 */
export function InputAddon(input: InputAddonProps) {
	const [props, rest, slot] = setup("InputAddon", input, {}, ["children"]);
	return (
		<span {...rest} class={slot.class("root", "a-input-addon")} style={slot.style("root")}>
			{props.children}
		</span>
	);
}
