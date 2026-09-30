import { For, mergeProps, Show } from "@arachnejs/render";
import { effect, signal, untrack } from "@arachnejs/signals";
import { Button } from "./button.tsx";
import { type DialogBaseProps, DialogFrame } from "./dialog.tsx";
import type { AlertTone } from "./feedback.tsx";
import { CloseButton, Icon, type IconName } from "./icons.tsx";
import { prefersReducedMotion } from "./motion.ts";
import { Avatar } from "./presence.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type BottomSheetProps = DialogBaseProps;

/**
 * Mobile bottom sheet (UIkit / Mantine Drawer bottom). Built on the shared
 * dialog frame: focus trap, Escape (topmost layer), scroll lock, exit motion.
 * Slots match {@link DialogBaseProps} (`panel` is the host); theme key `BottomSheet`.
 */
export function BottomSheet(props: BottomSheetProps) {
	const frame = mergeProps(props, {
		get label() {
			return props.label ?? (typeof props.title === "string" ? props.title : "Sheet");
		},
		get children() {
			return [<div class="a-sheet-handle" aria-hidden="true" />, props.children];
		},
	}) as DialogBaseProps;
	return DialogFrame(frame, {
		name: "BottomSheet",
		base: "a-drawer",
		modifiers: () => ["a-drawer-bottom", "a-bottom-sheet"],
		data: () => ({ "data-side": "bottom" }),
	});
}

export type BannerSlot = "root" | "body" | "title" | "content" | "action" | "close";

export type BannerProps = SlotProps<BannerSlot> & {
	/** Colour and icon. */
	tone?: AlertTone | undefined;
	/** Bold first line. */
	title?: unknown;
	/** Shows a close button; called when it is pressed. */
	onClose?: (() => void) | undefined;
	/** Banner text. */
	children?: unknown;
	/** Call to action at the end, e.g. a `Button`. */
	action?: unknown;
};

/** Full-width page banner. Slots: `root` `body` `title` `content` `action` `close`. */
export function Banner(input: BannerProps) {
	const [props, rest, slot] = setup(
		"Banner",
		input,
		{},
		["tone", "title", "onClose", "children", "action"],
		"root" as BannerSlot,
	);
	const assertive = () => props.tone === "danger" || props.tone === "warning";
	return (
		<div
			{...rest}
			class={slot.class("root", "a-banner", props.tone && `a-banner-${props.tone}`)}
			style={slot.style("root")}
			data-tone={props.tone}
			role={assertive() ? "alert" : "status"}
		>
			<div class={slot.class("body", "a-banner-body")} style={slot.style("body")}>
				<Show when={props.title}>
					<strong class={slot.class("title", "a-banner-title")}>{props.title}</strong>
				</Show>
				<span class={slot.class("content", "a-banner-content")}>{props.children}</span>
			</div>
			<Show when={props.action}>
				<div class={slot.class("action", "a-banner-action")}>{props.action}</div>
			</Show>
			<Show when={props.onClose}>
				<CloseButton class={slot.class("close")} onClick={() => props.onClose?.()} />
			</Show>
		</div>
	);
}

export type StatusDotProps = BaseProps & {
	/** Dot colour. */
	tone?: "neutral" | "accent" | "success" | "warning" | "danger" | undefined;
	/** Animate a pulse ring (for live states). */
	pulse?: boolean | undefined;
	/** Accessible name; without it the dot is decorative (`aria-hidden`). */
	label?: string | undefined;
};

/**
 * Small status indicator (online, busy, …), optionally pulsing.
 * Slots: `root`. State: `data-tone`.
 */
