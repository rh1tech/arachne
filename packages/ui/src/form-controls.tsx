import { For, Show } from "@arachne/render";
import { signal } from "@arachne/signals";
import { watchClickOutside } from "./click-outside.ts";
import { Checkbox, watchSelectValue } from "./controls.tsx";
import { rovingIndex } from "./focus.ts";
import { Icon } from "./icons.tsx";
import { TextArea, TextInput } from "./input.tsx";
import {
	type BaseProps,
	createId,
	type InputPassThrough,
	type SlotProps,
	setup,
} from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

export type PasswordInputSlot = "root" | "input" | "toggle";

export type PasswordInputProps = SlotProps<PasswordInputSlot> &
	InputPassThrough & {
		value: string;
		placeholder?: string | undefined;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		showLabel?: string | undefined;
		hideLabel?: string | undefined;
		onChange: (value: string) => void;
	};

/**
 * Password field with visibility toggle. The `<input>` is the host (`class`,
 * `id`, `autocomplete`, `aria-*` land on it); `classes.root` styles the wrapper.
 * Slots: `root` `input` `toggle`. State: `data-visible`.
 */
export function PasswordInput(input: PasswordInputProps) {
	const [props, rest, slot] = setup(
		"PasswordInput",
		input,
		{},
		["value", "disabled", "invalid", "showLabel", "hideLabel", "onChange"],
		"input" as PasswordInputSlot,
	);
	const visible = signal(false);
	return (
		<div
			class={slot.class("root", "a-password")}
			style={slot.style("root")}
			data-visible={visible() ? "" : undefined}
		>
			<input
				autocomplete="current-password"
				{...rest}
				type={visible() ? "text" : "password"}
				class={slot.class("input", "a-input a-password-input", props.invalid && "a-input-invalid")}
				style={slot.style("input")}
				value={props.value}
				disabled={props.disabled}
				aria-invalid={props.invalid ? true : undefined}
				onInput={(e: InputEvent) => props.onChange((e.target as HTMLInputElement).value)}
			/>
			<ActionIcon
				label={
					visible() ? (props.hideLabel ?? "Hide password") : (props.showLabel ?? "Show password")
				}
				size="sm"
				disabled={props.disabled}
				class={slot.class("toggle", "a-password-toggle")}
				aria-pressed={visible()}
				onClick={() => visible.set(!visible())}
			>
				<Show when={visible()} fallback={<Icon name="eye-off" size="sm" />}>
					<Icon name="eye" size="sm" />
				</Show>
			</ActionIcon>
		</div>
	);
}

export type PinInputSlot = "root" | "cell";

export type PinInputProps = SlotProps<PinInputSlot> & {
	value: string;
	length?: number | undefined;
	disabled?: boolean | undefined;
	/** Mask digits like a password. */
	mask?: boolean | undefined;
	onChange: (value: string) => void;
};

/** Digits a cell received; typing into a filled cell yields old+new, keep the new one. */
function typedDigits(value: string, previous: string): string {
	const typed = value.replace(/\D/g, "");
	if (typed.length === 2 && previous && typed.includes(previous)) {
		return typed.startsWith(previous) ? typed.slice(1) : typed.slice(0, 1);
	}
	return typed;
}

/**
 * One-time-code input: one cell per digit, paste fills all cells.
 * Forwarded attributes land on the group. Slots: `root` `cell`.
 * State: `data-complete` on the root, `data-filled` per cell.
 */
