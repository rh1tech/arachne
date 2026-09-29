import { For, Show } from "@arachne/render";
import { computed, effect, signal, untrack } from "@arachne/signals";
import { watchClickOutside } from "./click-outside.ts";
import { whenConnected } from "./focus.ts";
import { Icon } from "./icons.tsx";
import { watchEscape } from "./layers.ts";
import { type BaseProps, createId, type SlotProps, type Slots, setup } from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

export type TreeNode = {
	id: string;
	label: string;
	children?: TreeNode[] | undefined;
};

export type TreeSlot = "root" | "group" | "item" | "row" | "toggle" | "label";

export type TreeProps = SlotProps<TreeSlot> & {
	data: TreeNode[];
	value?: string | undefined;
	onChange?: ((id: string) => void) | undefined;
	/** Node ids expanded on mount. */
	defaultExpanded?: string[] | undefined;
	/** Accessible name for the tree. */
	label?: string | undefined;
};

type VisibleNode = { node: TreeNode; level: number; parent: string | undefined };

function hasChildren(node: TreeNode): boolean {
	return (node.children?.length ?? 0) > 0;
}

/** Depth-first list of nodes currently visible (children of expanded nodes only). */
function flattenVisible(
	nodes: TreeNode[],
	expanded: Set<string>,
	level = 1,
	parent?: string,
): VisibleNode[] {
	return nodes.flatMap((node) => {
		const self = { node, level, parent };
		if (!hasChildren(node) || !expanded.has(node.id)) return [self];
		return [self, ...flattenVisible(node.children ?? [], expanded, level + 1, node.id)];
	});
}

type TreeMove = {
	focus?: string | undefined;
	toggle?: string | undefined;
	select?: string;
	/** Expand these ids (the `*` key). */
	expand?: string[] | undefined;
};

const labelText = (node: TreeNode): string =>
	typeof node.label === "string" ? node.label.trim().toLowerCase() : "";

/** Next visible item after `index` (wrapping) whose label starts with `char`. */
function typeAhead(list: VisibleNode[], index: number, char: string): string | undefined {
	const needle = char.toLowerCase();
	for (let step = 1; step <= list.length; step++) {
		const candidate = list[(index + step) % list.length];
		if (candidate && labelText(candidate.node).startsWith(needle)) return candidate.node.id;
	}
	return undefined;
}

/** WAI-ARIA tree keyboard model for the item at `index` of the visible list. */
function treeKeyAction(
	key: string,
	list: VisibleNode[],
	index: number,
	expanded: Set<string>,
): TreeMove | null {
	const cur = list[index];
	if (!cur) return null;
	const open = expanded.has(cur.node.id);
	switch (key) {
		case "ArrowDown":
			return { focus: list[index + 1]?.node.id };
		case "ArrowUp":
			return { focus: list[index - 1]?.node.id };
		case "Home":
			return { focus: list[0]?.node.id };
		case "End":
			return { focus: list[list.length - 1]?.node.id };
		case "ArrowRight":
			if (!hasChildren(cur.node)) return {};
			return open ? { focus: list[index + 1]?.node.id } : { toggle: cur.node.id };
		case "ArrowLeft":
			return hasChildren(cur.node) && open ? { toggle: cur.node.id } : { focus: cur.parent };
		case "Enter":
		case " ":
			return { select: cur.node.id };
		case "*":
			// Expand every collapsed sibling (same parent) that has children.
			return {
				expand: list
					.filter((v) => v.parent === cur.parent && hasChildren(v.node) && !expanded.has(v.node.id))
					.map((v) => v.node.id),
			};
		default:
			return key.length === 1 && /\S/.test(key) ? { focus: typeAhead(list, index, key) } : null;
	}
}

type TreeContext = {
	slot: Slots<TreeSlot>;
	value: () => string | undefined;
	tabStop: () => string | undefined;
	isOpen: (id: string) => boolean;
};

