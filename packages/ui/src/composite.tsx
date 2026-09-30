import { For, Show } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { Button } from "./button.tsx";
import type { AlertTone } from "./feedback.tsx";
import { CloseButton, Icon, type IconName } from "./icons.tsx";
import { Menu } from "./overlay.tsx";
import { Avatar } from "./presence.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

export type UnstyledButtonProps = BaseProps & {
	/** Native button type. */
	type?: "button" | "submit" | "reset" | undefined;
	/** Disables the button. */
	disabled?: boolean | undefined;
	/** Called when the button is pressed. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Button content (no built-in styling). */
	children?: unknown;
};

/** Button with browser chrome reset — bring your own look. */
export function UnstyledButton(input: UnstyledButtonProps) {
	const [props, rest, slot] = setup("UnstyledButton", input, { type: "button" }, [
		"type",
		"disabled",
		"onClick",
		"children",
	]);
	return (
		<button
			{...rest}
			type={props.type}
			class={slot.class("root", "a-unstyled-btn")}
			style={slot.style("root")}
			disabled={props.disabled}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</button>
	);
}

export type ButtonGroupProps = BaseProps & {
	/** Join the buttons edge to edge; otherwise they sit apart with a gap. */
	attached?: boolean | undefined;
	/** Accessible name for the group. */
	label?: string | undefined;
	/** The `Button`s. */
	children?: unknown;
};

/** Bootstrap-style button group. State: `data-attached`. */
export function ButtonGroup(input: ButtonGroupProps) {
	const [props, rest, slot] = setup("ButtonGroup", input, {}, ["attached", "label", "children"]);
	return (
		// biome-ignore lint/a11y/useSemanticElements: flex row of buttons, not a form fieldset (no legend, no form semantics)
		<div
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-btn-group", props.attached !== false && "a-btn-group-attached")}
			style={slot.style("root")}
			role="group"
			data-attached={props.attached !== false ? "" : undefined}
		>
			{props.children}
		</div>
	);
}

export type SplitButtonSlot = "root" | "main" | "caret" | "menu";

export type SplitButtonProps = SlotProps<SplitButtonSlot> & {
	/** Main button label. */
	label: unknown;
	/** Alternative actions in the caret menu: `label`, `onSelect`, optional `danger`. */
	menu: Array<{ label: string; onSelect: () => void; danger?: boolean | undefined }>;
	/** Button style. */
	variant?: "solid" | "ghost" | "danger" | undefined;
	/** Button size. */
	size?: "sm" | "md" | undefined;
	/** Disables both halves. */
	disabled?: boolean | undefined;
	/** Called when the main button is pressed. */
	onClick?: (() => void) | undefined;
	/** Accessible name for the caret (default "More actions"). */
	caretLabel?: string | undefined;
};

/** Primary action + caret menu. Slots: `root` `main` `caret` `menu`. State: `data-state`. */
export function SplitButton(input: SplitButtonProps) {
	const [props, rest, slot] = setup(
		"SplitButton",
		input,
		{},
		["label", "menu", "variant", "size", "disabled", "onClick", "caretLabel"],
		"root" as SplitButtonSlot,
	);
	const open = signal(false);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-split-btn", "a-menu-host")}
			style={slot.style("root")}
			data-state={open() ? "open" : "closed"}
		>
			<Button
				variant={props.variant}
				size={props.size}
				disabled={props.disabled}
				onClick={() => props.onClick?.()}
				class={slot.class("main", "a-split-btn-main")}
				style={slot.style("main")}
			>
				{props.label}
			</Button>
			<Button
				variant={props.variant}
				size={props.size}
				disabled={props.disabled}
				class={slot.class("caret", "a-split-btn-caret")}
				style={slot.style("caret")}
				aria-label={props.caretLabel ?? "More actions"}
				aria-haspopup="menu"
				aria-expanded={open()}
				onClick={() => open.set(!open())}
			>
				<Icon name="chevron-down" size={14} />
			</Button>
			<Menu
				open={open()}
				onClose={() => open.set(false)}
				items={props.menu}
				class={slot.class("menu")}
				style={slot.style("menu")}
			/>
		</div>
	);
}

export type ToggleItem = {
	/** Option id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Option text or content. */
	label: unknown;
	/** Shown but can't be toggled. */
	disabled?: boolean | undefined;
};

export type ToggleGroupSlot = "root" | "item";

export type ToggleGroupProps = SlotProps<ToggleGroupSlot> & {
	/** Pressed id (single), ids (`multiple`), or `null` for none. */
	value: string | string[] | null;
	/** The options, in order. */
	items: ToggleItem[];
	/** Allow several options pressed at once (`value` is an array). */
	multiple?: boolean | undefined;
	/** Called with the new pressed id(s) (`null` when the pressed single option is released). */
	onChange: (value: string | string[] | null) => void;
	/** Accessible name for the group. */
	label?: string | undefined;
};