export function StatusDot(input: StatusDotProps) {
	const [props, rest, slot] = setup("StatusDot", input, { tone: "neutral" }, [
		"tone",
		"pulse",
		"label",
	]);
	const className = () =>
		slot.class(
			"root",
			"a-status-dot",
			`a-status-dot-${props.tone ?? "neutral"}`,
			props.pulse && "a-status-dot-pulse",
		);
	return (
		<Show
			when={props.label}
			fallback={
				<span
					{...rest}
					class={className()}
					style={slot.style("root")}
					data-tone={props.tone}
					aria-hidden="true"
				/>
			}
		>
			<span
				aria-label={props.label}
				{...rest}
				class={className()}
				style={slot.style("root")}
				data-tone={props.tone}
				role="img"
			/>
		</Show>
	);
}

export type PageHeaderSlot =
	| "root"
	| "crumb"
	| "row"
	| "text"
	| "title"
	| "description"
	| "actions";

export type PageHeaderProps = SlotProps<PageHeaderSlot> & {
	/** Page title (rendered as `<h1>`). */
	title: unknown;
	/** Text under the title. */
	description?: unknown;
	/** Breadcrumb above the title. */
	breadcrumb?: unknown;
	/** Buttons aligned to the end of the header. */
	actions?: unknown;
};

/**
 * Page title block with breadcrumb, description and actions.
 * Slots: `root` `crumb` `row` `text` `title` `description` `actions`.
 */
export function PageHeader(input: PageHeaderProps) {
	const [props, rest, slot] = setup(
		"PageHeader",
		input,
		{},
		["title", "description", "breadcrumb", "actions"],
		"root" as PageHeaderSlot,
	);
	return (
		<header {...rest} class={slot.class("root", "a-page-header")} style={slot.style("root")}>
			<Show when={props.breadcrumb}>
				<div class={slot.class("crumb", "a-page-header-crumb")}>{props.breadcrumb}</div>
			</Show>
			<div class={slot.class("row", "a-page-header-row")} style={slot.style("row")}>
				<div class={slot.class("text", "a-page-header-text")}>
					<h2 class={slot.class("title", "a-page-header-title")} style={slot.style("title")}>
						{props.title}
					</h2>
					<Show when={props.description}>
						<p class={slot.class("description", "a-page-header-desc")}>{props.description}</p>
					</Show>
				</div>
				<Show when={props.actions}>
					<div class={slot.class("actions", "a-page-header-actions")} style={slot.style("actions")}>
						{props.actions}
					</div>
				</Show>
			</div>
		</header>
	);
}

export type UserButtonSlot = "root" | "avatar" | "text" | "name" | "email" | "chevron";

export type UserButtonProps = SlotProps<UserButtonSlot> & {
	/** User's name (also used for the avatar initials). */
	name: string;
	/** Secondary line under the name. */
	email?: string | undefined;
	/** Avatar image URL. */
	src?: string | undefined;
	/** Called when the button is pressed, e.g. to open an account menu. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Trailing content (default chevron); `null` hides it. */
	end?: unknown;
};

/**
 * Button showing a user's avatar, name and email.
 * Slots: `root` `avatar` `text` `name` `email` `chevron`.
 */
export function UserButton(input: UserButtonProps) {
	const [props, rest, slot] = setup(
		"UserButton",
		input,
		{},
		["name", "email", "src", "onClick", "end"],
		"root" as UserButtonSlot,
	);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-user-btn")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			<Avatar name={props.name} src={props.src} size="sm" class={slot.class("avatar")} />
			<span class={slot.class("text", "a-user-btn-text")}>
				<span class={slot.class("name", "a-user-btn-name")}>{props.name}</span>
				<Show when={props.email}>
					<span class={slot.class("email", "a-user-btn-email")}>{props.email}</span>
				</Show>
			</span>
			<Show when={props.end !== null}>
				<span class={slot.class("chevron", "a-user-btn-chevron")} aria-hidden="true">
					{props.end ?? <Icon name="chevron-down" size={14} />}
				</span>
			</Show>
		</button>
	);
}

