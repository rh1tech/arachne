import { For } from "@arachne/render";
import { effect } from "@arachne/signals";
import { type BaseProps, type InputPassThrough, type SlotProps, setup } from "./system.ts";

/** Re-apply a controlled `checked` after the parent handled the change. */
function resyncChecked(el: HTMLInputElement, checked: boolean | undefined): void {
	if (checked !== undefined && el.checked !== checked) el.checked = checked;
}

/**
 * Keep a `<select>` showing the controlled value — also after its options are
 * replaced (async load), which resets the native selection.
 */
export function watchSelectValue(
	get: () => HTMLSelectElement | undefined,
	value: () => string,
	options: () => unknown,
): void {
	effect(() => {
		options();
		const v = value();
		const apply = () => {
			const el = get();
			if (el && el.value !== v) el.value = v;
		};
		apply();
		queueMicrotask(apply);
	});
}

export type ToggleSlot = "root" | "input" | "label";

export type CheckboxProps = SlotProps<ToggleSlot> &
	InputPassThrough & {
		/** Whether it is checked (controlled). */
		checked?: boolean | undefined;
		/** Disables the checkbox. */
		disabled?: boolean | undefined;
		/** Marks the value invalid (`aria-invalid` and error styling). */
		invalid?: boolean | undefined;
		/** Field name submitted with the form. */
		name?: string | undefined;
		/** Native `value` submitted with the form. */
		value?: string | undefined;
		/** Label text or content, clickable to toggle. */
		label?: unknown;
		/** Called on toggle; read `e.target.checked`. */
		onChange?: ((e: Event) => void) | undefined;
	};

/**
 * Checkbox. The native `<input>` is the host: `class`, `style` and forwarded
 * attributes (`id`, `name`, `required`, `aria-*`) land on it; `classes.root`
 * styles the label row. Slots: `root` `input` `label`. State: `data-state`.
 */
export function Checkbox(input: CheckboxProps) {
	const [props, rest, slot] = setup(
		"Checkbox",
		input,
		{},
		["checked", "invalid", "label", "onChange"],
		"input" as ToggleSlot,
	);
	const control = (
		<input
			{...rest}
			type="checkbox"
			class={slot.class("input", "a-check", props.invalid && "a-check-invalid")}
			style={slot.style("input")}
			checked={Boolean(props.checked)}
			aria-invalid={props.invalid ? true : undefined}
			data-state={props.checked ? "checked" : "unchecked"}
			onChange={(e: Event) => {
				props.onChange?.(e);
				resyncChecked(e.currentTarget as HTMLInputElement, props.checked);
			}}
		/>
	);
	return () =>
		props.label ? (
			<label class={slot.class("root", "a-check-row")} style={slot.style("root")} for={props.id}>
				{control}
				<span class={slot.class("label", "a-check-label")}>{props.label}</span>
			</label>
		) : (
			control
		);
}

export type SwitchProps = SlotProps<ToggleSlot> &
	InputPassThrough & {
		/** Whether it is on (controlled). */
		checked?: boolean | undefined;
		/** Disables the switch. */
		disabled?: boolean | undefined;
		/** Field name submitted with the form. */
		name?: string | undefined;
		/** Label text or content, clickable to toggle. */
		label?: unknown;
		/** Called on toggle; read `e.target.checked`. */
		onChange?: ((e: Event) => void) | undefined;
	};

/**
 * Toggle switch (`role="switch"`). Like {@link Checkbox}, the `<input>` (the
 * visible track) is the host; `classes.root` styles the label row.
 * Slots: `root` `input` `label`. State: `data-state`.
 */
export function Switch(input: SwitchProps) {
	const [props, rest, slot] = setup(
		"Switch",
		input,
		{},
		["checked", "label", "onChange"],
		"input" as ToggleSlot,
	);
	return (
		<label class={slot.class("root", "a-switch-row")} style={slot.style("root")} for={props.id}>
			<input
				{...rest}
				type="checkbox"
				role="switch"
				aria-checked={Boolean(props.checked)}
				class={slot.class("input", "a-switch")}
				style={slot.style("input")}
				checked={Boolean(props.checked)}
				data-state={props.checked ? "checked" : "unchecked"}
				onChange={(e: Event) => {
					props.onChange?.(e);
					resyncChecked(e.currentTarget as HTMLInputElement, props.checked);
				}}
			/>
			{props.label ? (
				<span class={slot.class("label", "a-switch-label")}>{props.label}</span>
			) : null}
		</label>
	);
}