/** Pressed-toggle group. Slots: `root` `item`. Items expose `data-state` (`on` | `off`). */
export function ToggleGroup(input: ToggleGroupProps) {
	const [props, rest, slot] = setup(
		"ToggleGroup",
		input,
		{},
		["value", "items", "multiple", "onChange", "label"],
		"root" as ToggleGroupSlot,
	);
	const isOn = (id: string) => {
		const v = props.value;
		if (Array.isArray(v)) return v.includes(id);
		return v === id;
	};

	const toggle = (id: string) => {
		if (props.multiple) {
			const cur = Array.isArray(props.value) ? props.value : [];
			props.onChange(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
			return;
		}
		props.onChange(props.value === id ? null : id);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: toolbar-like row of toggle buttons, not a form fieldset
		<div
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-toggle-group")}
			style={slot.style("root")}
			role="group"
		>
			<For each={props.items}>
				{(item) => (
					<button
						type="button"
						class={slot.class("item", "a-toggle-btn", isOn(item.id) && "a-toggle-btn-on")}
						style={slot.style("item")}
						aria-pressed={isOn(item.id)}
						disabled={item.disabled}
						data-state={isOn(item.id) ? "on" : "off"}
						onClick={() => toggle(item.id)}
					>
						{item.label}
					</button>
				)}
			</For>
		</div>
	);
}

export type AvatarGroupSlot = "root" | "avatar" | "more";

export type AvatarGroupProps = SlotProps<AvatarGroupSlot> & {
	/** People to show (initials come from each name). */
	names: string[];
	/** Avatars shown before collapsing the rest into a `+N` counter. */
	max?: number | undefined;
	/** Avatar size. */
	size?: "sm" | "md" | "lg" | undefined;
};

/** Overlapping avatars with a "+N" overflow chip. Slots: `root` `avatar` `more`. */
export function AvatarGroup(input: AvatarGroupProps) {
	const [props, rest, slot] = setup(
		"AvatarGroup",
		input,
		{},
		["names", "max", "size"],
		"root" as AvatarGroupSlot,
	);
	const max = () => Math.max(0, props.max ?? 4);
	const shown = () => props.names.slice(0, max());
	const extra = () => props.names.length - shown().length;
	return (
		<div {...rest} class={slot.class("root", "a-avatar-group")} style={slot.style("root")}>
			<For each={shown()}>
				{(name) => <Avatar name={name} size={props.size} class={slot.class("avatar")} />}
			</For>
			<Show when={extra() > 0}>
				<span
					class={slot.class("more", "a-avatar", `a-avatar-${props.size ?? "md"}`, "a-avatar-more")}
					style={slot.style("more")}
					role="img"
					aria-label={`${extra()} more`}
				>
					+{extra()}
				</span>
			</Show>
		</div>
	);
}

export type NotificationSlot = "root" | "body" | "title" | "content" | "close";

export type NotificationProps = SlotProps<NotificationSlot> & {
	/** Bold first line. */
	title?: string | undefined;
	/** Colour and icon. */
	tone?: AlertTone | undefined;
	/** Shows a close button; called when it is pressed. */
	onClose?: (() => void) | undefined;
	/** Notification text. */
	children?: unknown;
};

/**
 * Inline notification (distinct from toast host). Danger / warning announce
 * assertively. Slots: `root` `body` `title` `content` `close`. State: `data-tone`.
 */
export function Notification(input: NotificationProps) {
	const [props, rest, slot] = setup(
		"Notification",
		input,
		{},
		["title", "tone", "onClose", "children"],
		"root" as NotificationSlot,
	);
	const assertive = () => props.tone === "danger" || props.tone === "warning";
	return (
		<div
			{...rest}
			class={slot.class("root", "a-notification", props.tone && `a-notification-${props.tone}`)}
			style={slot.style("root")}
			role={assertive() ? "alert" : "status"}
			data-tone={props.tone ?? "info"}
		>
			<div class={slot.class("body", "a-notification-body")} style={slot.style("body")}>
				<Show when={props.title}>
					<p class={slot.class("title", "a-notification-title")} style={slot.style("title")}>
						{props.title}
					</p>
				</Show>
				<div class={slot.class("content", "a-notification-content")} style={slot.style("content")}>
					{props.children}
				</div>
			</div>
			<Show when={props.onClose}>
				<CloseButton class={slot.class("close")} onClick={() => props.onClose?.()} />
			</Show>
		</div>
	);
}

export type FloatingActionButtonSlot = "root" | "icon";

export type FloatingActionButtonProps = SlotProps<FloatingActionButtonSlot> & {
	/** Accessible name (and tooltip) of the button. */
	label: string;
	/** Icon shown in the button. */
	icon?: IconName | undefined;
	/** Called when the button is pressed. */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Viewport corner to float in. */
	position?: "bottom-right" | "bottom-left" | undefined;
	/** Custom content instead of `icon`. */
	children?: unknown;
};

/** Pinned primary action. `children` replaces the icon. Slots: `root` `icon`. */
export function FloatingActionButton(input: FloatingActionButtonProps) {
	const [props, rest, slot] = setup(
		"FloatingActionButton",
		input,
		{ position: "bottom-right", icon: "plus" },
		["label", "icon", "onClick", "position", "children"],
		"root" as FloatingActionButtonSlot,
	);
	return (
		<button
			aria-label={props.label}
			{...rest}
			type="button"
			class={slot.class("root", "a-fab", `a-fab-${props.position}`)}
			style={slot.style("root")}
			data-position={props.position}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children ?? <Icon name={props.icon ?? "plus"} class={slot.class("icon")} />}
		</button>
	);
}