export type ThemeToggleProps = BaseProps & {
	/** Current theme. */
	value: "light" | "dark";
	/** Called with the theme to switch to; apply it yourself (e.g. `data-theme` on `<html>`). */
	onChange: (theme: "light" | "dark") => void;
};

/**
 * Toggle between light and dark themes.
 * Slots: `root`. State: `data-theme-value`. Apply the theme yourself in `onChange` (e.g. set `data-theme` on `<html>`).
 */
export function ThemeToggle(input: ThemeToggleProps) {
	const [props, rest, slot] = setup("ThemeToggle", input, {}, ["value", "onChange"]);
	const dark = () => props.value === "dark";
	return (
		<button
			aria-label={dark() ? "Switch to light" : "Switch to dark"}
			{...rest}
			type="button"
			class={slot.class("root", "a-theme-toggle")}
			style={slot.style("root")}
			data-theme-value={props.value}
			aria-pressed={dark()}
			onClick={() => props.onChange(dark() ? "light" : "dark")}
		>
			<Icon name={dark() ? "sun" : "moon"} size={16} />
		</button>
	);
}

export type ChoiceCardSlot = "root" | "input" | "body" | "label" | "description";

export type ChoiceCardProps = SlotProps<ChoiceCardSlot> & {
	/** Whether this card is selected (controlled). */
	checked: boolean;
	/** Card title. */
	label: unknown;
	/** Text under the title. */
	description?: unknown;
	/** Disables the card. */
	disabled?: boolean | undefined;
	/** Called with the new checked state. */
	onChange: (checked: boolean) => void;
	/** `radio` for one-of-many cards (share a `name`), `checkbox` for independent ones. */
	type?: "radio" | "checkbox" | undefined;
	/** Input name; cards with the same name form a radio group. */
	name?: string | undefined;
	/** Value submitted with the form. */
	value?: string | undefined;
};

/** Selectable card wrapping a native radio/checkbox. Slots: `root` `input` `body` `label` `description`. */
export function ChoiceCard(input: ChoiceCardProps) {
	const [props, rest, slot] = setup(
		"ChoiceCard",
		input,
		{ type: "radio" },
		["checked", "label", "description", "disabled", "onChange", "type", "name", "value"],
		"root" as ChoiceCardSlot,
	);
	return (
		<label
			{...rest}
			class={slot.class(
				"root",
				"a-choice-card",
				props.checked && "a-choice-card-checked",
				props.disabled && "a-choice-card-disabled",
			)}
			style={slot.style("root")}
			data-state={props.checked ? "checked" : "unchecked"}
		>
			<input
				type={props.type ?? "radio"}
				class={slot.class("input", "a-choice-card-input")}
				name={props.name}
				value={props.value}
				checked={props.checked}
				disabled={props.disabled}
				onChange={(e: Event) => {
					const el = e.target as HTMLInputElement;
					props.onChange(el.checked);
					// Controlled: snap back if the parent kept the old value.
					if (el.checked !== props.checked) el.checked = props.checked;
				}}
			/>
			<span class={slot.class("body", "a-choice-card-body")}>
				<span class={slot.class("label", "a-choice-card-label")}>{props.label}</span>
				<Show when={props.description}>
					<span class={slot.class("description", "a-choice-card-desc")}>{props.description}</span>
				</Show>
			</span>
		</label>
	);
}

export type ChatBubbleSlot = "root" | "meta" | "author" | "body";

export type ChatBubbleProps = SlotProps<ChatBubbleSlot> & {
	/** Who sent it: `me` (aligned right, accent) or `them`. */
	from: "me" | "them";
	/** Sender name above the bubble. */
	author?: string | undefined;
	/** Small line under the bubble, e.g. the time. */
	meta?: string | undefined;
	/** Message content. */
	children?: unknown;
};

/**
 * Chat message bubble, aligned by sender.
 * Slots: `root` `meta` `author` `body`. State: `data-from`.
 */
