import { type BaseProps, type InputPassThrough, setup } from "./system.ts";

export type TextInputProps = BaseProps &
	InputPassThrough & {
		value?: string | undefined;
		placeholder?: string | undefined;
		type?: string | undefined;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		onInput?: ((e: InputEvent) => void) | undefined;
		onFocus?: ((e: FocusEvent) => void) | undefined;
		onKeyDown?: ((e: KeyboardEvent) => void) | undefined;
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
		value?: string | undefined;
		placeholder?: string | undefined;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		rows?: number | undefined;
		onInput?: ((e: InputEvent) => void) | undefined;
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