export type BottomNavItem = {
	/** Item id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Item text under the icon. */
	label: string;
	/** Item icon. */
	icon?: IconName | undefined;
};

export type BottomNavSlot = "root" | "item" | "icon" | "label";

export type BottomNavProps = SlotProps<BottomNavSlot> & {
	/** Id of the current item. */
	value: string;
	/** Navigation items (3–5 work best). */
	items: BottomNavItem[];
	/** Called with the id the user picks. */
	onChange: (id: string) => void;
	/** Accessible name (default "Bottom"). */
	label?: string | undefined;
};

/** Mobile tab bar. Slots: `root` `item` `icon` `label`. Items expose `data-state`. */
export function BottomNav(input: BottomNavProps) {
	const [props, rest, slot] = setup(
		"BottomNav",
		input,
		{},
		["value", "items", "onChange", "label"],
		"root" as BottomNavSlot,
	);
	return (
		<nav
			aria-label={props.label ?? "Bottom"}
			{...rest}
			class={slot.class("root", "a-bottom-nav")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class(
								"item",
								"a-bottom-nav-item",
								active() && "a-bottom-nav-item-active",
							)}
							style={slot.style("item")}
							aria-current={active() ? "page" : undefined}
							data-state={active() ? "active" : "inactive"}
							onClick={() => props.onChange(item.id)}
						>
							<Show when={item.icon}>
								{(icon: IconName) => <Icon name={icon} size={18} class={slot.class("icon")} />}
							</Show>
							<span class={slot.class("label")}>{item.label}</span>
						</button>
					);
				}}
			</For>
		</nav>
	);
}

export type SortableItem = {
	/** Item id (stable across reorders). */
	id: string;
	/** Item text. */
	label: string;
};

export type SortableListSlot = "root" | "item" | "label" | "actions";

export type SortableListProps = SlotProps<SortableListSlot> & {
	/** Items in their current order (controlled). */
	items: SortableItem[];
	/** Called with the reordered items (drag or the move buttons). */
	onChange: (items: SortableItem[]) => void;
};

/** Reorderable list with keyboard-accessible move buttons. Slots: `root` `item` `label` `actions`. */
export function SortableList(input: SortableListProps) {
	const [props, rest, slot] = setup(
		"SortableList",
		input,
		{},
		["items", "onChange"],
		"root" as SortableListSlot,
	);
	let list: HTMLElement | undefined;

	const move = (id: string, dir: -1 | 1, action: "Move up" | "Move down") => {
		const index = props.items.findIndex((item) => item.id === id);
		const j = index + dir;
		if (index < 0 || j < 0 || j >= props.items.length) return;
		const next = [...props.items];
		const tmp = next[index] as SortableItem;
		next[index] = next[j] as SortableItem;
		next[j] = tmp;
		props.onChange(next);
		// Rows are keyed, but moving a focused node can drop focus: put it back.
		const row = [...(list?.querySelectorAll<HTMLElement>("[data-sortable-id]") ?? [])].find(
			(el) => el.dataset["sortableId"] === id,
		);
		const same = row?.querySelector<HTMLButtonElement>(`button[aria-label="${action}"]`);
		const other = row?.querySelector<HTMLButtonElement>(
			`button[aria-label="${action === "Move up" ? "Move down" : "Move up"}"]`,
		);
		(same && !same.disabled ? same : other)?.focus();
	};

	return (
		<ul
			{...rest}
			ref={(el: HTMLElement) => {
				list = el;
			}}
			class={slot.class("root", "a-sortable")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item, i) => (
					<li
						class={slot.class("item", "a-sortable-item")}
						style={slot.style("item")}
						data-id={item.id}
						data-sortable-id={item.id}
					>
						<span class={slot.class("label", "a-sortable-label")}>{item.label}</span>
						<div class={slot.class("actions", "a-sortable-actions")}>
							<ActionIcon
								label="Move up"
								size="sm"
								disabled={i() === 0}
								onClick={() => move(item.id, -1, "Move up")}
							>
								<Icon name="chevron-up" size={14} />
							</ActionIcon>
							<ActionIcon
								label="Move down"
								size="sm"
								disabled={i() === props.items.length - 1}
								onClick={() => move(item.id, 1, "Move down")}
							>
								<Icon name="chevron-down" size={14} />
							</ActionIcon>
						</div>
					</li>
				)}
			</For>
		</ul>
	);
}