export function ChatBubble(input: ChatBubbleProps) {
	const [props, rest, slot] = setup(
		"ChatBubble",
		input,
		{},
		["from", "author", "meta", "children"],
		"root" as ChatBubbleSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-chat-bubble",
				props.from === "me" ? "a-chat-bubble-me" : "a-chat-bubble-them",
			)}
			style={slot.style("root")}
			data-from={props.from}
		>
			<Show when={props.author || props.meta}>
				<div class={slot.class("meta", "a-chat-bubble-meta")}>
					<Show when={props.author}>
						<strong class={slot.class("author")}>{props.author}</strong>
					</Show>
					<Show when={props.meta}>
						<span>{props.meta}</span>
					</Show>
				</div>
			</Show>
			<div class={slot.class("body", "a-chat-bubble-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</div>
	);
}

export type TypingIndicatorProps = BaseProps & {
	/** Accessible name (default "Typing"). */
	label?: string | undefined;
};

/**
 * Animated "someone is typing" indicator.
 * Slots: `root`.
 */
export function TypingIndicator(input: TypingIndicatorProps) {
	const [props, rest, slot] = setup("TypingIndicator", input, {}, ["label"]);
	return (
		<div
			aria-label={props.label ?? "Typing"}
			{...rest}
			class={slot.class("root", "a-typing")}
			style={slot.style("root")}
			role="status"
		>
			<span />
			<span />
			<span />
		</div>
	);
}

export type JsonViewerProps = BaseProps & {
	/** Any JSON-serializable value to show, pretty-printed. */
	value: unknown;
};

/** Pretty-print JSON; tolerates `undefined`, BigInt and circular references. */
export function stringifyJson(value: unknown): string {
	if (value === undefined) return "undefined";
	const seen = new WeakSet<object>();
	try {
		return (
			JSON.stringify(
				value,
				(_key, v: unknown) => {
					if (typeof v === "bigint") return `${v}n`;
					if (typeof v === "function")
						return `[Function ${(v as { name?: string }).name || "anonymous"}]`;
					if (v && typeof v === "object") {
						if (seen.has(v)) return "[Circular]";
						seen.add(v);
					}
					return v;
				},
				2,
			) ?? String(value)
		);
	} catch {
		return String(value);
	}
}

/**
 * Pretty-printed JSON (handles undefined, circular references and BigInt).
 * Slots: `root`.
 */
export function JsonViewer(input: JsonViewerProps) {
	const [props, rest, slot] = setup("JsonViewer", input, {}, ["value"]);
	return (
		<pre {...rest} class={slot.class("root", "a-json-viewer")} style={slot.style("root")}>
			<code>{stringifyJson(props.value)}</code>
		</pre>
	);
}

export type RelativeTimeProps = BaseProps & {
	/** Absolute timestamp (ms). */
	value: number;
};

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const WEEK = 604800;

export function formatRelative(ms: number, now: number): string {
	if (!Number.isFinite(ms)) return "";
	const diff = Math.round((now - ms) / 1000);
	const abs = Math.abs(diff);
	const rtf =
		typeof Intl !== "undefined" && "RelativeTimeFormat" in Intl
			? new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
			: null;
	const unit = (n: number, u: Intl.RelativeTimeFormatUnit) =>
		rtf ? rtf.format(-n, u) : `${n}${u[0]} ago`;
	// Pick the unit from the rounded value so 59.9 minutes reads "1 hour", not "60 minutes".
	if (abs < MINUTE) return unit(diff, "second");
	if (Math.round(abs / MINUTE) < 60) return unit(Math.round(diff / MINUTE), "minute");
	if (Math.round(abs / HOUR) < 24) return unit(Math.round(diff / HOUR), "hour");
	if (Math.round(abs / DAY) < 7) return unit(Math.round(diff / DAY), "day");
	return unit(Math.round(diff / WEEK), "week");
}

/**
 * Relative time such as "5 minutes ago", with the full date in `title`.
 * Slots: `root`. Refreshes every 15s.
 */
