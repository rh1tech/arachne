import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type SpinnerProps = BaseProps & {
	size?: "sm" | "md" | "lg" | undefined;
	label?: string | undefined;
};

/** Loading indicator. State: `data-size`. */
export function Spinner(input: SpinnerProps) {
	const [props, rest, slot] = setup("Spinner", input, {}, ["size", "label"]);
	return (
		<span
			aria-label={props.label ?? "Loading"}
			{...rest}
			class={slot.class(
				"root",
				"a-spinner",
				props.size === "sm" && "a-spinner-sm",
				props.size === "lg" && "a-spinner-lg",
			)}
			style={slot.style("root")}
			role="status"
			data-size={props.size ?? "md"}
		/>
	);
}

export type ProgressColor = "primary" | "info" | "success" | "warning" | "danger" | undefined;
export type ProgressSize = "sm" | "md" | "lg" | undefined;

export type ProgressSlot = "root" | "bar";

export type ProgressProps = SlotProps<ProgressSlot> & {
	value: number;
	max?: number | undefined;
	color?: ProgressColor;
	size?: ProgressSize;
	indeterminate?: boolean | undefined;
};

/** Percentage of `value` in `[0, max]`, safe for `max <= 0` and non-finite input. */
export function percentOf(value: number, max = 100): number {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
	return Math.max(0, Math.min(100, (value / max) * 100));
}

/**
 * Linear progress bar. Slots: `root` `bar`. State: `data-state`
 * (`determinate` | `indeterminate`), `data-tone`, `data-size`.
 */
export function Progress(input: ProgressProps) {
	const [props, rest, slot] = setup(
		"Progress",
		input,
		{},
		["value", "max", "color", "size", "indeterminate"],
		"root" as ProgressSlot,
	);
	return (
		<div
			// Default accessible name; `aria-label` / `aria-labelledby` from the caller win.
			aria-label="Progress"
			{...rest}
			class={slot.class(
				"root",
				"a-progress",
				props.color && `a-progress-${props.color}`,
				props.size === "sm" && "a-progress-sm",
				props.size === "lg" && "a-progress-lg",
				props.indeterminate && "a-progress-indeterminate",
			)}
			style={slot.style("root")}
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={props.max && props.max > 0 ? props.max : 100}
			aria-valuenow={props.indeterminate || !Number.isFinite(props.value) ? undefined : props.value}
			data-state={props.indeterminate ? "indeterminate" : "determinate"}
			data-tone={props.color ?? "primary"}
			data-size={props.size ?? "md"}
		>
			<div
				class={slot.class("bar", "a-progress-bar")}
				style={slot.style(
					"bar",
					props.indeterminate
						? undefined
						: { width: `${percentOf(props.value, props.max ?? 100)}%` },
				)}
			/>
		</div>
	);
}

export type BoxProps = BaseProps & {
	children?: unknown;
};

/** Bordered surface for grouping content. */
export function Box(input: BoxProps) {
	const [props, rest, slot] = setup("Box", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-box")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type TableProps = BaseProps & {
	bordered?: boolean | undefined;
	striped?: boolean | undefined;
	narrow?: boolean | undefined;
	hoverable?: boolean | undefined;
	fullwidth?: boolean | undefined;
	children?: unknown;
};

/** Styled `<table>`; pass `<thead>` / `<tbody>` as children. */
export function Table(input: TableProps) {
	const [props, rest, slot] = setup("Table", input, {}, [
		"bordered",
		"striped",
		"narrow",
		"hoverable",
		"fullwidth",
		"children",
	]);
	return (
		<table
			{...rest}
			class={slot.class(
				"root",
				"a-table",
				props.bordered && "a-table-bordered",
				props.striped && "a-table-striped",
				props.narrow && "a-table-narrow",
				props.hoverable !== false && "a-table-hoverable",
				props.fullwidth && "a-table-fullwidth",
			)}
			style={slot.style("root")}
		>
			{props.children}
		</table>
	);
}