export function PinInput(input: PinInputProps) {
	const [props, rest, slot] = setup(
		"PinInput",
		input,
		{ length: 4 },
		["value", "length", "disabled", "mask", "onChange"],
		"root" as PinInputSlot,
	);
	const length = () => Math.max(1, props.length ?? 4);
	const cells: HTMLInputElement[] = [];
	const indexes = () => Array.from({ length: length() }, (_, i) => i);
	const chars = () => {
		const raw = props.value.slice(0, length());
		return Array.from({ length: length() }, (_, i) => raw[i] ?? "");
	};
	const focusCell = (i: number) => cells[Math.max(0, Math.min(length() - 1, i))]?.focus();

	/** Write `digits` starting at `index` (handles single keys and pasted codes). */
	const writeAt = (index: number, digits: string) => {
		const next = chars();
		if (digits === "") next[index] = "";
		for (let k = 0; k < digits.length && index + k < length(); k++)
			next[index + k] = digits[k] ?? "";
		props.onChange(next.join("").slice(0, length()));
		return Math.min(length() - 1, index + Math.max(1, digits.length));
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: fieldset adds a border/legend layout the cell row doesn't want
		<div
			aria-label="PIN"
			{...rest}
			class={slot.class("root", "a-pin")}
			style={slot.style("root")}
			role="group"
			data-complete={chars().every(Boolean) ? "" : undefined}
		>
			<For each={indexes()}>
				{(index) => (
					<input
						ref={(el: HTMLInputElement) => {
							cells[index] = el;
						}}
						type={props.mask ? "password" : "text"}
						inputmode="numeric"
						autocomplete={index === 0 ? "one-time-code" : "off"}
						class={slot.class("cell", "a-input a-pin-cell")}
						style={slot.style("cell")}
						data-filled={chars()[index] ? "" : undefined}
						value={chars()[index] ?? ""}
						disabled={props.disabled}
						aria-label={`Digit ${index + 1}`}
						onInput={(e: InputEvent) => {
							const el = e.currentTarget as HTMLInputElement;
							const digits = typedDigits(el.value, chars()[index] ?? "");
							const next = writeAt(index, digits);
							el.value = chars()[index] ?? "";
							if (digits) focusCell(digits.length > 1 ? next : index + 1);
						}}
						onKeyDown={(e: KeyboardEvent) => {
							if (e.key === "Backspace") {
								// One press deletes one digit: this cell's, or (when empty) the previous one's.
								e.preventDefault();
								const target = chars()[index] ? index : index - 1;
								if (target < 0) return;
								writeAt(target, "");
								focusCell(target);
							} else if (e.key === "ArrowLeft") focusCell(index - 1);
							else if (e.key === "ArrowRight") focusCell(index + 1);
						}}
					/>
				)}
			</For>
		</div>
	);
}

export type ColorInputSlot = "root" | "swatch" | "input";

export type ColorInputProps = SlotProps<ColorInputSlot> &
	InputPassThrough & {
		value: string;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		/** Accessible name for the swatch picker (default "Color"). */
		swatchLabel?: string | undefined;
		onChange: (value: string) => void;
	};

/**
 * Color swatch + hex text field. The text `<input>` is the host;
 * `classes.root` styles the wrapper. Slots: `root` `swatch` `input`.
 */
export function ColorInput(input: ColorInputProps) {
	const [props, rest, slot] = setup(
		"ColorInput",
		input,
		{},
		["value", "disabled", "invalid", "swatchLabel", "onChange"],
		"input" as ColorInputSlot,
	);
	const onInput = (e: InputEvent) => props.onChange((e.target as HTMLInputElement).value);
	return (
		<div class={slot.class("root", "a-color")} style={slot.style("root")}>
			<input
				type="color"
				class={slot.class("swatch", "a-color-swatch")}
				style={slot.style("swatch")}
				value={props.value || "#1e87f0"}
				disabled={props.disabled}
				aria-label={props.swatchLabel ?? "Color"}
				onInput={onInput}
			/>
			<input
				placeholder="#000000"
				{...rest}
				type="text"
				class={slot.class("input", "a-input a-color-text", props.invalid && "a-input-invalid")}
				style={slot.style("input")}
				value={props.value}
				disabled={props.disabled}
				aria-invalid={props.invalid ? true : undefined}
				onInput={onInput}
			/>
		</div>
	);
}

export type DateInputProps = BaseProps &
	InputPassThrough & {
		value: string;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		onChange: (value: string) => void;
	};

/** Native date field; forwarded attributes land on the `<input>`. Slots: `root`. */
export function DateInput(input: DateInputProps) {
	return NativeValueInput("DateInput", "date", input);
}

export type TimeInputProps = DateInputProps;

/** Native time field; forwarded attributes land on the `<input>`. Slots: `root`. */
export function TimeInput(input: TimeInputProps) {
	return NativeValueInput("TimeInput", "time", input);
}

function NativeValueInput(name: string, type: "date" | "time", input: DateInputProps) {
	const [props, rest, slot] = setup(name, input, {}, ["value", "invalid", "onChange"]);
	return (
		<input
			{...rest}
			type={type}
			class={slot.class("root", "a-input", props.invalid && "a-input-invalid")}
			style={slot.style("root")}
			value={props.value}
			aria-invalid={props.invalid ? true : undefined}
			data-invalid={props.invalid ? "" : undefined}
			onInput={(e: InputEvent) => props.onChange((e.target as HTMLInputElement).value)}
		/>
	);
}

