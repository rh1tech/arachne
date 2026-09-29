import { type BaseProps, type StyleValue, setup } from "./system.ts";

export type ColumnSize =
	| 1
	| 2
	| 3
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| "full"
	| "four-fifths"
	| "three-quarters"
	| "two-thirds"
	| "three-fifths"
	| "half"
	| "two-fifths"
	| "one-third"
	| "one-quarter"
	| "one-fifth"
	| "narrow"
	| "auto";

export type ColumnsProps = BaseProps & {
	/** Keep columns side-by-side on mobile (default stacks under 768px). */
	mobile?: boolean | undefined;
	multiline?: boolean | undefined;
	centered?: boolean | undefined;
	vcentered?: boolean | undefined;
	gap?: string | undefined;
	children?: unknown;
};

/** Flexbox columns container (Bulma `columns`). Slots: `root`. */
export function Columns(input: ColumnsProps) {
	const [props, rest, slot] = setup("Columns", input, {}, [
		"mobile",
		"multiline",
		"centered",
		"vcentered",
		"gap",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-columns",
				props.mobile && "a-columns-mobile",
				props.multiline && "a-columns-multiline",
				props.centered && "a-columns-centered",
				props.vcentered && "a-columns-vcentered",
			)}
			style={slot.style("root", props.gap ? { gap: props.gap } : undefined)}
		>
			{props.children}
		</div>
	);
}

export type ColumnProps = BaseProps & {
	size?: ColumnSize | undefined;
	offset?: ColumnSize | undefined;
	narrow?: boolean | undefined;
	children?: unknown;
};

function sizeClass(prefix: string, size: ColumnSize | undefined): string | false {
	if (size == null) return false;
	return `${prefix}-${size}`;
}

/** Single column (Bulma `column`). Slots: `root`. */
export function Column(input: ColumnProps) {
	const [props, rest, slot] = setup("Column", input, {}, ["size", "offset", "narrow", "children"]);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-column",
				sizeClass("a-column", props.size),
				sizeClass("a-column-offset", props.offset),
				(props.narrow || props.size === "narrow") && "a-column-narrow",
			)}
			style={slot.style("root")}
			data-size={props.size}
		>
			{props.children}
		</div>
	);
}

export type GridProps = BaseProps & {
	/** Column count (CSS grid). Default 12. */
	cols?: number | undefined;
	/** Min track width for auto-fit dense grids, e.g. `12rem`. Overrides `cols` when set. */
	min?: string | undefined;
	gap?: string | undefined;
	children?: unknown;
};

/** CSS grid layout (Bulma-style 2D grid). Slots: `root`. Tokens: `--a-grid-cols/min/gap`. */
export function Grid(input: GridProps) {
	const [props, rest, slot] = setup("Grid", input, { cols: 12 }, [
		"cols",
		"min",
		"gap",
		"children",
	]);
	const vars = (): StyleValue => ({
		"--a-grid-cols": String(props.cols ?? 12),
		"--a-grid-min": props.min,
		"--a-grid-gap": props.gap,
	});
	return (
		<div
			{...rest}
			class={slot.class("root", "a-grid", props.min && "a-grid-auto")}
			style={slot.style("root", vars())}
		>
			{props.children}
		</div>
	);
}

export type GridItemProps = BaseProps & {
	span?: number | undefined;
	start?: number | undefined;
	children?: unknown;
};

/** Slots: `root`. Tokens: `--a-grid-span`, `--a-grid-start`. */
export function GridItem(input: GridItemProps) {
	const [props, rest, slot] = setup("GridItem", input, {}, ["span", "start", "children"]);
	const vars = (): StyleValue => ({
		"--a-grid-span": props.span != null ? String(props.span) : undefined,
		"--a-grid-start": props.start != null ? String(props.start) : undefined,
	});
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-grid-item",
				props.span != null && "a-grid-item-span",
				props.start != null && "a-grid-item-start",
			)}
			style={slot.style("root", vars())}
		>
			{props.children}
		</div>
	);
}

export type ContainerProps = BaseProps & {
	size?: "sm" | "md" | "lg" | "full" | undefined;
	children?: unknown;
};

/** Slots: `root`. */
export function Container(input: ContainerProps) {
	const [props, rest, slot] = setup("Container", input, {}, ["size", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-container", props.size && `a-container-${props.size}`)}
			style={slot.style("root")}
			data-size={props.size}
		>
			{props.children}
		</div>
	);
}

export type SectionProps = BaseProps & {
	size?: "sm" | "md" | "lg" | undefined;
	children?: unknown;
};

/** Slots: `root`. */
export function Section(input: SectionProps) {
	const [props, rest, slot] = setup("Section", input, {}, ["size", "children"]);
	return (
		<section
			{...rest}
			class={slot.class(
				"root",
				"a-section",
				props.size && props.size !== "md" && `a-section-${props.size}`,
			)}
			style={slot.style("root")}
			data-size={props.size}
		>
			{props.children}
		</section>
	);
}

export type LevelProps = BaseProps & {
	mobile?: boolean | undefined;
	children?: unknown;
};

/** Horizontal level bar (Bulma `level`). Slots: `root`. */
export function Level(input: LevelProps) {
	const [props, rest, slot] = setup("Level", input, {}, ["mobile", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-level", props.mobile && "a-level-mobile")}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type LevelSideProps = BaseProps & {
	children?: unknown;
};

export function LevelLeft(input: LevelSideProps) {
	const [props, rest, slot] = setup("LevelLeft", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-level-left")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function LevelRight(input: LevelSideProps) {
	const [props, rest, slot] = setup("LevelRight", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-level-right")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export function LevelItem(input: LevelSideProps) {
	const [props, rest, slot] = setup("LevelItem", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-level-item")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}