function TreeBranch(props: { nodes: TreeNode[]; level: number; ctx: TreeContext }) {
	const { slot } = props.ctx;
	return (
		<For each={props.nodes}>
			{(node) => {
				const kids = node.children ?? [];
				const open = () => props.ctx.isOpen(node.id);
				const selected = () => props.ctx.value() === node.id;
				return (
					// biome-ignore lint/a11y/useFocusableInteractive: roving tabindex is set dynamically (0 on the tab stop, -1 elsewhere)
					<li
						role="treeitem"
						data-tree-id={node.id}
						tabindex={props.ctx.tabStop() === node.id ? "0" : "-1"}
						aria-level={props.level}
						aria-expanded={kids.length > 0 ? open() : undefined}
						aria-selected={selected()}
						class={slot.class("item", "a-tree-node")}
						style={slot.style("item")}
					>
						<div
							class={slot.class("row", "a-tree-row", selected() && "a-tree-row-active")}
							style={slot.style("row", { "padding-left": `${0.35 + (props.level - 1) * 0.85}rem` })}
						>
							{kids.length > 0 ? (
								<span
									data-tree-toggle=""
									class={slot.class("toggle", "a-tree-spacer", "a-tree-toggle")}
									style={slot.style("toggle", {
										display: "inline-flex",
										"align-items": "center",
										"justify-content": "center",
										cursor: "pointer",
									})}
									aria-hidden="true"
								>
									<Show when={open()} fallback={<Icon name="chevron-right" size={14} />}>
										<Icon name="chevron-down" size={14} />
									</Show>
								</span>
							) : (
								<span class={slot.class("toggle", "a-tree-spacer")} aria-hidden="true" />
							)}
							<span class={slot.class("label", "a-tree-label")} style={slot.style("label")}>
								{node.label}
							</span>
						</div>
						<Show when={kids.length > 0 && open()}>
							{/* biome-ignore lint/a11y/useSemanticElements: APG tree — nested ul[role=group], not a form fieldset */}
							<ul
								role="group"
								class={slot.class("group", "a-tree-list")}
								style={slot.style("group")}
							>
								<TreeBranch nodes={kids} level={props.level + 1} ctx={props.ctx} />
							</ul>
						</Show>
					</li>
				);
			}}
		</For>
	);
}

/**
 * WAI-ARIA tree: one tab stop, ↑ ↓ move, → expands / enters, ← collapses /
 * goes to parent, Home End, Enter/Space select.
 * Slots: `root` `group` `item` `row` `toggle` `label`.
 */
export function Tree(input: TreeProps) {
	const [props, rest, slot] = setup(
		"Tree",
		input,
		{},
		["data", "value", "onChange", "defaultExpanded", "label"],
		"root" as TreeSlot,
	);
	const expanded = signal(new Set<string>(untrack(() => props.defaultExpanded) ?? []));
	const focused = signal<string | undefined>(undefined);
	let root: HTMLElement | undefined;

	const visible = () => flattenVisible(props.data, expanded());
	const isVisible = (id: string | undefined) =>
		Boolean(id && visible().some((v) => v.node.id === id));
	const tabStop = () => {
		const f = focused();
		if (isVisible(f)) return f;
		if (isVisible(props.value)) return props.value;
		return visible()[0]?.node.id;
	};
	const toggle = (id: string) => {
		const next = new Set(expanded());
		if (next.has(id)) next.delete(id);
		else next.add(id);
		expanded.set(next);
	};
	const itemFrom = (target: EventTarget | null) =>
		(target as Element | null)?.closest<HTMLElement>('[role="treeitem"]') ?? undefined;
	const focusItem = (id: string) => {
		focused.set(id);
		const items = root ? [...root.querySelectorAll<HTMLElement>('[role="treeitem"]')] : [];
		items.find((el) => el.dataset["treeId"] === id)?.focus();
	};

	const onKeyDown = (e: KeyboardEvent) => {
		// Leave browser / app shortcuts (Ctrl+C, ⌘L, …) alone.
		if (e.ctrlKey || e.metaKey || e.altKey) return;
		const id = itemFrom(e.target)?.dataset["treeId"];
		const list = visible();
		const move = treeKeyAction(
			e.key,
			list,
			list.findIndex((v) => v.node.id === id),
			expanded(),
		);
		if (!move) return;
		e.preventDefault();
		if (move.toggle) toggle(move.toggle);
		for (const id of move.expand ?? []) toggle(id);
		if (move.select) props.onChange?.(move.select);
		if (move.focus) focusItem(move.focus);
	};

	const onClick = (e: MouseEvent) => {
		const id = itemFrom(e.target)?.dataset["treeId"];
		if (!id) return;
		if ((e.target as Element).closest("[data-tree-toggle]")) toggle(id);
		else props.onChange?.(id);
		focusItem(id);
	};

	const ctx: TreeContext = {
		slot,
		value: () => props.value,
		tabStop,
		isOpen: (id) => expanded().has(id),
	};

	return (
		<ul
			aria-label={props.label}
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			// biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: APG tree pattern is ul[role=tree] > li[role=treeitem]
			role="tree"
			class={slot.class("root", "a-tree", "a-tree-list", "a-tree-root")}
			style={slot.style("root")}
			onKeyDown={onKeyDown}
			onClick={onClick}
			onFocusIn={(e: FocusEvent) => {
				const id = itemFrom(e.target)?.dataset["treeId"];
				if (id) focused.set(id);
			}}
		>
			<TreeBranch nodes={props.data} level={1} ctx={ctx} />
		</ul>
	);
}