export type PasswordStrengthSlot = "root" | "bars" | "bar" | "label";

export type PasswordStrengthProps = SlotProps<PasswordStrengthSlot> & {
	/** The password to rate (strength bar and hints). */
	password: string;
	/** Override the five labels (score 0–4). */
	labels?: [string, string, string, string, string] | undefined;
};

function scorePassword(pw: string): number {
	let s = 0;
	if (pw.length >= 8) s++;
	if (pw.length >= 12) s++;
	if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
	if (/\d/.test(pw)) s++;
	if (/[^A-Za-z0-9]/.test(pw)) s++;
	return Math.min(4, s);
}

const STRENGTH_LABELS = ["Too weak", "Weak", "Fair", "Good", "Strong"] as const;

/** Four-bar strength meter. Slots: `root` `bars` `bar` `label`. State: `data-score`. */
export function PasswordStrength(input: PasswordStrengthProps) {
	const [props, rest, slot] = setup(
		"PasswordStrength",
		input,
		{},
		["password", "labels"],
		"root" as PasswordStrengthSlot,
	);
	const score = () => scorePassword(props.password ?? "");
	const labels = () => props.labels ?? STRENGTH_LABELS;
	return (
		<div
			aria-live="polite"
			{...rest}
			class={slot.class("root", "a-pw-strength")}
			style={slot.style("root")}
			data-score={score()}
		>
			<div class={slot.class("bars", "a-pw-strength-bars")} aria-hidden="true">
				<For each={[0, 1, 2, 3]}>
					{(i) => (
						<span
							class={slot.class(
								"bar",
								"a-pw-strength-bar",
								i < score() && `a-pw-strength-bar-${score()}`,
							)}
							data-state={i < score() ? "on" : "off"}
						/>
					)}
				</For>
			</div>
			<span class={slot.class("label", "a-pw-strength-label")}>
				{props.password ? labels()[score()] : "Enter a password"}
			</span>
		</div>
	);
}

export type MeterSlot = "root" | "label" | "track" | "bar";

export type MeterProps = SlotProps<MeterSlot> & {
	/** Current value, between `min` and `max`. */
	value: number;
	/** Lower bound. */
	min?: number | undefined;
	/** Upper bound. */
	max?: number | undefined;
	/** What is measured (shown and used as the accessible name). */
	label?: string | undefined;
};

/** Scalar gauge in a known range. Slots: `root` `label` `track` `bar`. */
export function Meter(input: MeterProps) {
	const [props, rest, slot] = setup(
		"Meter",
		input,
		{},
		["value", "min", "max", "label"],
		"root" as MeterSlot,
	);
	const min = () => props.min ?? 0;
	const max = () => props.max ?? 100;
	const pct = () => {
		const span = max() - min();
		if (!Number.isFinite(props.value) || !(span > 0)) return 0;
		return Math.max(0, Math.min(100, ((props.value - min()) / span) * 100));
	};
	return (
		<div {...rest} class={slot.class("root", "a-meter")} style={slot.style("root")}>
			<Show when={props.label}>
				<div class={slot.class("label", "a-meter-label")} aria-hidden="true">
					{props.label}
				</div>
			</Show>
			{/* biome-ignore lint/a11y/useSemanticElements: <meter> can't host a styleable bar element; role="meter" keeps the semantics */}
			<div
				class={slot.class("track", "a-meter-track")}
				style={slot.style("track")}
				role="meter"
				aria-label={props.label}
				aria-valuemin={min()}
				aria-valuemax={max()}
				aria-valuenow={props.value}
			>
				<div
					class={slot.class("bar", "a-meter-bar")}
					style={slot.style("bar", { width: `${pct()}%` })}
				/>
			</div>
		</div>
	);
}

export type CommentSlot =
	| "root"
	| "avatar"
	| "body"
	| "head"
	| "author"
	| "meta"
	| "content"
	| "actions";