export function RelativeTime(input: RelativeTimeProps) {
	const [props, rest, slot] = setup("RelativeTime", input, {}, ["value"]);
	const now = signal(Date.now());
	effect(() => {
		const t = window.setInterval(() => now.set(Date.now()), 15_000);
		return () => window.clearInterval(t);
	});
	const date = () => new Date(props.value);
	const valid = () => Number.isFinite(date().getTime());
	return (
		<time
			{...rest}
			class={slot.class("root", "a-relative-time")}
			style={slot.style("root")}
			dateTime={valid() ? date().toISOString() : undefined}
			title={valid() ? date().toLocaleString() : undefined}
		>
			{valid() ? formatRelative(props.value, now()) : "—"}
		</time>
	);
}

export type CountUpProps = BaseProps & {
	/** Number to count up to. */
	value: number;
	/** Animation length in milliseconds (`0` shows the value immediately). */
	duration?: number | undefined;
};

/** Animated number (rAF, eased); jumps straight to the value under reduced motion. Slots: `root`. */
export function CountUp(input: CountUpProps) {
	const [props, rest, slot] = setup("CountUp", input, {}, ["value", "duration"]);
	const shown = signal(0);
	effect(() => {
		const target = props.value;
		const duration = prefersReducedMotion() ? 0 : (props.duration ?? 800);
		const from = untrack(() => shown());
		const start = performance.now();
		let raf = 0;
		if (!(duration > 0) || !Number.isFinite(target)) {
			shown.set(Number.isFinite(target) ? target : 0);
			return;
		}
		const tick = (t: number) => {
			const p = Math.min(1, Math.max(0, (t - start) / duration));
			const eased = 1 - (1 - p) ** 3;
			shown.set(Math.round(from + (target - from) * eased));
			if (p < 1) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	});
	return (
		<span {...rest} class={slot.class("root", "a-countup")} style={slot.style("root")}>
			{shown().toLocaleString()}
		</span>
	);
}

export type ScrollSpyItem = {
	/** Id of the section element on the page. */
	id: string;
	/** Link text. */
	label: unknown;
};

export type ScrollSpySlot = "root" | "item";

export type ScrollSpyProps = SlotProps<ScrollSpySlot> & {
	/** Sections to track, in page order. */
	items: ScrollSpyItem[];
	/** Pixels from the top at which a section counts as current. */
	offset?: number | undefined;
	/** Accessible name (default "On this page"). */
	label?: string | undefined;
};

/** Nearest scrollable ancestor of `el`, or `null` for the page itself. */
function scrollParent(el: HTMLElement): HTMLElement | null {
	for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
		const overflow = getComputedStyle(node).overflowY;
		if ((overflow === "auto" || overflow === "scroll") && node.scrollHeight > node.clientHeight)
			return node;
	}
	return null;
}

/** The last section scrolled past `offset` (or the last one once scrolled to the end). */
function activeSection(ids: string[], offset: number): string {
	const sections = ids.flatMap((id) => document.getElementById(id) ?? []);
	const first = sections[0];
	if (!first) return ids[0] ?? "";
	const container = scrollParent(first);
	const top = container ? container.getBoundingClientRect().top : 0;
	let current = first.id;
	for (const el of sections)
		if (el.getBoundingClientRect().top - top - offset <= 0) current = el.id;
	// Scrolled to the end: the last sections may never reach the top.
	const scroller = container ?? document.documentElement;
	const atEnd =
		scroller.scrollTop > 0 &&
		scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
	return atEnd ? (sections[sections.length - 1]?.id ?? current) : current;
}

/**
 * Highlights the section currently in view, in the page or in the sections'
 * scroll container. Slots: `root` `item`.
 */