export type JsonInputProps = BaseProps &
	InputPassThrough & {
		value: string;
		disabled?: boolean | undefined;
		name?: string | undefined;
		rows?: number | undefined;
		onChange: (value: string) => void;
	};

/** JSON text area that flags invalid JSON (`aria-invalid`, `data-invalid`). Slots: `root`. */
export function JsonInput(input: JsonInputProps) {
	const [props, rest, slot] = setup("JsonInput", input, { rows: 6 }, ["value", "onChange"]);
	const invalid = () => {
		if (!props.value.trim()) return false;
		try {
			JSON.parse(props.value);
			return false;
		} catch {
			return true;
		}
	};
	return (
		<TextArea
			spellcheck={false}
			{...rest}
			unstyled={props.unstyled}
			class={slot.class("root", "a-json")}
			style={slot.style("root")}
			value={props.value}
			invalid={invalid()}
			onInput={(e: InputEvent) => props.onChange((e.target as HTMLTextAreaElement).value)}
		/>
	);
}

export type NativeSelectProps = BaseProps &
	InputPassThrough & {
		value?: string | undefined;
		options: Array<{ value: string; label: string; disabled?: boolean | undefined }>;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		placeholder?: string | undefined;
		onChange: (value: string) => void;
	};

/** Native `<select>` with a value callback. Slots: `root`. State: `data-invalid`. */
export function NativeSelect(input: NativeSelectProps) {
	const [props, rest, slot] = setup("NativeSelect", input, {}, [
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
				const target = e.currentTarget as HTMLSelectElement;
				props.onChange(target.value);
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

export type FieldsetProps = SlotProps<"root" | "legend"> & {
	legend?: unknown;
	disabled?: boolean | undefined;
	children?: unknown;
};

/** Native fieldset with optional legend. Slots: `root` `legend`. */
export function Fieldset(input: FieldsetProps) {
	const [props, rest, slot] = setup(
		"Fieldset",
		input,
		{},
		["legend", "children"],
		"root" as "root" | "legend",
	);
	return (
		<fieldset {...rest} class={slot.class("root", "a-fieldset")} style={slot.style("root")}>
			{props.legend ? (
				<legend class={slot.class("legend", "a-fieldset-legend")} style={slot.style("legend")}>
					{props.legend}
				</legend>
			) : null}
			{props.children}
		</fieldset>
	);
}

export type CheckboxGroupSlot = "root" | "legend" | "option";

export type CheckboxGroupProps = SlotProps<CheckboxGroupSlot> & {
	value: string[];
	options: Array<{ value: string; label: unknown; disabled?: boolean | undefined }>;
	disabled?: boolean | undefined;
	/** Visible group label rendered as `<legend>`. */
	legend?: unknown;
	onChange: (value: string[]) => void;
};

/** Multiple-choice checkboxes in a fieldset. Slots: `root` `legend` `option`. */
export function CheckboxGroup(input: CheckboxGroupProps) {
	const [props, rest, slot] = setup(
		"CheckboxGroup",
		input,
		{},
		["value", "options", "disabled", "legend", "onChange"],
		"root" as CheckboxGroupSlot,
	);
	const toggle = (value: string) =>
		props.onChange(
			props.value.includes(value)
				? props.value.filter((v) => v !== value)
				: [...props.value, value],
		);
	return (
		<fieldset {...rest} class={slot.class("root", "a-check-group")} style={slot.style("root")}>
			{props.legend ? (
				<legend class={slot.class("legend", "a-fieldset-legend")}>{props.legend}</legend>
			) : null}
			<For each={props.options}>
				{(opt) => (
					<Checkbox
						classes={{ root: slot.class("option") }}
						unstyled={props.unstyled}
						label={opt.label}
						value={opt.value}
						checked={props.value.includes(opt.value)}
						disabled={props.disabled || opt.disabled}
						onChange={() => toggle(opt.value)}
					/>
				)}
			</For>
		</fieldset>
	);
}

export type ChipProps = BaseProps & {
	checked?: boolean | undefined;
	disabled?: boolean | undefined;
	/** Leading icon. */
	icon?: unknown;
	children?: unknown;
	onChange?: ((checked: boolean) => void) | undefined;
};

/** Toggleable pill (`aria-pressed`). Slots: `root`. State: `data-state`. */
export function Chip(input: ChipProps) {
	const [props, rest, slot] = setup("Chip", input, {}, [
		"checked",
		"disabled",
		"icon",
		"children",
		"onChange",
	]);
	return (
		<button
			type="button"
			{...rest}
			class={slot.class("root", "a-chip", props.checked && "a-chip-checked")}
			style={slot.style("root")}
			disabled={props.disabled}
			aria-pressed={Boolean(props.checked)}
			data-state={props.checked ? "on" : "off"}
			onClick={() => props.onChange?.(!props.checked)}
		>
			{props.icon}
			{props.children}
		</button>
	);
}

export type ChipGroupSlot = "root" | "legend" | "chip";

export type ChipGroupProps = SlotProps<ChipGroupSlot> & {
	value: string[];
	options: Array<{ value: string; label: unknown; disabled?: boolean | undefined }>;
	multiple?: boolean | undefined;
	disabled?: boolean | undefined;
	legend?: unknown;
	onChange: (value: string[]) => void;
};

/** Single or multiple choice chips. Slots: `root` `legend` `chip`. */
export function ChipGroup(input: ChipGroupProps) {
	const [props, rest, slot] = setup(
		"ChipGroup",
		input,
		{},
		["value", "options", "multiple", "disabled", "legend", "onChange"],
		"root" as ChipGroupSlot,
	);
	const select = (value: string, on: boolean) => {
		if (props.multiple) {
			props.onChange(on ? [...props.value, value] : props.value.filter((v) => v !== value));
			return;
		}
		props.onChange(on ? [value] : []);
	};
	return (
		<fieldset {...rest} class={slot.class("root", "a-chip-group")} style={slot.style("root")}>
			{props.legend ? (
				<legend class={slot.class("legend", "a-fieldset-legend")}>{props.legend}</legend>
			) : null}
			<For each={props.options}>
				{(opt) => (
					<Chip
						unstyled={props.unstyled}
						class={slot.class("chip")}
						checked={props.value.includes(opt.value)}
						disabled={props.disabled || opt.disabled}
						onChange={(on) => select(opt.value, on)}
					>
						{opt.label}
					</Chip>
				)}
			</For>
		</fieldset>
	);
}

export type RatingProps = SlotProps<"root" | "star"> & {
	value: number;
	count?: number | undefined;
	disabled?: boolean | undefined;
	/** Star glyph (default ★). */
	symbol?: unknown;
	/** Accessible label per star, e.g. `(n) => \`${n} of 5\``. */
	starLabel?: ((n: number) => string) | undefined;
	onChange: (value: number) => void;
};

/**
 * Star rating (radio pattern with roving tabindex, arrow keys).
 * Slots: `root` `star`. State: `data-state="on|off"` per star.
 */
export function Rating(input: RatingProps) {
	const [props, rest, slot] = setup(
		"Rating",
		input,
		{ count: 5 },
		["value", "count", "disabled", "symbol", "starLabel", "onChange"],
		"root" as "root" | "star",
	);
	const count = () => Math.max(1, Math.floor(props.count ?? 5));
	const stars = () => Array.from({ length: count() }, (_, i) => i + 1);
	let root: HTMLElement | undefined;
	/** Roving tab stop: the checked star, else the first. */
	const tabStop = () => (props.value >= 1 && props.value <= count() ? props.value : 1);

	const onKeyDown = (e: KeyboardEvent) => {
		const current = Math.max(0, tabStop() - 1);
		const next = rovingIndex(e.key, current, count(), () => false, {
			orientation: "both",
			loop: false,
		});
		if (next === null) return;
		e.preventDefault();
		props.onChange(next + 1);
		root?.querySelectorAll<HTMLElement>(".a-rating-star")[next]?.focus();
	};

	return (
		<div
			ref={(el: HTMLElement) => {
				root = el;
			}}
			aria-label="Rating"
			{...rest}
			class={slot.class("root", "a-rating")}
			style={slot.style("root")}
			role="radiogroup"
			onKeyDown={onKeyDown}
		>
			<For each={stars()}>
				{(n) => (
					// biome-ignore lint/a11y/useSemanticElements: star buttons implement the radio pattern with a roving tabindex
					<button
						type="button"
						class={slot.class("star", "a-rating-star", n <= props.value && "a-rating-star-on")}
						style={slot.style("star")}
						data-state={n <= props.value ? "on" : "off"}
						disabled={props.disabled}
						aria-label={props.starLabel ? props.starLabel(n) : `${n} star${n === 1 ? "" : "s"}`}
						aria-checked={n === props.value}
						role="radio"
						tabindex={tabStop() === n ? "0" : "-1"}
						onClick={() => props.onChange(n === props.value ? 0 : n)}
					>
						{props.symbol ?? "★"}
					</button>
				)}
			</For>
		</div>
	);
}

export type RangeSliderSlot = "root" | "start" | "end";

export type RangeSliderProps = SlotProps<RangeSliderSlot> & {
	value: [number, number];
	min?: number | undefined;
	max?: number | undefined;
	step?: number | undefined;
	disabled?: boolean | undefined;
	startLabel?: string | undefined;
	endLabel?: string | undefined;
	onChange: (value: [number, number]) => void;
};

/** Two-thumb range. Slots: `root` `start` `end`. */
export function RangeSlider(input: RangeSliderProps) {
	const [props, rest, slot] = setup(
		"RangeSlider",
		input,
		{},
		["value", "min", "max", "step", "disabled", "startLabel", "endLabel", "onChange"],
		"root" as RangeSliderSlot,
	);
	const min = () => props.min ?? 0;
	const max = () => props.max ?? 100;
	const step = () => props.step ?? 1;
	const lo = () => Math.min(props.value[0], props.value[1]);
	const hi = () => Math.max(props.value[0], props.value[1]);

	return (
		<div {...rest} class={slot.class("root", "a-range")} style={slot.style("root")}>
			<input
				type="range"
				class={slot.class("start", "a-slider a-range-lo")}
				style={slot.style("start")}
				min={min()}
				max={max()}
				step={step()}
				value={lo()}
				disabled={props.disabled}
				aria-label={props.startLabel ?? "Range start"}
				onInput={(e: InputEvent) => {
					const next = Number((e.target as HTMLInputElement).value);
					props.onChange([Math.min(next, hi()), hi()]);
				}}
			/>
			<input
				type="range"
				class={slot.class("end", "a-slider a-range-hi")}
				style={slot.style("end")}
				min={min()}
				max={max()}
				step={step()}
				value={hi()}
				disabled={props.disabled}
				aria-label={props.endLabel ?? "Range end"}
				onInput={(e: InputEvent) => {
					const next = Number((e.target as HTMLInputElement).value);
					props.onChange([lo(), Math.max(next, lo())]);
				}}
			/>
		</div>
	);
}

export type MultiSelectSlot = "root" | "control" | "menu" | "option";

export type MultiSelectProps = SlotProps<MultiSelectSlot> & {
	value: string[];
	options: Array<{ value: string; label: string; disabled?: boolean | undefined }>;
	disabled?: boolean | undefined;
	placeholder?: string | undefined;
	onChange: (value: string[]) => void;
};

/**
 * Multi-choice listbox dropdown. Slots: `root` `control` `menu` `option`.
 * State: `data-state="open|closed"` on the root.
 */
export function MultiSelect(input: MultiSelectProps) {
	const [props, rest, slot] = setup(
		"MultiSelect",
		input,
		{},
		["value", "options", "disabled", "placeholder", "onChange"],
		"root" as MultiSelectSlot,
	);
	const open = signal(false);
	const listId = createId("multiselect");
	let root: HTMLElement | undefined;
	const labelFor = (v: string) => props.options.find((o) => o.value === v)?.label ?? v;
	const toggle = (value: string) =>
		props.onChange(
			props.value.includes(value)
				? props.value.filter((v) => v !== value)
				: [...props.value, value],
		);

	watchClickOutside(
		() => open(),
		() => root,
		() => open.set(false),
	);

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			class={slot.class("root", "a-multiselect")}
			style={slot.style("root")}
			data-state={open() ? "open" : "closed"}
		>
			<button
				type="button"
				class={slot.class("control", "a-multiselect-control a-input")}
				style={slot.style("control")}
				disabled={props.disabled}
				aria-haspopup="listbox"
				aria-expanded={open()}
				aria-controls={listId}
				onClick={() => open.set(!open())}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Escape") open.set(false);
				}}
			>
				{props.value.length
					? props.value.map(labelFor).join(", ")
					: (props.placeholder ?? "Select…")}
			</button>
			<Show when={open()}>
				<div
					id={listId}
					class={slot.class("menu", "a-multiselect-menu")}
					style={slot.style("menu")}
					role="listbox"
					aria-multiselectable="true"
				>
					<For each={props.options}>
						{(opt) => {
							const selected = () => props.value.includes(opt.value);
							return (
								<button
									type="button"
									role="option"
									aria-selected={selected()}
									disabled={opt.disabled}
									data-state={selected() ? "selected" : "idle"}
									class={slot.class(
										"option",
										"a-multiselect-option",
										selected() && "a-multiselect-option-on",
									)}
									onClick={() => toggle(opt.value)}
								>
									{opt.label}
								</button>
							);
						}}
					</For>
				</div>
			</Show>
		</div>
	);
}