export type CommentProps = SlotProps<CommentSlot> & {
	/** Author name. */
	author: string;
	/** Small line next to the author, e.g. the time. */
	meta?: string | undefined;
	/** Avatar image URL (initials from `author` when unset). */
	avatar?: string | undefined;
	/** Comment text or content. */
	children?: unknown;
	/** Buttons under the comment, e.g. Reply. */
	actions?: unknown;
};

/** Discussion entry. Slots: `root` `avatar` `body` `head` `author` `meta` `content` `actions`. */
export function Comment(input: CommentProps) {
	const [props, rest, slot] = setup(
		"Comment",
		input,
		{},
		["author", "meta", "avatar", "children", "actions"],
		"root" as CommentSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-comment")} style={slot.style("root")}>
			<Avatar name={props.author} src={props.avatar} size="sm" class={slot.class("avatar")} />
			<div class={slot.class("body", "a-comment-body")} style={slot.style("body")}>
				<header class={slot.class("head", "a-comment-head")} style={slot.style("head")}>
					<strong class={slot.class("author")}>{props.author}</strong>
					<Show when={props.meta}>
						<span class={slot.class("meta", "a-comment-meta")}>{props.meta}</span>
					</Show>
				</header>
				<div class={slot.class("content", "a-comment-content")} style={slot.style("content")}>
					{props.children}
				</div>
				<Show when={props.actions}>
					<div class={slot.class("actions", "a-comment-actions")}>{props.actions}</div>
				</Show>
			</div>
		</article>
	);
}

export type SkipLinkProps = BaseProps & {
	/** Target to jump to (id of your main content). */
	href?: string | undefined;
	/** Link text. */
	children?: unknown;
};

/** Visually hidden until focused; jumps to `#main` by default. */
export function SkipLink(input: SkipLinkProps) {
	const [props, rest, slot] = setup("SkipLink", input, { href: "#main" }, ["href", "children"]);
	return (
		<a
			{...rest}
			class={slot.class("root", "a-skip-link")}
			style={slot.style("root")}
			href={props.href}
		>
			{props.children ?? "Skip to content"}
		</a>
	);
}

export type ThumbnavItem = {
	/** Thumbnail id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Thumbnail image URL. */
	src: string;
	/** Alternative text (the button's accessible name). */
	alt?: string | undefined;
};

export type ThumbnavSlot = "root" | "item" | "image";

export type ThumbnavProps = SlotProps<ThumbnavSlot> & {
	/** Id of the selected thumbnail. */
	value: string;
	/** The thumbnails, in order. */
	items: ThumbnavItem[];
	/** Called with the id the user picks. */
	onChange: (id: string) => void;
	/** Accessible name (default "Thumbnails"). */
	label?: string | undefined;
};

/** Thumbnail picker. Slots: `root` `item` `image`. Items expose `data-state`. */
export function Thumbnav(input: ThumbnavProps) {
	const [props, rest, slot] = setup(
		"Thumbnav",
		input,
		{},
		["value", "items", "onChange", "label"],
		"root" as ThumbnavSlot,
	);
	return (
		<nav
			aria-label={props.label ?? "Thumbnails"}
			{...rest}
			class={slot.class("root", "a-thumbnav")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class("item", "a-thumbnav-item", active() && "a-thumbnav-item-active")}
							style={slot.style("item")}
							aria-current={active() ? "true" : undefined}
							aria-label={item.alt || item.id}
							data-state={active() ? "active" : "inactive"}
							onClick={() => props.onChange(item.id)}
						>
							<img class={slot.class("image")} src={item.src} alt="" />
						</button>
					);
				}}
			</For>
		</nav>
	);
}

export type LeaderSlot = "root" | "label" | "dots" | "value";

export type LeaderProps = SlotProps<LeaderSlot> & {
	/** Text on the left. */
	label: unknown;
	/** Text on the right; dots fill the space between. */
	value: unknown;
};

/** UIkit-style dotted leader row. Slots: `root` `label` `dots` `value`. */
export function Leader(input: LeaderProps) {
	const [props, rest, slot] = setup("Leader", input, {}, ["label", "value"], "root" as LeaderSlot);
	return (
		<div {...rest} class={slot.class("root", "a-leader")} style={slot.style("root")}>
			<span class={slot.class("label", "a-leader-label")}>{props.label}</span>
			<span class={slot.class("dots", "a-leader-dots")} aria-hidden="true" />
			<span class={slot.class("value", "a-leader-value")}>{props.value}</span>
		</div>
	);
}

export type MarqueeSlot = "root" | "track" | "group";

export type MarqueeProps = SlotProps<MarqueeSlot> & {
	/** `"soft"` (default) sits on a tinted, bordered strip; `"plain"` has no background or border. */
	variant?: "soft" | "plain" | undefined;
	/** Scroll speed. */
	speed?: "slow" | "normal" | "fast" | undefined;
	/** Pause scrolling while hovered or focused (default true). */
	pauseOnHover?: boolean | undefined;
	/** Content to scroll (rendered twice for a seamless loop). */
	children?: unknown;
};

