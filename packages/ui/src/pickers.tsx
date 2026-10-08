import { For, Show } from "@arachnejs/render";
import { effect, signal } from "@arachnejs/signals";
import { watchClickOutside } from "./click-outside.ts";
import { autoPosition } from "./floating.ts";
import { whenConnected } from "./focus.ts";
import { highlightCode } from "./highlight.ts";
import { Icon } from "./icons.tsx";
import { prefersReducedMotion } from "./motion.ts";
import { type RadiusName, resolveRadius } from "./palette.ts";
import { type SlotProps, setup } from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

function pad(n: number): string {
	return n < 10 ? `0${n}` : String(n);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type PanelSlot = "root" | "header" | "title" | "grid" | "cell";

export type MonthPickerProps = SlotProps<PanelSlot> & {
	/** YYYY-MM */
	value?: string | undefined;
	/** Called with the picked month as `YYYY-MM`. */
	onChange?: ((ym: string) => void) | undefined;
	/** Month labels (default English short names). */
	monthLabels?: string[] | undefined;
};

/** Month/year picker. Slots: `root` `header` `title` `grid` `cell`. */
export function MonthPicker(input: MonthPickerProps) {
	const [props, rest, slot] = setup(
		"MonthPicker",
		input,
		{},
		["value", "onChange", "monthLabels"],
		"root" as PanelSlot,
	);
	const valueYear = () => (props.value ? Number(props.value.slice(0, 4)) : Number.NaN);
	const year = signal(Number.isFinite(valueYear()) ? valueYear() : new Date().getFullYear());
	// Follow the controlled value when it moves to another year.
	effect(() => {
		const y = valueYear();
		if (Number.isFinite(y)) year.set(y);
	});
	const labels = () => props.monthLabels ?? MONTHS;

	return (
		<div
			{...rest}
			class={slot.class("root", "a-month-picker", "a-picker-panel")}
			style={slot.style("root")}
		>
			<div class={slot.class("header", "a-picker-header")}>
				<ActionIcon label="Previous year" size="sm" onClick={() => year.set(year() - 1)}>
					<Icon name="chevron-left" size={14} />
				</ActionIcon>
				<span class={slot.class("title", "a-picker-title")} aria-live="polite">
					{year()}
				</span>
				<ActionIcon label="Next year" size="sm" onClick={() => year.set(year() + 1)}>
					<Icon name="chevron-right" size={14} />
				</ActionIcon>
			</div>
			<div class={slot.class("grid", "a-month-grid")}>
				<For each={MONTHS.map((_, i) => i)}>
					{(i) => {
						const ym = () => `${year()}-${pad(i + 1)}`;
						const active = () => props.value === ym();
						return (
							<button
								type="button"
								class={slot.class("cell", "a-month-cell", active() && "a-month-cell-active")}
								aria-pressed={active()}
								data-state={active() ? "active" : "idle"}
								onClick={() => props.onChange?.(ym())}
							>
								{labels()[i] ?? MONTHS[i]}
							</button>
						);
					}}
				</For>
			</div>
		</div>
	);
}

export type DateRange = {
	/** First day, `YYYY-MM-DD`. */
	start?: string | undefined;
	/** Last day, `YYYY-MM-DD` (unset while the second click is pending). */
	end?: string | undefined;
};

export type DateRangePickerSlot = "root" | "trigger" | "summary" | "dropdown" | "cell";

export type DateRangePickerProps = SlotProps<DateRangePickerSlot> & {
	/** Selected range (controlled). */
	value: DateRange;
	/** Called after each pick: first with `start` only, then with both ends. */
	onChange: (range: DateRange) => void;
	/** Trigger text when nothing is picked. */
	placeholder?: string | undefined;
	/** First day of the week: 0 Sunday (default) … 6 Saturday. */
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | undefined;
	/** Locale for the month, weekday names and the dates shown (default: the browser's). */
	locale?: string | undefined;
};

/** 4 Jan 2026 is a Sunday: the base for naming weekdays in a locale. */
const RANGE_SUNDAY = new Date(2026, 0, 4);
const isoToDate = (iso: string) => {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};
const localIso = (date: Date) =>
	`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Two-step date range picker (start → end).
 * Slots: `root` `trigger` `summary` `dropdown` `cell`. State: `data-state`.
 */
export function DateRangePicker(input: DateRangePickerProps) {
	const [props, rest, slot] = setup(
		"DateRangePicker",
		input,
		{},
		["value", "onChange", "placeholder", "weekStartsOn", "locale"],
		"root" as DateRangePickerSlot,
	);
	const weekStart = () => props.weekStartsOn ?? 0;
	const dayName = (iso: string) =>
		isoToDate(iso).toLocaleDateString(props.locale, {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
		});
	const shortDate = (iso: string) =>
		isoToDate(iso).toLocaleDateString(props.locale, {
			day: "numeric",
			month: "short",
			year: "numeric",
		});
	const weekdays = () =>
		Array.from({ length: 7 }, (_, i) => {
			const day = new Date(RANGE_SUNDAY);
			day.setDate(RANGE_SUNDAY.getDate() + ((weekStart() + i) % 7));
			return day.toLocaleDateString(props.locale, { weekday: "short" });
		});
	const today = localIso(new Date());
	const open = signal(false);
	let root: HTMLElement | undefined;
	let trigger: HTMLElement | undefined;
	let dropdown: HTMLElement | undefined;
	// Fixed, collision-aware placement: escapes overflow clipping and stacking of later siblings.
	effect(() => {
		if (!open()) return;
		return whenConnected(
			() => dropdown,
			(el) =>
				trigger ? autoPosition(trigger, el, () => "bottom-start", { offset: 6 }) : undefined,
		);
	});
	const startDate = () => {
		const start = props.value.start;
		const [y, m] = (start ?? "").split("-").map(Number);
		return y && m ? new Date(y, m - 1, 1) : new Date();
	};
	const cursor = signal(startDate());

	watchClickOutside(
		() => open(),
		() => root,
		() => open.set(false),
	);

	const year = () => cursor().getFullYear();
	const month = () => cursor().getMonth();
	const label = () => cursor().toLocaleString(props.locale, { month: "long", year: "numeric" });

	const cells = () => {
		const first = new Date(year(), month(), 1);
		const startPad = (first.getDay() - weekStart() + 7) % 7;
		const daysInMonth = new Date(year(), month() + 1, 0).getDate();
		const out: Array<{ day: number | null; iso?: string }> = [];
		for (let i = 0; i < startPad; i++) out.push({ day: null });
		for (let d = 1; d <= daysInMonth; d++) {
			out.push({
				day: d,
				iso: `${year()}-${pad(month() + 1)}-${pad(d)}`,
			});
		}
		return out;
	};

	const pick = (iso: string) => {
		const { start, end } = props.value;
		if (!start || (start && end)) {
			props.onChange({ start: iso, end: undefined });
			return;
		}
		if (iso < start) props.onChange({ start: iso, end: start });
		else props.onChange({ start, end: iso });
		open.set(false);
	};

	const inRange = (iso: string) => {
		const { start, end } = props.value;
		if (!start || !end) return false;
		return iso >= start && iso <= end;
	};

	const summary = () => {
		const { start, end } = props.value;
		if (start && end)
			return start === end ? shortDate(start) : `${shortDate(start)} → ${shortDate(end)}`;
		if (start) return `${shortDate(start)} → …`;
		return props.placeholder ?? "Pick date range";
	};

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			class={slot.class("root", "a-daterange", "a-picker-panel")}
			style={slot.style("root")}
			data-state={open() ? "open" : "closed"}
		>
			<button
				ref={(el: HTMLElement) => {
					trigger = el;
				}}
				type="button"
				class={slot.class("trigger", "a-daterange-trigger")}
				aria-expanded={open()}
				onClick={() => {
					if (!open()) cursor.set(startDate());
					open.set(!open());
				}}
			>
				<span class={slot.class("summary", "a-daterange-summary")}>{summary()}</span>
				<Icon name="calendar" size={16} />
			</button>
			<Show when={open()} fallback={null}>
				<div
					ref={(el: HTMLElement) => {
						dropdown = el;
					}}
					class={slot.class("dropdown", "a-datepicker-dropdown a-calendar")}
					style={slot.style("dropdown")}
				>
					<div class="a-calendar-header">
						<ActionIcon
							label="Previous month"
							size="sm"
							onClick={() => cursor.set(new Date(year(), month() - 1, 1))}
						>
							<Icon name="chevron-left" size={14} />
						</ActionIcon>
						<span class="a-calendar-label">{label()}</span>
						<ActionIcon
							label="Next month"
							size="sm"
							onClick={() => cursor.set(new Date(year(), month() + 1, 1))}
						>
							<Icon name="chevron-right" size={14} />
						</ActionIcon>
					</div>
					<div class="a-calendar-weekdays" aria-hidden="true">
						{weekdays().map((name) => (
							<span class="a-calendar-weekday">{name}</span>
						))}
					</div>
					<div class="a-calendar-grid">
						{cells().map((cell) =>
							cell.day == null ? (
								<span class="a-calendar-cell a-calendar-empty" />
							) : (
								<button
									type="button"
									class={slot.class(
										"cell",
										"a-calendar-cell",
										(props.value.start === cell.iso || props.value.end === cell.iso) &&
											"a-calendar-cell-active",
										cell.iso && inRange(cell.iso) && "a-calendar-cell-range",
										cell.iso === today && "a-calendar-cell-today",
									)}
									aria-label={cell.iso ? dayName(cell.iso) : undefined}
									aria-current={cell.iso === today ? "date" : undefined}
									data-date={cell.iso}
									aria-pressed={props.value.start === cell.iso || props.value.end === cell.iso}
									onClick={() => cell.iso && pick(cell.iso)}
								>
									{cell.day}
								</button>
							),
						)}
					</div>
				</div>
			</Show>
		</div>
	);
}

export type TimePickerSlot = "root" | "header" | "value" | "column" | "cell";

export type TimePickerProps = SlotProps<TimePickerSlot> & {
	/** HH:MM */
	value?: string | undefined;
	/** Called with the picked time as `HH:MM`. */
	onChange?: ((time: string) => void) | undefined;
	/** Minute options' interval. */
	minutesStep?: number | undefined;
};

/** Hours/minutes picker. Slots: `root` `header` `value` `column` `cell`. */
export function TimePicker(input: TimePickerProps) {
	const [props, rest, slot] = setup(
		"TimePicker",
		input,
		{},
		["value", "onChange", "minutesStep"],
		"root" as TimePickerSlot,
	);
	const step = () => {
		const n = Math.floor(props.minutesStep ?? 5);
		return n >= 1 && n <= 60 ? n : 5;
	};
	let root: HTMLElement | undefined;
	const parsed = (): { h: number; m: number } => {
		const parts = (props.value ?? "12:00").split(":");
		const h = Number(parts[0]);
		const m = Number(parts[1]);
		return {
			h: Number.isFinite(h) ? h : 0,
			m: Number.isFinite(m) ? m : 0,
		};
	};
	const emit = (h: number, m: number) => props.onChange?.(`${pad(h)}:${pad(m)}`);

	const hours = Array.from({ length: 24 }, (_, i) => i);
	const minutes = () => Array.from({ length: Math.ceil(60 / step()) }, (_, i) => i * step());
	/** Minute cell to highlight: the exact value, else the nearest step below. */
	const activeMinute = () => Math.floor(parsed().m / step()) * step();

	effect(() => {
		const h = parsed().h;
		const m = activeMinute();
		const frame = requestAnimationFrame(() => {
			if (!root) return;
			const scrollCell = (sel: string) => {
				const el = root?.querySelector(sel) as HTMLElement | null;
				const col = el?.parentElement;
				if (!el || !col) return;
				col.scrollTop = el.offsetTop - col.clientHeight / 2 + el.offsetHeight / 2;
			};
			scrollCell(`[data-a-hour="${h}"]`);
			scrollCell(`[data-a-minute="${m}"]`);
		});
		return () => cancelAnimationFrame(frame);
	});

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			class={slot.class("root", "a-time-picker", "a-picker-panel")}
			style={slot.style("root")}
		>
			<div class={slot.class("header", "a-picker-header a-time-header")}>
				<span class={slot.class("value", "a-picker-title a-time-value")} aria-live="polite">
					{pad(parsed().h)}:{pad(parsed().m)}
				</span>
			</div>
			<div class="a-time-columns">
				{/* biome-ignore lint/a11y/useSemanticElements: fieldset would reset the scroll-column layout */}
				<div class={slot.class("column", "a-time-col")} role="group" aria-label="Hours">
					{hours.map((n) => (
						<button
							type="button"
							data-a-hour={n}
							aria-pressed={parsed().h === n}
							class={slot.class("cell", "a-time-cell", parsed().h === n && "a-time-cell-active")}
							onClick={() => emit(n, parsed().m)}
						>
							{pad(n)}
						</button>
					))}
				</div>
				{/* biome-ignore lint/a11y/useSemanticElements: fieldset would reset the scroll-column layout */}
				<div class={slot.class("column", "a-time-col")} role="group" aria-label="Minutes">
					{minutes().map((n) => (
						<button
							type="button"
							data-a-minute={n}
							aria-pressed={activeMinute() === n}
							class={slot.class(
								"cell",
								"a-time-cell",
								activeMinute() === n && "a-time-cell-active",
							)}
							onClick={() => emit(parsed().h, n)}
						>
							{pad(n)}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}

export type SemiCircleProgressSlot = "root" | "track" | "bar" | "label";

export type SemiCircleProgressProps = SlotProps<SemiCircleProgressSlot> & {
	/** Progress in percent (0–100). */
	value: number;
	/** Width in pixels. */
	size?: number | undefined;
	/** Arc stroke width in pixels. */
	thickness?: number | undefined;
	/** Content in the middle, e.g. `64%`. */
	label?: unknown;
};

/** Half-ring gauge. Slots: `root` `track` `bar` `label`. Colour via `--a-semi-color`. */
export function SemiCircleProgress(input: SemiCircleProgressProps) {
	const [props, rest, slot] = setup(
		"SemiCircleProgress",
		input,
		{},
		["value", "size", "thickness", "label"],
		"root" as SemiCircleProgressSlot,
	);
	const size = () => props.size ?? 120;
	const thickness = () => props.thickness ?? 10;
	const r = () => (size() - thickness()) / 2;
	const c = () => Math.PI * r();
	const pct = () => (Number.isFinite(props.value) ? Math.max(0, Math.min(100, props.value)) : 0);
	const offset = () => c() - (pct() / 100) * c();
	const height = () => size() / 2 + thickness();
	const arc = () =>
		`M ${thickness() / 2} ${size() / 2} A ${r()} ${r()} 0 0 1 ${size() - thickness() / 2} ${size() / 2}`;
	return (
		<div
			aria-label="Progress"
			{...rest}
			class={slot.class("root", "a-semi")}
			style={slot.style("root", { width: `${size()}px`, height: `${height()}px` })}
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={Math.round(pct())}
		>
			<svg
				width={size()}
				height={height()}
				viewBox={`0 0 ${size()} ${height()}`}
				aria-hidden="true"
			>
				<path
					class={slot.class("track", "a-semi-track")}
					d={arc()}
					fill="none"
					stroke-width={thickness()}
				/>
				<path
					class={slot.class("bar", "a-semi-bar")}
					d={arc()}
					fill="none"
					stroke-width={thickness()}
					stroke-dasharray={String(c())}
					stroke-dashoffset={String(offset())}
				/>
			</svg>
			{props.label ? <div class={slot.class("label", "a-semi-label")}>{props.label}</div> : null}
		</div>
	);
}

export type SparklineProps = SlotProps<"root" | "line"> & {
	/** Values to plot, oldest first. */
	data: number[];
	/** Width in pixels. */
	width?: number | undefined;
	/** Height in pixels. */
	height?: number | undefined;
	/** Accessible summary; the chart is decorative (`aria-hidden`) without one. */
	label?: string | undefined;
};

/** Inline trend line (`currentColor`). Slots: `root` `line`. */
export function Sparkline(input: SparklineProps) {
	const [props, rest, slot] = setup(
		"Sparkline",
		input,
		{},
		["data", "width", "height", "label"],
		"root" as "root" | "line",
	);
	const w = () => props.width ?? 120;
	const h = () => props.height ?? 32;
	const pts = () => {
		const finite = props.data.filter((v) => Number.isFinite(v));
		const data = finite.length ? finite : [0];
		const min = Math.min(...data);
		const max = Math.max(...data);
		const span = max - min || 1;
		return data
			.map((v, i) => {
				const x = (i / Math.max(1, data.length - 1)) * w();
				const y = h() - ((v - min) / span) * (h() - 4) - 2;
				return `${x},${y}`;
			})
			.join(" ");
	};

	return (
		<svg
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-sparkline")}
			style={slot.style("root")}
			width={w()}
			height={h()}
			viewBox={`0 0 ${w()} ${h()}`}
			role={props.label ? "img" : undefined}
			aria-hidden={props.label ? undefined : "true"}
		>
			<polyline
				class={slot.class("line", "a-sparkline-line")}
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				points={pts()}
			/>
		</svg>
	);
}

export type CodeBlockSlot = "root" | "bar" | "language" | "copy" | "pre" | "code";

export type CodeBlockProps = SlotProps<CodeBlockSlot> & {
	/** Source code to highlight and copy. */
	code: string;
	/** Language for highlighting, shown in the header. */
	language?: string | undefined;
	/** Corner radius: `"none"` | `"sm"` | `"lg"` or any CSS length (default: the theme radius). */
	radius?: RadiusName | (string & {}) | undefined;
	/** Copy button text. */
	copyLabel?: string | undefined;
	/** Copy button text shown briefly after copying. */
	copiedLabel?: string | undefined;
};

const COPIED_MS = 1200;

/** Highlighted code with copy button. Slots: `root` `bar` `language` `copy` `pre` `code`. */
export function CodeBlock(input: CodeBlockProps) {
	const [props, rest, slot] = setup(
		"CodeBlock",
		input,
		{ language: "tsx" },
		["code", "language", "radius", "copyLabel", "copiedLabel"],
		"root" as CodeBlockSlot,
	);
	const radiusStyle = () =>
		props.radius === undefined
			? undefined
			: { "--a-codeblock-radius": resolveRadius(props.radius) };
	const copied = signal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	effect(() => () => clearTimeout(timer));
	return (
		<div
			{...rest}
			class={slot.class("root", "a-codeblock")}
			style={slot.style("root", radiusStyle())}
			data-radius={props.radius}
		>
			<div class={slot.class("bar", "a-codeblock-bar")}>
				<span class={slot.class("language", "a-codeblock-lang")}>{props.language}</span>
				<button
					type="button"
					class={slot.class("copy", "a-codeblock-copy")}
					data-state={copied() ? "copied" : "idle"}
					onClick={async () => {
						try {
							await navigator.clipboard.writeText(props.code);
							copied.set(true);
							clearTimeout(timer);
							timer = setTimeout(() => copied.set(false), COPIED_MS);
						} catch {
							// Clipboard can be denied (permissions / insecure context); the button just stays idle.
						}
					}}
				>
					{copied() ? (props.copiedLabel ?? "Copied") : (props.copyLabel ?? "Copy")}
				</button>
			</div>
			{/* Focusable so keyboard users can scroll long lines. */}
			<pre class={slot.class("pre", "a-codeblock-pre")} style={slot.style("pre")} tabindex="0">
				<code
					class={slot.class("code", "a-codeblock-code", `language-${props.language}`)}
					innerHTML={highlightCode(props.code, props.language ?? "tsx")}
				/>
			</pre>
		</div>
	);
}

export type ToTopProps = SlotProps<"root"> & {
	/** Scroll distance (px) before the button appears (default 320). */
	offset?: number | undefined;
	/** Accessible name of the button. */
	label?: string | undefined;
	/** Button content (default: an up arrow). */
	children?: unknown;
};

/** Scroll-to-top control (UIkit totop). Slots: `root`. */
export function ToTop(input: ToTopProps) {
	const [props, rest, slot] = setup("ToTop", input, {}, ["offset", "label", "children"]);
	const visible = signal(false);
	effect(() => {
		const onScroll = () => visible.set(window.scrollY > (props.offset ?? 320));
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});

	return (
		<Show when={visible()} fallback={null}>
			<button
				type="button"
				aria-label={props.label ?? "Back to top"}
				{...rest}
				class={slot.class("root", "a-totop")}
				style={slot.style("root")}
				onClick={() =>
					window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" })
				}
			>
				{props.children ?? <Icon name="chevron-up" />}
			</button>
		</Show>
	);
}

export type CountdownSlot = "root" | "unit" | "value" | "suffix";

export type CountdownProps = SlotProps<CountdownSlot> & {
	/** Absolute target timestamp (ms). */
	to: number;
	/** Unit suffixes (default d/h/m/s). */
	units?: { d: string; h: string; m: string; s: string } | undefined;
};

const UNITS = { d: "d", h: "h", m: "m", s: "s" } as const;

/** Live countdown. Slots: `root` `unit` `value` `suffix`. State: `data-done`. */
export function Countdown(input: CountdownProps) {
	const [props, rest, slot] = setup(
		"Countdown",
		input,
		{},
		["to", "units"],
		"root" as CountdownSlot,
	);
	const now = signal(Date.now());
	effect(() => {
		const t = window.setInterval(() => now.set(Date.now()), 1000);
		return () => window.clearInterval(t);
	});

	const left = () => Math.max(0, props.to - now());
	const parts = () => {
		const s = Math.floor(left() / 1000);
		return {
			d: Math.floor(s / 86400),
			h: Math.floor((s % 86400) / 3600),
			m: Math.floor((s % 3600) / 60),
			s: s % 60,
		};
	};

	return (
		<div
			{...rest}
			class={slot.class("root", "a-countdown")}
			style={slot.style("root")}
			role="timer"
			data-done={left() === 0 ? "" : undefined}
		>
			<For each={["d", "h", "m", "s"] as const}>
				{(unit) => (
					<span class={slot.class("unit", "a-countdown-unit")} data-unit={unit}>
						<strong class={slot.class("value", "a-countdown-value")}>{parts()[unit]}</strong>
						<span class={slot.class("suffix", "a-countdown-suffix")}>
							{(props.units ?? UNITS)[unit]}
						</span>
					</span>
				)}
			</For>
		</div>
	);
}