export type SelectOption = {
	/** Option value (what `value` / `onChange` use). */
	value: string;
	/** Text shown for the option. */
	label: string;
	/** Shown but can't be chosen. */
	disabled?: boolean | undefined;
};

export type SelectProps = BaseProps &
	InputPassThrough & {
		/** Selected option's value (controlled). */
		value?: string | undefined;
		/** The options, in order. */
		options: SelectOption[];
		/** Disables the select. */
		disabled?: boolean | undefined;
		/** Marks the value invalid (`aria-invalid` and error styling). */
		invalid?: boolean | undefined;
		/** Field name submitted with the form. */
		name?: string | undefined;
		/** Empty first option shown while nothing is selected. */
		placeholder?: string | undefined;
		/** Called when the selection changes; read `e.target.value`. */
		onChange?: ((e: Event) => void) | undefined;
	};

/** Native select; forwarded attributes land on `<select>`. Slots: `root`. */
export function Select(input: SelectProps) {
	const [props, rest, slot] = setup("Select", input, {}, [
		"value",
		"options",
		"invalid",
		"placeholder",
		"onChange",
	]);
	let el: HTMLSelectElement | undefined;
	watchSelectValue(
		() => el,
		() => props.value ?? "",
		() => props.options,
	);
	return (
		<select
			{...rest}
			ref={(node: HTMLSelectElement) => {
				el = node;
			}}
			class={slot.class("root", "a-select", props.invalid && "a-select-invalid")}
			style={slot.style("root")}
			value={props.value ?? ""}
			aria-invalid={props.invalid ? true : undefined}
			data-invalid={props.invalid ? "" : undefined}
			onChange={(e: Event) => {
				props.onChange?.(e);
				const target = e.currentTarget as HTMLSelectElement;
				if (props.value !== undefined && target.value !== props.value) target.value = props.value;
			}}
		>
			{props.placeholder ? (
				<option value="" disabled>
					{props.placeholder}
				</option>
			) : null}
			{/* Plain map: <For> would wrap options in a host span, which <select> ignores. */}
			{props.options.map((opt) => (
				<option value={opt.value} disabled={opt.disabled}>
					{opt.label}
				</option>
			))}
		</select>
	);
}

export type RadioOption = {
	/** Option value (what `value` / `onChange` use). */
	value: string;
	/** Text or content shown for the option. */
	label: unknown;
	/** Shown but can't be chosen. */
	disabled?: boolean | undefined;
};

export type RadioGroupSlot = "root" | "option" | "input" | "label";

export type RadioGroupProps = SlotProps<RadioGroupSlot> & {
	/** Shared `name` of the radio inputs (also the form field name). */
	name: string;
	/** Selected option's value (controlled). */
	value?: string | undefined;
	/** The options, in order. */
	options: RadioOption[];
	/** Disables every option. */
	disabled?: boolean | undefined;
	/** Accessible name for the group. */
	label?: string | undefined;
	/** Lay options out in a row. */
	inline?: boolean | undefined;
	/** Called when the selection changes; read `e.target.value`. */
	onChange?: ((e: Event) => void) | undefined;
};

/**
 * Radio group (`role="radiogroup"`). Forwarded attributes land on the group.
 * Slots: `root` `option` `input` `label`. State: `data-state` per option.
 */
export function RadioGroup(input: RadioGroupProps) {
	const [props, rest, slot] = setup(
		"RadioGroup",
		input,
		{},
		["name", "value", "options", "disabled", "label", "inline", "onChange"] as const,
		"root" as RadioGroupSlot,
	);
	return (
		<div
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-radio-group", props.inline && "a-radio-group-inline")}
			style={slot.style("root")}
			role="radiogroup"
			aria-disabled={props.disabled || undefined}
		>
			<For each={props.options}>
				{(opt) => {
					const checked = () => props.value === opt.value;
					return (
						<label
							class={slot.class("option", "a-radio-row")}
							style={slot.style("option")}
							data-state={checked() ? "checked" : "unchecked"}
						>
							<input
								type="radio"
								class={slot.class("input", "a-radio")}
								name={props.name}
								value={opt.value}
								checked={checked()}
								disabled={props.disabled || opt.disabled}
								onChange={(e: Event) => {
									props.onChange?.(e);
									resyncChecked(e.currentTarget as HTMLInputElement, checked());
								}}
							/>
							<span class={slot.class("label", "a-radio-label")}>{opt.label}</span>
						</label>
					);
				}}
			</For>
		</div>
	);
}
