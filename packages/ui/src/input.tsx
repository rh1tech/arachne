import { type BaseProps, type InputPassThrough, setup } from "./system.ts";

export type TextInputProps = BaseProps &
	InputPassThrough & {
		/** Current text (controlled; update it from `onInput`). */
		value?: string | undefined;
		/** Hint shown while empty. */
		placeholder?: string | undefined;
		/** Native input type (`text`, `email`, `url`, `tel`, …). */
		type?: string | undefined;
		/** Disables the field. */
		disabled?: boolean | undefined;
		/** Marks the value invalid (`aria-invalid` and error styling). */
		invalid?: boolean | undefined;
		/** Field name submitted with the form. */
		name?: string | undefined;
		/** Called on every edit; read `e.target.value`. */
		onInput?: ((e: InputEvent) => void) | undefined;
		/** Called when the field gains focus. */
		onFocus?: ((e: FocusEvent) => void) | undefined;
		/** Called on key presses. */
		onKeyDown?: ((e: KeyboardEvent) => void) | undefined;
		/** Called when the field loses focus. */
		onBlur?: ((e: FocusEvent) => void) | undefined;
	};

/**
 * After the parent handled an edit, force the DOM back to the controlled value
 * so rejected / transformed input doesn't linger in the field.
 */
export function resyncValue(
	el: HTMLInputElement | HTMLTextAreaElement,
	value: string | undefined,
): void {
	if (value !== undefined && el.value !== value) el.value = value;
}

/**
 * Text field. Every other attribute (`id`, `name`, `autocomplete`, `aria-*`, …)
 * lands on the `<input>`. Slots: `root`. State: `data-invalid`.
 */
export function TextInput(input: TextInputProps) {
	const [props, rest, slot] = setup("TextInput", input, { type: "text" }, [
		"value",
		"invalid",
		"onInput",
	]);
	return (
		<input
			{...rest}
			class={slot.class("root", "a-input", props.invalid && "a-input-invalid")}
			style={slot.style("root")}
			value={props.value ?? ""}
			aria-invalid={props.invalid ? true : undefined}
			data-invalid={props.invalid ? "" : undefined}
			onInput={(e: InputEvent) => {
				props.onInput?.(e);
				if (props.onInput) resyncValue(e.currentTarget as HTMLInputElement, props.value);
			}}
		/>
	);
}

export type TextAreaProps = BaseProps &
	InputPassThrough & {
		/** Current text (controlled; update it from `onInput`). */
		value?: string | undefined;
		/** Hint shown while empty. */
		placeholder?: string | undefined;
		/** Disables the field. */
		disabled?: boolean | undefined;
		/** Marks the value invalid (`aria-invalid` and error styling). */
		invalid?: boolean | undefined;
		/** Field name submitted with the form. */
		name?: string | undefined;
		/** Visible text lines. */
		rows?: number | undefined;
		/** Called on every edit; read `e.target.value`. */
		onInput?: ((e: InputEvent) => void) | undefined;
		/** Called when the field loses focus. */
		onBlur?: ((e: FocusEvent) => void) | undefined;
	};

/** Multi-line text field. Slots: `root`. State: `data-invalid`. */
export function TextArea(input: TextAreaProps) {
	const [props, rest, slot] = setup("TextArea", input, {}, ["value", "invalid", "onInput"]);
	return (
		<textarea
			{...rest}
			class={slot.class("root", "a-textarea", props.invalid && "a-textarea-invalid")}
			style={slot.style("root")}
			value={props.value ?? ""}
			aria-invalid={props.invalid ? true : undefined}
			data-invalid={props.invalid ? "" : undefined}
			onInput={(e: InputEvent) => {
				props.onInput?.(e);
				if (props.onInput) resyncValue(e.currentTarget as HTMLTextAreaElement, props.value);
			}}
		/>
	);
}