/**
 * Seamless ticker: content is rendered twice so the −50% keyframe loops
 * without a gap; the copy is hidden from assistive tech.
 * Slots: `root` `track` `group`. State: `data-speed`.
 */
export function Marquee(input: MarqueeProps) {
	const [props, rest, slot] = setup(
		"Marquee",
		input,
		{ speed: "normal", variant: "soft" },
		["speed", "variant", "pauseOnHover", "children"],
		"root" as MarqueeSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class(
				"root",
				"a-marquee",
				`a-marquee-${props.speed}`,
				props.variant === "plain" && "a-marquee-plain",
			)}
			style={slot.style("root")}
			data-speed={props.speed}
			data-variant={props.variant}
			data-pause-on-hover={props.pauseOnHover === false ? undefined : ""}
		>
			<div class={slot.class("track", "a-marquee-track")} style={slot.style("track")}>
				<div class={slot.class("group", "a-marquee-group")}>{props.children}</div>
				<div class={slot.class("group", "a-marquee-group")} aria-hidden="true" inert>
					{props.children}
				</div>
			</div>
		</div>
	);
}

export type BarListItem = {
	/** Row id. */
	id: string;
	/** Row label. */
	label: string;
	/** Row value; bar lengths are relative to the largest. */
	value: number;
};

export type BarListSlot = "root" | "item" | "row" | "label" | "value" | "track" | "bar";

export type BarListProps = SlotProps<BarListSlot> & {
	/** Rows, in display order. */
	data: BarListItem[];
	/** Format the value column (default: the raw number). */
	format?: ((value: number) => unknown) | undefined;
};

/** Ranked horizontal bars. Slots: `root` `item` `row` `label` `value` `track` `bar`. */
export function BarList(input: BarListProps) {
	const [props, rest, slot] = setup(
		"BarList",
		input,
		{},
		["data", "format"],
		"root" as BarListSlot,
	);
	const max = () => Math.max(1, ...props.data.map((d) => (Number.isFinite(d.value) ? d.value : 0)));
	const width = (value: number) =>
		Number.isFinite(value) ? Math.max(0, Math.min(100, (value / max()) * 100)) : 0;
	return (
		<ul {...rest} class={slot.class("root", "a-barlist")} style={slot.style("root")}>
			<For each={props.data}>
				{(d) => (
					<li class={slot.class("item", "a-barlist-item")} style={slot.style("item")}>
						<div class={slot.class("row", "a-barlist-row")}>
							<span class={slot.class("label")}>{d.label}</span>
							<strong class={slot.class("value")}>
								{props.format ? props.format(d.value) : d.value}
							</strong>
						</div>
						<div class={slot.class("track", "a-barlist-track")} style={slot.style("track")}>
							<div
								class={slot.class("bar", "a-barlist-bar")}
								style={slot.style("bar", { width: `${width(d.value)}%` })}
							/>
						</div>
					</li>
				)}
			</For>
		</ul>
	);
}

export type SplitterSlot = "root" | "pane" | "handle";

export type SplitterProps = SlotProps<SplitterSlot> & {
	/** Left pane ratio 0–1, default 0.4 (read once, at mount). */
	initial?: number | undefined;
	/** Smallest size of the first pane, in percent. */
	min?: number | undefined;
	/** Largest size of the first pane, in percent. */
	max?: number | undefined;
	/** Accessible name for the handle (default "Resize panes"). */
	label?: string | undefined;
	/** First (left) pane content. */
	left?: unknown;
	/** Second (right) pane content. */
	right?: unknown;
};