export function ScrollSpy(input: ScrollSpyProps) {
	const [props, rest, slot] = setup(
		"ScrollSpy",
		input,
		{ offset: 96 },
		["items", "offset", "label"],
		"root" as ScrollSpySlot,
	);
	const active = signal(untrack(() => props.items[0]?.id ?? ""));

	effect(() => {
		const ids = props.items.map((i) => i.id);
		const offset = props.offset ?? 96;
		const onScroll = () => active.set(activeSection(ids, offset));
		onScroll();
		// Capture: scroll events don't bubble, so this sees window *and* container scrolling.
		document.addEventListener("scroll", onScroll, { passive: true, capture: true });
		return () => document.removeEventListener("scroll", onScroll, { capture: true });
	});

	return (
		<nav
			aria-label={props.label ?? "On this page"}
			{...rest}
			class={slot.class("root", "a-scrollspy")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const current = () => active() === item.id;
					return (
						<button
							type="button"
							class={slot.class("item", "a-scrollspy-item", current() && "a-scrollspy-item-active")}
							style={slot.style("item")}
							aria-current={current() ? "location" : undefined}
							data-state={current() ? "active" : "inactive"}
							onClick={() => {
								active.set(item.id);
								document.getElementById(item.id)?.scrollIntoView({
									behavior: prefersReducedMotion() ? "auto" : "smooth",
									block: "start",
								});
							}}
						>
							{item.label}
						</button>
					);
				}}
			</For>
		</nav>
	);
}

export type BeforeAfterSlot = "root" | "image" | "overlay" | "range" | "handle";

export type BeforeAfterProps = SlotProps<BeforeAfterSlot> & {
	/** Image URL for the "before" state. */
	before: string;
	/** Image URL for the "after" state. */
	after: string;
	/** Alternative text for the "before" image. */
	beforeAlt?: string | undefined;
	/** Alternative text for the "after" image. */
	afterAlt?: string | undefined;
	/** Starting divider position in percent. */
	initial?: number | undefined;
	/** Accessible name for the slider (default "Compare"). */
	label?: string | undefined;
};

/** Image compare slider. Slots: `root` `image` `overlay` `range` `handle`. Position: `--a-compare-pos`. */
export function BeforeAfter(input: BeforeAfterProps) {
	const [props, rest, slot] = setup(
		"BeforeAfter",
		input,
		{},
		["before", "after", "beforeAlt", "afterAlt", "initial", "label"],
		"root" as BeforeAfterSlot,
	);
	const pos = signal(untrack(() => props.initial ?? 50));
	return (
		<div
			{...rest}
			class={slot.class("root", "a-compare")}
			style={slot.style("root", { "--a-compare-pos": `${pos()}%` })}
		>
			<img
				class={slot.class("image", "a-compare-img")}
				src={props.after}
				alt={props.afterAlt ?? "After"}
			/>
			<div
				class={slot.class("overlay", "a-compare-overlay")}
				style={slot.style("overlay", { "clip-path": `inset(0 ${100 - pos()}% 0 0)` })}
			>
				<img
					class={slot.class("image", "a-compare-img")}
					src={props.before}
					alt={props.beforeAlt ?? "Before"}
				/>
			</div>
			<input
				type="range"
				class={slot.class("range", "a-compare-range")}
				min={0}
				max={100}
				value={pos()}
				aria-label={props.label ?? "Compare"}
				onInput={(e: Event) => pos.set(Number((e.target as HTMLInputElement).value))}
			/>
			<div
				class={slot.class("handle", "a-compare-handle")}
				style={slot.style("handle", { left: `${pos()}%` })}
				aria-hidden="true"
			/>
		</div>
	);
}

export type LoadMoreSlot = "root" | "button" | "end";

export type LoadMoreProps = SlotProps<LoadMoreSlot> & {
	/** Show a spinner and disable the button. */
	loading?: boolean | undefined;
	/** Whether more items can load; shows `endLabel` when false. */
	hasMore?: boolean | undefined;
	/** Called when the user asks for more. */
	onLoad: () => void;
	/** Text when everything is loaded (default "You're all caught up"). */
	endLabel?: unknown;
	/** Button label. */
	children?: unknown;
};