export type TagsInputSlot = "root" | "tag" | "remove" | "input";

export type TagsInputProps = SlotProps<TagsInputSlot> & {
	value: string[];
	disabled?: boolean | undefined;
	placeholder?: string | undefined;
	/** Render a tag's content (default: the text). */
	renderTag?: ((tag: string) => unknown) | undefined;
	onChange: (value: string[]) => void;
};

/**
 * Free-form tag entry (Enter / comma / paste lists, case-insensitive dedupe).
 * Slots: `root` `tag` `remove` `input`. State: `data-disabled`.
 */
export function TagsInput(input: TagsInputProps) {
	const [props, rest, slot] = setup(
		"TagsInput",
		input,
		{},
		["value", "disabled", "placeholder", "renderTag", "onChange"],
		"root" as TagsInputSlot,
	);
	const draft = signal("");

	/** Commit the draft; commas / newlines split pasted lists. Dedupe ignores case. */
	const commit = (raw = draft()) => {
		const seen = new Set(props.value.map((t) => t.toLowerCase()));
		const added: string[] = [];
		for (const part of raw.split(/[,\n]/)) {
			const tag = part.trim();
			if (!tag || seen.has(tag.toLowerCase())) continue;
			seen.add(tag.toLowerCase());
			added.push(tag);
		}
		if (added.length) props.onChange([...props.value, ...added]);
		draft.set("");
	};

	return (
		<div
			{...rest}
			class={slot.class("root", "a-tags-input", props.disabled && "a-tags-input-disabled")}
			style={slot.style("root")}
			data-disabled={props.disabled ? "" : undefined}
		>
			<For each={props.value}>
				{(tag) => (
					<span class={slot.class("tag", "a-tag a-tag-accent")} style={slot.style("tag")}>
						<span>{props.renderTag ? props.renderTag(tag) : tag}</span>
						{props.disabled ? null : (
							<button
								type="button"
								class={slot.class("remove", "a-tag-remove")}
								aria-label={`Remove ${tag}`}
								onClick={() => props.onChange(props.value.filter((t) => t !== tag))}
							>
								×
							</button>
						)}
					</span>
				)}
			</For>
			<input
				type="text"
				class={slot.class("input", "a-tags-field")}
				style={slot.style("input")}
				value={draft()}
				disabled={props.disabled}
				aria-label={props.placeholder ?? "Add tag"}
				placeholder={props.value.length ? "" : (props.placeholder ?? "Add tag")}
				onInput={(e: InputEvent) => {
					const value = (e.currentTarget as HTMLInputElement).value;
					if (/[,\n]/.test(value) && value.split(/[,\n]/).length > 2) commit(value);
					else draft.set(value);
				}}
				onPaste={(e: ClipboardEvent) => {
					const text = e.clipboardData?.getData("text") ?? "";
					if (!/[,\n]/.test(text)) return;
					e.preventDefault();
					commit(`${draft()}${text}`);
				}}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Enter" || e.key === ",") {
						e.preventDefault();
						commit();
					}
					if (e.key === "Backspace" && !draft() && props.value.length) {
						props.onChange(props.value.slice(0, -1));
					}
				}}
				onBlur={() => commit()}
			/>
		</div>
	);
}