/** Two resizable panes (pointer + ← → Home End). Slots: `root` `pane` `handle`. State: `data-state`. */
export function Splitter(input: SplitterProps) {
	const [props, rest, slot] = setup(
		"Splitter",
		input,
		{},
		["initial", "min", "max", "label", "left", "right"],
		"root" as SplitterSlot,
	);
	const min = () => props.min ?? 0.2;
	const max = () => props.max ?? 0.8;
	const clamp = (v: number) => Math.max(min(), Math.min(max(), v));
	const ratio = signal(clamp(props.initial ?? 0.4));
	const dragging = signal(false);
	const STEP = 0.05;

	const onPointerDown = (e: PointerEvent) => {
		const handle = e.currentTarget as HTMLElement;
		const host = handle.parentElement;
		if (!host || e.button > 0) return;
		e.preventDefault();
		dragging.set(true);
		handle.setPointerCapture?.(e.pointerId);
		const onMove = (ev: PointerEvent) => {
			const rect = host.getBoundingClientRect();
			if (rect.width <= 0) return;
			ratio.set(clamp((ev.clientX - rect.left) / rect.width));
		};
		const onUp = () => {
			dragging.set(false);
			handle.releasePointerCapture?.(e.pointerId);
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", onUp);
			handle.removeEventListener("pointercancel", onUp);
			handle.removeEventListener("lostpointercapture", onUp);
		};
		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", onUp);
		handle.addEventListener("pointercancel", onUp);
		handle.addEventListener("lostpointercapture", onUp);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const keys: Record<string, () => number> = {
			ArrowLeft: () => ratio() - STEP,
			ArrowRight: () => ratio() + STEP,
			Home: min,
			End: max,
		};
		const next = keys[e.key];
		if (!next) return;
		e.preventDefault();
		ratio.set(clamp(next()));
	};

	return (
		<div
			{...rest}
			class={slot.class("root", "a-splitter", dragging() && "a-splitter-dragging")}
			style={slot.style("root")}
			data-state={dragging() ? "dragging" : "idle"}
		>
			<div
				class={slot.class("pane", "a-splitter-pane")}
				style={slot.style("pane", { "flex-basis": `${ratio() * 100}%` })}
			>
				{props.left}
			</div>
			{/* biome-ignore lint/a11y/useSemanticElements: a focusable, value-bearing separator is a widget; <hr> can't take focus or aria-valuenow */}
			<div
				class={slot.class("handle", "a-splitter-handle")}
				role="separator"
				aria-label={props.label ?? "Resize panes"}
				aria-orientation="vertical"
				aria-valuemin={Math.round(min() * 100)}
				aria-valuemax={Math.round(max() * 100)}
				aria-valuenow={Math.round(ratio() * 100)}
				tabindex="0"
				style={slot.style("handle", { "touch-action": "none" })}
				onPointerDown={onPointerDown}
				onKeyDown={onKeyDown}
			/>
			<div
				class={slot.class("pane", "a-splitter-pane", "a-splitter-pane-grow")}
				style={slot.style("pane")}
			>
				{props.right}
			</div>
		</div>
	);
}

export type DataTableColumn<T> = {
	/** Column id (used by sorting). */
	id: string;
	/** Column header text. */
	header: string;
	/** Renders a row's cell for this column. */
	cell: (row: T) => unknown;
	/** Value to sort by; the column is sortable when set. */
	sortValue?: ((row: T) => string | number) | undefined;
};

export type DataTableSort = {
	/** Id of the sorted column. */
	id: string;
	/** Sort direction. */
	dir: "asc" | "desc";
};

export type DataTableSlot = "root" | "head" | "header" | "sort" | "body" | "row" | "cell" | "empty";

export type DataTableProps<T extends { id: string }> = SlotProps<DataTableSlot> & {
	/** Column definitions, in order. */
	columns: Array<DataTableColumn<T>>;
	/** Row data; each row needs a unique `id`. */
	rows: T[];
	/** Accessible name for the table. */
	label?: string | undefined;
	/** Initial sort (read once). */
	defaultSort?: DataTableSort | undefined;
	/** Notified after a header click changes the sort. */
	onSortChange?: ((sort: DataTableSort | null) => void) | undefined;
	/** Shown when there are no rows. */
	empty?: unknown;
};