export type CarouselSlide = {
	id: string;
	content: unknown;
};

export type CarouselSlot = "root" | "viewport" | "slide" | "controls" | "control" | "status";

export type CarouselProps = SlotProps<CarouselSlot> & {
	slides: CarouselSlide[];
	value?: string | undefined;
	onChange?: ((id: string) => void) | undefined;
	/** Accessible name (default "Carousel"). */
	label?: string | undefined;
};

/**
 * Previous/next carousel; controlled when `value` is set. ← → switch slides.
 * Slots: `root` `viewport` `slide` `controls` `control` `status`.
 */
export function Carousel(input: CarouselProps) {
	const [props, rest, slot] = setup(
		"Carousel",
		input,
		{},
		["slides", "value", "onChange", "label"],
		"root" as CarouselSlot,
	);
	const internal = signal(0);
	const len = () => props.slides.length;
	const index = () => {
		if (!len()) return 0;
		if (props.value !== undefined) {
			const i = props.slides.findIndex((s) => s.id === props.value);
			if (i >= 0) return i;
		}
		return Math.min(Math.max(0, internal()), len() - 1);
	};

	const go = (next: number) => {
		if (!len()) return;
		const i = ((next % len()) + len()) % len();
		internal.set(i);
		const slide = props.slides[i];
		if (slide) props.onChange?.(slide.id);
	};

	const current = () => props.slides[index()];

	return (
		<section
			aria-roledescription="carousel"
			aria-label={props.label ?? "Carousel"}
			{...rest}
			class={slot.class("root", "a-carousel")}
			style={slot.style("root")}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === "ArrowLeft") go(index() - 1);
				if (e.key === "ArrowRight") go(index() + 1);
			}}
		>
			<div
				class={slot.class("viewport", "a-carousel-viewport")}
				style={slot.style("viewport")}
				aria-live="polite"
			>
				<Show when={current()} fallback={null}>
					{(slide: CarouselSlide) => (
						// biome-ignore lint/a11y/useSemanticElements: APG slide is a labelled group, not a form fieldset
						<div
							class={slot.class("slide", "a-carousel-slide")}
							style={slot.style("slide")}
							role="group"
							aria-roledescription="slide"
							aria-label={`${index() + 1} of ${len()}`}
						>
							{slide.content}
						</div>
					)}
				</Show>
			</div>
			<div class={slot.class("controls", "a-carousel-controls")} style={slot.style("controls")}>
				<ActionIcon
					class={slot.class("control")}
					label="Previous"
					disabled={len() < 2}
					onClick={() => go(index() - 1)}
				>
					<Icon name="chevron-left" />
				</ActionIcon>
				<span class={slot.class("status", "a-carousel-status")} style={slot.style("status")}>
					{len() ? index() + 1 : 0} / {len()}
				</span>
				<ActionIcon
					class={slot.class("control")}
					label="Next"
					disabled={len() < 2}
					onClick={() => go(index() + 1)}
				>
					<Icon name="chevron-right" />
				</ActionIcon>
			</div>
		</section>
	);
}

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type CalendarSlot =
	| "root"
	| "header"
	| "nav"
	| "label"
	| "table"
	| "weekdays"
	| "weekday"
	| "grid"
	| "row"
	| "cell"
	| "day";

/** Date constraints shared by Calendar and DatePicker. */
export type CalendarConstraints = {
	/** Earliest selectable date, YYYY-MM-DD. */
	min?: string | undefined;
	/** Latest selectable date, YYYY-MM-DD. */
	max?: string | undefined;
	isDateDisabled?: ((iso: string) => boolean) | undefined;
	/** First column: 0 = Sunday (default) … 6 = Saturday. */
	weekStartsOn?: Weekday | undefined;
	/** BCP 47 locale for month / day labels (default: runtime locale). */
	locale?: string | undefined;
};