/**
 * "Load more" button that shows loading and end-of-list states.
 * Slots: `root` `button` `end`. State: `data-state="idle|loading|done"`.
 */
export function LoadMore(input: LoadMoreProps) {
	const [props, rest, slot] = setup(
		"LoadMore",
		input,
		{},
		["loading", "hasMore", "onLoad", "endLabel", "children"],
		"root" as LoadMoreSlot,
	);
	const done = () => props.hasMore === false;
	return (
		<div
			aria-live="polite"
			{...rest}
			class={slot.class("root", done() ? "a-loadmore-end" : "a-loadmore")}
			style={slot.style("root")}
			data-state={done() ? "done" : props.loading ? "loading" : "idle"}
		>
			<Show
				when={!done()}
				fallback={
					<span class={slot.class("end")}>
						{props.endLabel ?? props.children ?? "You're all caught up"}
					</span>
				}
			>
				<Button
					variant="ghost"
					size="sm"
					class={slot.class("button")}
					loading={props.loading}
					onClick={() => props.onLoad()}
				>
					{props.children ?? "Load more"}
				</Button>
			</Show>
		</div>
	);
}

export type ActivityItemSlot = "root" | "icon" | "body" | "title" | "meta" | "content";

export type ActivityItemProps = SlotProps<ActivityItemSlot> & {
	/** Built-in icon name, or pass any node via `iconNode`. */
	icon?: IconName | undefined;
	/** Custom leading content instead of `icon`. */
	iconNode?: unknown;
	/** What happened. */
	title: unknown;
	/** Small line, e.g. the time. */
	meta?: unknown;
	/** Extra detail below the title. */
	children?: unknown;
};

/**
 * Activity feed entry with icon, title, meta and content.
 * Slots: `root` `icon` `body` `title` `meta` `content`.
 */
export function ActivityItem(input: ActivityItemProps) {
	const [props, rest, slot] = setup(
		"ActivityItem",
		input,
		{},
		["icon", "iconNode", "title", "meta", "children"],
		"root" as ActivityItemSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-activity")} style={slot.style("root")}>
			<div
				class={slot.class("icon", "a-activity-icon")}
				style={slot.style("icon")}
				aria-hidden="true"
			>
				{props.iconNode ?? <Icon name={props.icon ?? "bell"} size={16} />}
			</div>
			<div class={slot.class("body", "a-activity-body")}>
				<div class={slot.class("title", "a-activity-title")}>{props.title}</div>
				<Show when={props.meta}>
					<div class={slot.class("meta", "a-activity-meta")}>{props.meta}</div>
				</Show>
				<Show when={props.children}>
					<div class={slot.class("content", "a-activity-content")}>{props.children}</div>
				</Show>
			</div>
		</article>
	);
}

export type FilterBarProps = BaseProps & {
	/** Filter controls: search, selects, chips, buttons. */
	children?: unknown;
};

/**
 * Horizontal toolbar for filters and chips.
 * Slots: `root`.
 */
export function FilterBar(input: FilterBarProps) {
	const [props, rest, slot] = setup("FilterBar", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-filter-bar")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type MasonryProps = BaseProps & {
	/** Number of columns. */
	columns?: 2 | 3 | 4 | undefined;
	/** Items to pack; each keeps its own height. */
	children?: unknown;
};

/**
 * Masonry layout of variable-height items in columns.
 * Slots: `root`.
 */
export function Masonry(input: MasonryProps) {
	const [props, rest, slot] = setup("Masonry", input, { columns: 3 }, ["columns", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-masonry", `a-masonry-${props.columns ?? 3}`)}
			style={slot.style("root")}
			data-columns={props.columns}
		>
			{props.children}
		</div>
	);
}