/** Compare sort keys: numbers numerically, strings with natural (numeric-aware) order. */
function compareKeys(a: string | number, b: string | number): number {
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

// DataTable lays each row out as its own CSS grid (shared column template), which
// native <table>/<tr> display rules don't allow, so it uses the ARIA table
// pattern (table / rowgroup / row / columnheader / cell) on divs instead.
// biome-ignore-start lint/a11y/useSemanticElements: ARIA table pattern on grid-laid-out divs (see above)
// biome-ignore-start lint/a11y/useFocusableInteractive: table rows/cells are not interactive; sorting lives on header buttons
/**
 * Sortable data grid with ARIA table semantics (`rowgroup`s, `aria-sort`,
 * header sort buttons). Sorting is stable; clicking cycles asc → desc → none.
 * Slots: `root` `head` `header` `sort` `body` `row` `cell` `empty`.
 */
export function DataTable<T extends { id: string }>(input: DataTableProps<T>) {
	const [props, rest, slot] = setup(
		"DataTable",
		input,
		{},
		["columns", "rows", "label", "defaultSort", "onSortChange", "empty"],
		"root" as DataTableSlot,
	);
	const sort = signal<DataTableSort | null>(props.defaultSort ?? null);

	const sorted = () => {
		const s = sort();
		if (!s) return props.rows;
		const col = props.columns.find((c) => c.id === s.id);
		const key = col?.sortValue;
		if (!key) return props.rows;
		const dir = s.dir === "asc" ? 1 : -1;
		return [...props.rows].sort((a, b) => dir * compareKeys(key(a), key(b)));
	};

	const toggle = (id: string) => {
		const cur = sort();
		const next: DataTableSort | null =
			cur?.id !== id ? { id, dir: "asc" } : cur.dir === "asc" ? { id, dir: "desc" } : null;
		sort.set(next);
		props.onSortChange?.(next);
	};

	const ariaSort = (col: DataTableColumn<T>) => {
		if (!col.sortValue) return undefined;
		const s = sort();
		return s?.id === col.id ? ARIA_SORT[s.dir] : "none";
	};

	const cols = () => `repeat(${props.columns.length}, minmax(0, 1fr))`;

	return (
		<div
			aria-label={props.label}
			{...rest}
			class={slot.class("root", "a-datatable")}
			style={slot.style("root")}
			role="table"
			aria-rowcount={props.rows.length + 1}
		>
			<div role="rowgroup">
				<div
					class={slot.class("head", "a-datatable-head")}
					role="row"
					style={slot.style("head", { "grid-template-columns": cols() })}
				>
					<For each={props.columns}>
						{(col) => (
							<div
								class={slot.class("header", "a-datatable-th")}
								style={slot.style("header")}
								role="columnheader"
								aria-sort={ariaSort(col)}
								data-sort={ariaSort(col)}
							>
								{col.sortValue ? (
									<button
										type="button"
										class={slot.class("sort", "a-datatable-sort")}
										onClick={() => toggle(col.id)}
									>
										{col.header}
										<span aria-hidden="true">
											{ariaSort(col) === "ascending"
												? " ↑"
												: ariaSort(col) === "descending"
													? " ↓"
													: ""}
										</span>
									</button>
								) : (
									col.header
								)}
							</div>
						)}
					</For>
				</div>
			</div>
			<div
				role="rowgroup"
				class={slot.class("body", "a-datatable-body")}
				style={slot.style("body")}
			>
				<For
					each={sorted()}
					fallback={
						<Show when={props.empty}>
							<div class={slot.class("empty", "a-datatable-empty")} role="row">
								<div role="cell">{props.empty}</div>
							</div>
						</Show>
					}
				>
					{(row) => (
						<div
							class={slot.class("row", "a-datatable-row")}
							role="row"
							style={slot.style("row", { "grid-template-columns": cols() })}
							data-row-id={row.id}
						>
							<For each={props.columns}>
								{(col) => (
									<div
										class={slot.class("cell", "a-datatable-td")}
										style={slot.style("cell")}
										role="cell"
									>
										{col.cell(row)}
									</div>
								)}
							</For>
						</div>
					)}
				</For>
			</div>
		</div>
	);
}

// biome-ignore-end lint/a11y/useFocusableInteractive: end of DataTable
// biome-ignore-end lint/a11y/useSemanticElements: end of DataTable

export type YearPickerSlot = "root" | "header" | "title" | "grid" | "cell";

export type YearPickerProps = SlotProps<YearPickerSlot> & {
	/** Selected year. */
	value?: number | undefined;
	/** Called with the picked year. */
	onChange?: ((year: number) => void) | undefined;
};

/** Twelve-year grid with paging. Slots: `root` `header` `title` `grid` `cell`. Cells expose `data-state`. */
export function YearPicker(input: YearPickerProps) {
	const [props, rest, slot] = setup(
		"YearPicker",
		input,
		{},
		["value", "onChange"],
		"root" as YearPickerSlot,
	);
	const now = new Date().getFullYear();
	const start = signal((props.value ?? now) - 6);
	const years = () => Array.from({ length: 12 }, (_, i) => start() + i);

	return (
		<div
			{...rest}
			class={slot.class("root", "a-year-picker", "a-picker-panel")}
			style={slot.style("root")}
		>
			<div class={slot.class("header", "a-picker-header")}>
				<ActionIcon label="Previous years" size="sm" onClick={() => start.set(start() - 12)}>
					<Icon name="chevron-left" size={14} />
				</ActionIcon>
				<span class={slot.class("title", "a-picker-title")} aria-live="polite">
					{start()}–{start() + 11}
				</span>
				<ActionIcon label="Next years" size="sm" onClick={() => start.set(start() + 12)}>
					<Icon name="chevron-right" size={14} />
				</ActionIcon>
			</div>
			<div class={slot.class("grid", "a-year-grid")} style={slot.style("grid")}>
				<For each={years()}>
					{(y) => (
						<button
							type="button"
							class={slot.class("cell", "a-year-cell", props.value === y && "a-year-cell-active")}
							aria-pressed={props.value === y}
							data-state={props.value === y ? "active" : "inactive"}
							onClick={() => props.onChange?.(y)}
						>
							{y}
						</button>
					)}
				</For>
			</div>
		</div>
	);
}