export type CalendarProps = SlotProps<CalendarSlot> &
	CalendarConstraints & {
		/** YYYY-MM-DD */
		value?: string | undefined;
		onChange?: ((iso: string) => void) | undefined;
		/** Focus the active day on mount (used by DatePicker). */
		autoFocus?: boolean | undefined;
	};

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

function toIso(y: number, m: number, d: number): string {
	const date = new Date(y, m, d);
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseIso(iso: string | undefined): Date {
	if (!iso) return new Date();
	const [y, m, d] = iso.split("-").map(Number);
	if (!y || !m || !d) return new Date();
	return new Date(y, m - 1, d);
}

function todayIso(): string {
	const now = new Date();
	return toIso(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(iso: string, days: number): string {
	const d = parseIso(iso);
	return toIso(d.getFullYear(), d.getMonth(), d.getDate() + days);
}

/** Same day `months` later, clamped to the target month's length (Jan 31 → Feb 28). */
export function addMonths(iso: string, months: number): string {
	const d = parseIso(iso);
	const target = new Date(d.getFullYear(), d.getMonth() + months, 1);
	const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
	return toIso(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

/** Next focused date for a grid navigation key, or `null` if the key doesn't navigate. */
export function calendarKeyTarget(
	key: string,
	shift: boolean,
	iso: string,
	weekStartsOn: Weekday = 0,
): string | null {
	const offset = (parseIso(iso).getDay() - weekStartsOn + 7) % 7;
	switch (key) {
		case "ArrowLeft":
			return addDays(iso, -1);
		case "ArrowRight":
			return addDays(iso, 1);
		case "ArrowUp":
			return addDays(iso, -7);
		case "ArrowDown":
			return addDays(iso, 7);
		case "Home":
			return addDays(iso, -offset);
		case "End":
			return addDays(iso, 6 - offset);
		case "PageUp":
			return addMonths(iso, shift ? -12 : -1);
		case "PageDown":
			return addMonths(iso, shift ? 12 : 1);
		default:
			return null;
	}
}

type CalendarCell = { iso: string | null; key: string };

function buildWeeks(year: number, month: number, weekStartsOn: Weekday): CalendarCell[][] {
	const lead = (new Date(year, month, 1).getDay() - weekStartsOn + 7) % 7;
	const days = new Date(year, month + 1, 0).getDate();
	const cells: CalendarCell[] = [];
	for (let i = 0; i < lead; i++) cells.push({ iso: null, key: `lead-${i}` });
	for (let d = 1; d <= days; d++) cells.push({ iso: toIso(year, month, d), key: `d-${d}` });
	while (cells.length % 7) cells.push({ iso: null, key: `tail-${cells.length}` });
	const weeks: CalendarCell[][] = [];
	for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
	return weeks;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
/** 4 Jan 2026 is a Sunday — used to name weekdays in the requested locale. */
const SUNDAY = new Date(2026, 0, 4);

function clampIso(iso: string, min?: string, max?: string): string {
	if (min && iso < min) return min;
	if (max && iso > max) return max;
	return iso;
}

/** `true` when `iso` falls outside `min`/`max` or `isDateDisabled` rejects it. */
function isDisabledDate(iso: string, c: CalendarConstraints): boolean {
	if (c.min && iso < c.min) return true;
	if (c.max && iso > c.max) return true;
	return c.isDateDisabled?.(iso) ?? false;
}

/**
 * Month grid (WAI-ARIA date grid): one tab stop, ← → ↑ ↓ by day/week,
 * PageUp/PageDown by month (Shift = year), Home/End week edges, full-date
 * labels, `aria-selected` / `aria-current="date"`, `min` / `max` / `isDateDisabled`.
 * Slots: `root` `header` `nav` `label` `table` `weekdays` `weekday` `grid` `row` `cell` `day`.
 */
export function Calendar(input: CalendarProps) {
	const [props, rest, slot] = setup(
		"Calendar",
		input,
		{ weekStartsOn: 0 },
		[
			"value",
			"onChange",
			"min",
			"max",
			"isDateDisabled",
			"weekStartsOn",
			"locale",
			"autoFocus",
			"id",
		],
		"root" as CalendarSlot,
	);
	const id = createId("calendar", props.id);
	const today = todayIso();
	// No value: start on today, clamped into [min, max] so the grid opens on a selectable month.
	const focusIso = signal(untrack(() => props.value || clampIso(today, props.min, props.max)));
	let root: HTMLElement | undefined;

	// Follow external value changes (e.g. a typed date elsewhere).
	let seenValue = untrack(() => props.value);
	effect(() => {
		const value = props.value;
		if (value === seenValue) return;
		seenValue = value;
		if (value) focusIso.set(value);
	});

	const monthStart = computed(() => {
		const d = parseIso(focusIso());
		return toIso(d.getFullYear(), d.getMonth(), 1);
	});
	const weeks = computed(() => {
		const d = parseIso(monthStart());
		return buildWeeks(d.getFullYear(), d.getMonth(), props.weekStartsOn ?? 0);
	});
	const weekdayOrder = () =>
		Array.from({ length: 7 }, (_, i) => ((props.weekStartsOn ?? 0) + i) % 7);

	const disabled = (iso: string) => isDisabledDate(iso, props);
	const fullLabel = (iso: string) =>
		parseIso(iso).toLocaleDateString(props.locale, {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	const weekdayName = (dow: number) =>
		new Date(SUNDAY.getFullYear(), SUNDAY.getMonth(), SUNDAY.getDate() + dow).toLocaleDateString(
			props.locale,
			{ weekday: "long" },
		);
	const monthLabel = () =>
		parseIso(monthStart()).toLocaleString(props.locale, { month: "long", year: "numeric" });
	const prevDisabled = () => Boolean(props.min && addDays(monthStart(), -1) < props.min);
	const nextDisabled = () => Boolean(props.max && addMonths(monthStart(), 1) > props.max);

	const focusDay = (iso: string) => {
		focusIso.set(iso);
		root?.querySelector<HTMLElement>(`[data-date="${iso}"]`)?.focus();
	};
	const select = (iso: string) => {
		if (disabled(iso)) return;
		focusIso.set(iso);
		props.onChange?.(iso);
	};

	const onGridKeyDown = (e: KeyboardEvent) => {
		const next = calendarKeyTarget(e.key, e.shiftKey, focusIso(), props.weekStartsOn ?? 0);
		if (!next) return;
		e.preventDefault();
		focusDay(next);
	};

	const view = (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			id={props.id}
			class={slot.class("root", "a-calendar")}
			style={slot.style("root")}
		>
			<div class={slot.class("header", "a-calendar-header")} style={slot.style("header")}>
				<ActionIcon
					class={slot.class("nav")}
					label="Previous month"
					disabled={prevDisabled()}
					onClick={() => focusIso.set(addMonths(focusIso(), -1))}
				>
					<Icon name="chevron-left" />
				</ActionIcon>
				<span
					id={`${id}-label`}
					class={slot.class("label", "a-calendar-label")}
					style={slot.style("label")}
					aria-live="polite"
				>
					{monthLabel()}
				</span>
				<ActionIcon
					class={slot.class("nav")}
					label="Next month"
					disabled={nextDisabled()}
					onClick={() => focusIso.set(addMonths(focusIso(), 1))}
				>
					<Icon name="chevron-right" />
				</ActionIcon>
			</div>
			{/* biome-ignore lint/a11y/useSemanticElements: date grid laid out with CSS grid; ARIA grid roles on divs keep the 7-column layout */}
			<div
				role="grid"
				aria-labelledby={`${id}-label`}
				class={slot.class("table")}
				style={slot.style("table")}
				onKeyDown={onGridKeyDown}
			>
				{/* biome-ignore lint/a11y/useFocusableInteractive: APG date grid — focus lives on the day buttons (roving tabindex), not on rows/headers/cells */}
				{/* biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans */}
				<div
					role="row"
					class={slot.class("weekdays", "a-calendar-weekdays")}
					style={slot.style("weekdays")}
				>
					<For each={weekdayOrder()}>
						{(dow) => (
							// biome-ignore lint/a11y/useFocusableInteractive: APG date grid — focus lives on the day buttons (roving tabindex), not on rows/headers/cells
							// biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans
							<span
								role="columnheader"
								aria-label={weekdayName(dow)}
								class={slot.class("weekday", "a-calendar-weekday")}
								style={slot.style("weekday")}
							>
								{WEEKDAYS[dow]}
							</span>
						)}
					</For>
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans */}
				<div
					role="rowgroup"
					class={slot.class("grid", "a-calendar-grid")}
					style={slot.style("grid")}
				>
					<For each={weeks()}>
						{(week) => (
							// biome-ignore lint/a11y/useFocusableInteractive: APG date grid — focus lives on the day buttons (roving tabindex), not on rows/headers/cells
							// biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans
							<div
								role="row"
								class={slot.class("row", "a-calendar-row")}
								style={slot.style("row", { display: "contents" })}
							>
								<For each={week}>
									{(cell) => (
										<CalendarDay
											iso={cell.iso}
											slot={slot}
											selected={(iso) => props.value === iso}
											focused={(iso) => focusIso() === iso}
											disabled={disabled}
											today={today}
											label={fullLabel}
											onSelect={select}
										/>
									)}
								</For>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);

	effect(() => {
		if (!props.autoFocus) return;
		return whenConnected(
			() => root,
			() => {
				focusDay(untrack(() => focusIso()));
			},
		);
	});

	return view;
}

function CalendarDay(props: {
	iso: string | null;
	slot: Slots<CalendarSlot>;
	selected: (iso: string) => boolean;
	focused: (iso: string) => boolean;
	disabled: (iso: string) => boolean;
	today: string;
	label: (iso: string) => string;
	onSelect: (iso: string) => void;
}) {
	const { slot } = props;
	const cellStyle = () => slot.style("cell", { display: "contents" });
	const iso = props.iso;
	if (iso === null) {
		return (
			// biome-ignore lint/a11y/useFocusableInteractive: APG date grid — focus lives on the day buttons (roving tabindex), not on rows/headers/cells
			// biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans
			<div role="gridcell" class={slot.class("cell", "a-calendar-gridcell")} style={cellStyle()}>
				<span class={slot.class("day", "a-calendar-cell", "a-calendar-empty")} />
			</div>
		);
	}
	return (
		// biome-ignore lint/a11y/useFocusableInteractive: APG date grid — focus lives on the day buttons (roving tabindex), not on rows/headers/cells
		// biome-ignore lint/a11y/useSemanticElements: date grid is laid out with CSS grid, so ARIA grid roles sit on divs/spans
		<div
			role="gridcell"
			aria-selected={props.selected(iso)}
			class={slot.class("cell", "a-calendar-gridcell")}
			style={cellStyle()}
		>
			<button
				type="button"
				data-date={iso}
				tabindex={props.focused(iso) ? "0" : "-1"}
				aria-label={props.label(iso)}
				aria-current={iso === props.today ? "date" : undefined}
				aria-disabled={props.disabled(iso) || undefined}
				data-state={props.selected(iso) ? "selected" : undefined}
				data-today={iso === props.today ? "" : undefined}
				class={slot.class(
					"day",
					"a-calendar-cell",
					props.selected(iso) && "a-calendar-cell-active",
					iso === props.today && "a-calendar-cell-today",
					props.disabled(iso) && "a-calendar-cell-disabled",
				)}
				style={slot.style("day")}
				onClick={() => props.onSelect(iso)}
			>
				{Number(iso.slice(8))}
			</button>
		</div>
	);
}

export type DatePickerSlot = "root" | "label" | "trigger" | "value" | "dropdown" | "calendar";

export type DatePickerProps = SlotProps<DatePickerSlot> &
	CalendarConstraints & {
		value?: string | undefined;
		onChange?: ((iso: string) => void) | undefined;
		label?: string | undefined;
		placeholder?: string | undefined;
	};

/**
 * Trigger + calendar dropdown. Opening focuses the active day; picking a day
 * or Escape closes and returns focus to the trigger.
 * Slots: `root` `label` `trigger` `value` `dropdown` `calendar`.
 */
export function DatePicker(input: DatePickerProps) {
	const [props, rest, slot] = setup(
		"DatePicker",
		input,
		{},
		[
			"value",
			"onChange",
			"label",
			"placeholder",
			"min",
			"max",
			"isDateDisabled",
			"weekStartsOn",
			"locale",
			"id",
		],
		"root" as DatePickerSlot,
	);
	const open = signal(false);
	const id = createId("datepicker", props.id);
	let host: HTMLElement | undefined;
	const focusTrigger = () => host?.querySelector<HTMLElement>("[data-datepicker-trigger]")?.focus();

	watchClickOutside(
		() => open(),
		() => host,
		() => open.set(false),
	);
	watchEscape(
		() => open(),
		() => {
			open.set(false);
			focusTrigger();
		},
	);

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				host = el;
			}}
			id={props.id}
			class={slot.class("root", "a-datepicker")}
			style={slot.style("root")}
			data-a-datepicker={id}
			data-state={open() ? "open" : "closed"}
		>
			<Show when={props.label}>
				<span id={`${id}-label`} class={slot.class("label", "a-label")} style={slot.style("label")}>
					{props.label}
				</span>
			</Show>
			<button
				type="button"
				data-datepicker-trigger=""
				class={slot.class("trigger", "a-datepicker-trigger", "a-input")}
				style={slot.style("trigger")}
				aria-expanded={open()}
				aria-haspopup="dialog"
				aria-controls={`${id}-dropdown`}
				aria-labelledby={props.label ? `${id}-label ${id}-value` : undefined}
				onClick={() => open.set(!open())}
			>
				<span id={`${id}-value`} class={slot.class("value")} style={slot.style("value")}>
					{props.value || props.placeholder || "Pick a date"}
				</span>
				<Icon name="calendar" size={16} />
			</button>
			<Show when={open()} fallback={null}>
				<div
					class={slot.class("dropdown", "a-datepicker-dropdown")}
					style={slot.style("dropdown")}
					id={`${id}-dropdown`}
					role="dialog"
					aria-label="Choose date"
				>
					<Calendar
						class={slot.class("calendar")}
						value={props.value}
						min={props.min}
						max={props.max}
						isDateDisabled={props.isDateDisabled}
						weekStartsOn={props.weekStartsOn}
						locale={props.locale}
						autoFocus
						onChange={(iso) => {
							props.onChange?.(iso);
							open.set(false);
							focusTrigger();
						}}
					/>
				</div>
			</Show>
		</div>
	);
}

export type TableSectionProps = BaseProps & {
	children?: unknown;
};

export type TableCellProps = TableSectionProps & {
	colspan?: number | string | undefined;
	rowspan?: number | string | undefined;
	scope?: "row" | "col" | "rowgroup" | "colgroup" | undefined;
	headers?: string | undefined;
	abbr?: string | undefined;
};

/** Table head section. */
export function Thead(input: TableSectionProps) {
	const [props, rest, slot] = setup("Thead", input, {}, ["children"]);
	return (
		<thead {...rest} class={slot.class("root", "a-thead")} style={slot.style("root")}>
			{props.children}
		</thead>
	);
}

/** Table body section. */
export function Tbody(input: TableSectionProps) {
	const [props, rest, slot] = setup("Tbody", input, {}, ["children"]);
	return (
		<tbody {...rest} class={slot.class("root", "a-tbody")} style={slot.style("root")}>
			{props.children}
		</tbody>
	);
}

/** Table footer section. */
export function Tfoot(input: TableSectionProps) {
	const [props, rest, slot] = setup("Tfoot", input, {}, ["children"]);
	return (
		<tfoot {...rest} class={slot.class("root", "a-tfoot")} style={slot.style("root")}>
			{props.children}
		</tfoot>
	);
}

/** Table row (clickable when `onClick` is set). */
export function Tr(input: TableSectionProps & { onClick?: ((e: MouseEvent) => void) | undefined }) {
	const [props, rest, slot] = setup("Tr", input, {}, ["children"]);
	return (
		<tr {...rest} class={slot.class("root", "a-tr")} style={slot.style("root")}>
			{props.children}
		</tr>
	);
}

/** Table header cell. */
export function Th(input: TableCellProps) {
	const [props, rest, slot] = setup("Th", input, {}, ["children"]);
	return (
		<th {...rest} class={slot.class("root", "a-th")} style={slot.style("root")}>
			{props.children}
		</th>
	);
}

/** Table data cell. */
export function Td(input: TableCellProps) {
	const [props, rest, slot] = setup("Td", input, {}, ["children"]);
	return (
		<td {...rest} class={slot.class("root", "a-td")} style={slot.style("root")}>
			{props.children}
		</td>
	);
}
