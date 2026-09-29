import { Button } from "./button.tsx";
import { Icon } from "./icons.tsx";
import { TextInput } from "./input.tsx";
import { type BaseProps, type InputPassThrough, type SlotProps, setup } from "./system.ts";

export type SliderProps = BaseProps &
	Omit<InputPassThrough, "min" | "max" | "step"> & {
		value: number;
		min?: number | undefined;
		max?: number | undefined;
		step?: number | undefined;
		disabled?: boolean | undefined;
		onChange: (value: number) => void;
	};

/** Range input; forwarded attributes land on `<input type="range">`. Slots: `root`. */
export function Slider(input: SliderProps) {
	const [props, rest, slot] = setup("Slider", input, {}, [
		"value",
		"min",
		"max",
		"step",
		"onChange",
	]);
	const min = () => props.min ?? 0;
	const max = () => props.max ?? 100;
	return (
		<input
			{...rest}
			type="range"
			class={slot.class("root", "a-slider")}
			style={slot.style("root")}
			min={min()}
			max={max()}
			step={props.step ?? 1}
			value={props.value}
			aria-valuemin={min()}
			aria-valuemax={max()}
			aria-valuenow={props.value}
			onInput={(e: InputEvent) => {
				props.onChange(Number((e.target as HTMLInputElement).value));
			}}
		/>
	);
}

export type NumberInputSlot = "root" | "input" | "decrement" | "increment";

export type NumberInputProps = SlotProps<NumberInputSlot> &
	Omit<InputPassThrough, "min" | "max" | "step"> & {
		value: number;
		min?: number | undefined;
		max?: number | undefined;
		step?: number | undefined;
		disabled?: boolean | undefined;
		invalid?: boolean | undefined;
		name?: string | undefined;
		/** Accessible labels for the step buttons. */
		decrementLabel?: string | undefined;
		incrementLabel?: string | undefined;
		onChange: (value: number) => void;
	};

function decimals(n: number | undefined): number {
	if (n === undefined || !Number.isFinite(n)) return 0;
	const text = String(n);
	const exp = text.match(/e-(\d+)$/);
	if (exp) return Number(exp[1]);
	return text.includes(".") ? (text.split(".")[1]?.length ?? 0) : 0;
}

/**
 * Numeric field. Typing keeps a free-form draft (so `15` can be typed with
 * `min=10`); values commit when in range and clamp on blur / Enter / step.
 * Results are rounded to the precision of `step` (no `0.30000000000000004`).
 * The `<input>` is the host (`class`, `style`, `id`, `aria-*` land on it);
 * `classes.root` styles the wrapper. Slots: `root` `input` `decrement` `increment`.
 */
export function NumberInput(input: NumberInputProps) {
	const [props, rest, slot] = setup(
		"NumberInput",
		input,
		{},
		[
			"value",
			"min",
			"max",
			"step",
			"disabled",
			"invalid",
			"decrementLabel",
			"incrementLabel",
			"onChange",
		],
		"input" as NumberInputSlot,
	);
	const step = () => (props.step && props.step > 0 ? props.step : 1);
	const precision = () => Math.max(decimals(step()), decimals(props.min));
	const round = (n: number) => Number(n.toFixed(precision()));
	const inRange = (n: number) =>
		(props.min === undefined || n >= props.min) && (props.max === undefined || n <= props.max);
	const clamp = (n: number) => {
		let next = n;
		if (props.min !== undefined) next = Math.max(props.min, next);
		if (props.max !== undefined) next = Math.min(props.max, next);
		return round(next);
	};
	const current = () => (Number.isFinite(props.value) ? props.value : (props.min ?? 0));
	const emit = (n: number) => {
		if (n !== props.value) props.onChange(n);
	};

	const commit = (el: HTMLInputElement) => {
		const raw = el.value.trim();
		const parsed = Number(raw);
		if (raw !== "" && Number.isFinite(parsed)) emit(clamp(parsed));
		el.value = String(current());
	};

	return (
		<div
			class={slot.class("root", "a-number")}
			style={slot.style("root")}
			data-disabled={props.disabled ? "" : undefined}
		>
			<Button
				variant="ghost"
				size="sm"
				class={slot.class("decrement", "a-number-step")}
				aria-label={props.decrementLabel ?? "Decrease"}
				disabled={props.disabled || (props.min !== undefined && current() <= props.min)}
				onClick={() => emit(clamp(current() - step()))}
			>
				−
			</Button>
			<input
				inputmode="decimal"
				{...rest}
				type="number"
				class={slot.class("input", "a-input a-number-input", props.invalid && "a-input-invalid")}
				style={slot.style("input")}
				data-invalid={props.invalid ? "" : undefined}
				value={current()}
				min={props.min}
				max={props.max}
				step={step()}
				disabled={props.disabled}
				aria-invalid={props.invalid ? true : undefined}
				onInput={(e: InputEvent) => {
					const raw = (e.currentTarget as HTMLInputElement).value.trim();
					if (raw === "" || raw === "-") return;
					const n = Number(raw);
					if (Number.isFinite(n) && inRange(n)) emit(round(n));
				}}
				onFocusOut={(e: FocusEvent) => commit(e.currentTarget as HTMLInputElement)}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Enter") commit(e.currentTarget as HTMLInputElement);
				}}
			/>
			<Button
				variant="ghost"
				size="sm"
				class={slot.class("increment", "a-number-step")}
				aria-label={props.incrementLabel ?? "Increase"}
				disabled={props.disabled || (props.max !== undefined && current() >= props.max)}
				onClick={() => emit(clamp(current() + step()))}
			>
				+
			</Button>
		</div>
	);
}

export type SearchInputSlot = "root" | "input" | "icon" | "clear";

export type SearchInputProps = SlotProps<SearchInputSlot> &
	InputPassThrough & {
		value: string;
		placeholder?: string | undefined;
		disabled?: boolean | undefined;
		/** Leading icon (default: the `search` icon); `null` hides it. */
		icon?: unknown;
		clearLabel?: string | undefined;
		onChange: (value: string) => void;
		onSubmit?: (() => void) | undefined;
	};

/**
 * Search field with clear button. The `<input>` is the host; `classes.root`
 * styles the wrapper. Slots: `root` `input` `icon` `clear`.
 */
export function SearchInput(input: SearchInputProps) {
	const [props, rest, slot] = setup(
		"SearchInput",
		input,
		{ placeholder: "Search" },
		["value", "disabled", "icon", "clearLabel", "onChange", "onSubmit"],
		"input" as SearchInputSlot,
	);
	return (
		<div class={slot.class("root", "a-search")} style={slot.style("root")}>
			{props.icon === null ? null : (
				<span class={slot.class("icon", "a-search-icon")} aria-hidden="true">
					{props.icon ?? <Icon name="search" size="sm" />}
				</span>
			)}
			<TextInput
				{...rest}
				type="search"
				unstyled={props.unstyled}
				class={slot.class("input", "a-search-input")}
				style={slot.style("input")}
				value={props.value}
				disabled={props.disabled}
				onInput={(e: InputEvent) => props.onChange((e.target as HTMLInputElement).value)}
				onKeyDown={(e: KeyboardEvent) => {
					if (e.key === "Enter") props.onSubmit?.();
				}}
			/>
			{props.value ? (
				<button
					type="button"
					class={slot.class("clear", "a-search-clear")}
					aria-label={props.clearLabel ?? "Clear search"}
					disabled={props.disabled}
					onClick={() => props.onChange("")}
				>
					×
				</button>
			) : null}
		</div>
	);
}