export type AutocompleteSlot = "root" | "input" | "menu" | "option";

export type AutocompleteProps = SlotProps<AutocompleteSlot> &
	Omit<InputPassThrough, "autocomplete"> & {
		value: string;
		options: string[];
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		placeholder?: string | undefined;
		/** Max suggestions shown (default 8). */
		limit?: number | undefined;
		/** Render an option (default: the text). */
		renderOption?: ((option: string) => unknown) | undefined;
		onChange: (value: string) => void;
	};

/** Next active option index for ↑/↓, wrapping; `-1` means none active yet. */
function stepActive(current: number, dir: 1 | -1, count: number): number {
	if (current < 0) return dir > 0 ? 0 : count - 1;
	return (current + dir + count) % count;
}

/**
 * Combobox with suggestion list (↑ ↓ Enter Escape, `aria-activedescendant`).
 * The `<input>` is the host; `classes.root` styles the wrapper.
 * Slots: `root` `input` `menu` `option`.
 */
export function Autocomplete(input: AutocompleteProps) {
	const [props, rest, slot] = setup(
		"Autocomplete",
		input,
		{ limit: 8 },
		["value", "options", "invalid", "limit", "renderOption", "onChange"],
		"input" as AutocompleteSlot,
	);
	const open = signal(false);
	const active = signal(-1);
	const listId = createId("autocomplete");
	let root: HTMLElement | undefined;
	const filtered = () => {
		const q = props.value.trim().toLowerCase();
		const limit = props.limit ?? 8;
		if (!q) return props.options.slice(0, limit);
		return props.options.filter((o) => o.toLowerCase().includes(q)).slice(0, limit);
	};
	const expanded = () => open() && filtered().length > 0;
	const optionId = (i: number) => `${listId}-opt-${i}`;
	const close = () => {
		open.set(false);
		active.set(-1);
	};
	const choose = (opt: string) => {
		props.onChange(opt);
		close();
	};

	watchClickOutside(
		() => open(),
		() => root,
		close,
	);

	function move(dir: 1 | -1): boolean {
		if (!open()) open.set(true);
		const count = filtered().length;
		if (count) active.set(stepActive(active(), dir, count));
		return true;
	}
	/** Key handlers return `true` when they consumed the key. */
	const keys: Record<string, () => boolean> = {
		ArrowDown: () => move(1),
		ArrowUp: () => move(-1),
		Enter: () => {
			const opt = expanded() ? filtered()[active()] : undefined;
			if (opt === undefined) return false;
			choose(opt);
			return true;
		},
		Escape: () => {
			if (!open()) return false;
			close();
			return true;
		},
	};
	const onKeyDown = (e: KeyboardEvent) => {
		if (keys[e.key]?.()) e.preventDefault();
	};

	return (
		<div
			ref={(el: HTMLElement) => {
				root = el;
			}}
			class={slot.class("root", "a-autocomplete")}
			style={slot.style("root")}
			data-state={expanded() ? "open" : "closed"}
		>
			<TextInput
				{...rest}
				unstyled={props.unstyled}
				class={slot.class("input")}
				style={slot.style("input")}
				value={props.value}
				invalid={props.invalid}
				role="combobox"
				autocomplete="off"
				aria-autocomplete="list"
				aria-expanded={expanded()}
				aria-controls={listId}
				aria-activedescendant={expanded() && active() >= 0 ? optionId(active()) : undefined}
				onInput={(e: InputEvent) => {
					props.onChange((e.target as HTMLInputElement).value);
					active.set(-1);
					open.set(true);
				}}
				onFocus={() => open.set(true)}
				onKeyDown={onKeyDown}
			/>
			<div
				id={listId}
				class={slot.class("menu", "a-autocomplete-menu")}
				style={slot.style("menu")}
				role="listbox"
				hidden={!expanded()}
			>
				<For each={expanded() ? filtered() : []}>
					{(opt, index) => (
						// biome-ignore lint/a11y/useFocusableInteractive: combobox options are reached via aria-activedescendant, focus stays in the input
						<div
							id={optionId(index())}
							role="option"
							aria-selected={active() === index()}
							class={slot.class(
								"option",
								"a-autocomplete-option",
								active() === index() && "a-autocomplete-option-active",
							)}
							data-state={active() === index() ? "active" : "idle"}
							onMouseDown={(e: MouseEvent) => {
								e.preventDefault();
								choose(opt);
							}}
							onMouseEnter={() => active.set(index())}
						>
							{props.renderOption ? props.renderOption(opt) : opt}
						</div>
					)}
				</For>
			</div>
		</div>
	);
}
