import { For, Show } from "@arachne/render";
import { effect, isServerRender, signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { Icon, type IconName } from "./icons.tsx";
import { TextInput } from "./input.tsx";
import { Kbd } from "./presence.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

export type CookieConsentSlot = "root" | "body" | "title" | "message" | "actions";

export type CookieConsentProps = SlotProps<CookieConsentSlot> & {
	/** Whether the notice is shown (controlled); hide it once the user chooses. */
	open: boolean;
	/** Bold first line. */
	title?: string | undefined;
	/** Explanation of what the cookies are for. */
	message?: string | undefined;
	/** Accept button text. */
	acceptLabel?: string | undefined;
	/** Decline button text. */
	declineLabel?: string | undefined;
	/** Called when the user accepts. */
	onAccept: () => void;
	/** Shows a decline button; called when it is pressed. */
	onDecline?: (() => void) | undefined;
};

/**
 * Cookie consent banner with accept / decline.
 * Slots: `root` `body` `title` `message` `actions`.
 */
export function CookieConsent(input: CookieConsentProps) {
	const [props, rest, slot] = setup(
		"CookieConsent",
		input,
		{},
		["open", "title", "message", "acceptLabel", "declineLabel", "onAccept", "onDecline"],
		"root" as CookieConsentSlot,
	);
	return (
		<Show when={props.open}>
			<div
				aria-label="Cookie consent"
				{...rest}
				class={slot.class("root", "a-cookie")}
				style={slot.style("root")}
				role="dialog"
			>
				<div class={slot.class("body", "a-cookie-body")} style={slot.style("body")}>
					<strong class={slot.class("title", "a-cookie-title")}>{props.title ?? "Cookies"}</strong>
					<p class={slot.class("message", "a-cookie-msg")}>
						{props.message ??
							"We use cookies to improve your experience. You can accept or decline non-essential cookies."}
					</p>
				</div>
				<div class={slot.class("actions", "a-cookie-actions")} style={slot.style("actions")}>
					<Show when={props.onDecline}>
						<Button size="sm" variant="ghost" onClick={() => props.onDecline?.()}>
							{props.declineLabel ?? "Decline"}
						</Button>
					</Show>
					<Button size="sm" onClick={() => props.onAccept()}>
						{props.acceptLabel ?? "Accept"}
					</Button>
				</div>
			</div>
		</Show>
	);
}

export type OfflineNoticeProps = BaseProps & {
	/** Force visibility (otherwise listens to navigator.onLine). */
	offline?: boolean | undefined;
	/** Message shown while offline. */
	children?: unknown;
};

/**
 * Banner shown while the browser is offline.
 * Slots: `root`.
 */
export function OfflineNotice(input: OfflineNoticeProps) {
	const [props, rest, slot] = setup("OfflineNotice", input, {}, ["offline", "children"]);
	// Only an explicit `false` means offline; servers (and Bun's navigator) report nothing.
	const offline = signal(
		!isServerRender() && typeof navigator !== "undefined" && navigator.onLine === false,
	);

	effect(() => {
		if (props.offline != null) {
			offline.set(props.offline);
			return;
		}
		const goOffline = () => offline.set(true);
		const goOnline = () => offline.set(false);
		window.addEventListener("offline", goOffline);
		window.addEventListener("online", goOnline);
		return () => {
			window.removeEventListener("offline", goOffline);
			window.removeEventListener("online", goOnline);
		};
	});

	return (
		<Show when={offline()}>
			<div
				{...rest}
				class={slot.class("root", "a-offline")}
				style={slot.style("root")}
				role="status"
			>
				{props.children ?? "You are offline. Changes may not sync."}
			</div>
		</Show>
	);
}

export type HotkeySlot = "root" | "part" | "separator" | "key";

export type HotkeyProps = SlotProps<HotkeySlot> & {
	/** Keys to show and (with `onTrigger`) listen for, e.g. `["Ctrl", "K"]` or `["⌘", "Shift", "P"]`. */
	keys: string[];
	/** Separator between keys (default `+`). */
	separator?: unknown;
	/** Bind the combination on `document`; called when it is pressed (default prevented). */
	onTrigger?: ((e: KeyboardEvent) => void) | undefined;
	/** Ignore the shortcut while typing in inputs (default true). */
	ignoreInInputs?: boolean | undefined;
};

const MODIFIERS: Record<string, "ctrlKey" | "metaKey" | "altKey" | "shiftKey"> = {
	ctrl: "ctrlKey",
	control: "ctrlKey",
	"⌃": "ctrlKey",
	cmd: "metaKey",
	meta: "metaKey",
	"⌘": "metaKey",
	alt: "altKey",
	option: "altKey",
	"⌥": "altKey",
	shift: "shiftKey",
	"⇧": "shiftKey",
};

/** Whether `e` is exactly the combination `keys` (all listed modifiers, no others). */
export function matchesHotkey(e: KeyboardEvent, keys: string[]): boolean {
	const wanted = new Set<string>();
	let main: string | undefined;
	for (const key of keys) {
		const mod = MODIFIERS[key.toLowerCase()];
		if (mod) wanted.add(mod);
		else main = key.toLowerCase();
	}
	for (const mod of ["ctrlKey", "metaKey", "altKey", "shiftKey"] as const) {
		if (e[mod] !== wanted.has(mod)) return false;
	}
	return main !== undefined && e.key.toLowerCase() === (main === "esc" ? "escape" : main);
}

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));

/** Display a key combo (⌘K, Ctrl+S). Slots: `root` `part` `separator` `key`. */
export function Hotkey(input: HotkeyProps) {
	const [props, rest, slot] = setup(
		"Hotkey",
		input,
		{},
		["keys", "separator", "onTrigger", "ignoreInInputs"],
		"root" as HotkeySlot,
	);
	effect(() => {
		const trigger = props.onTrigger;
		if (!trigger || typeof document === "undefined") return;
		const onKey = (e: KeyboardEvent) => {
			if (props.ignoreInInputs !== false && isTyping(e.target)) return;
			if (!matchesHotkey(e, props.keys)) return;
			e.preventDefault();
			trigger(e);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});
	return (
		<span {...rest} class={slot.class("root", "a-hotkey")} style={slot.style("root")}>
			<For each={props.keys}>
				{(k, i) => (
					<span class={slot.class("part", "a-hotkey-part")}>
						<Show when={i() > 0}>
							<span class={slot.class("separator", "a-hotkey-plus")} aria-hidden="true">
								{props.separator ?? "+"}
							</span>
						</Show>
						<Kbd class={slot.class("key")}>{k}</Kbd>
					</span>
				)}
			</For>
		</span>
	);
}

export type InlineEditSlot = "root" | "input" | "display" | "icon";

export type InlineEditProps = SlotProps<InlineEditSlot> & {
	/** Current text (controlled). */
	value: string;
	/** Text shown while the value is empty. */
	placeholder?: string | undefined;
	/** Called with the new text when an edit is committed (Enter or blur); Escape cancels. */
	onChange: (value: string) => void;
	/** Accessible label for the edit button / input. */
	label?: string | undefined;
};

/** Click-to-edit text. Slots: `root` `input` `display` `icon`. State: `data-state="editing|idle"`. */
export function InlineEdit(input: InlineEditProps) {
	const [props, rest, slot] = setup(
		"InlineEdit",
		input,
		{},
		["value", "placeholder", "onChange", "label"],
		"root" as InlineEditSlot,
	);
	const editing = signal(false);
	const draft = signal(props.value);

	effect(() => {
		if (!editing()) draft.set(props.value);
	});

	let host: HTMLElement | undefined;

	// Guarded by `editing` so Enter followed by the unmount blur commits once.
	// Read the draft before leaving edit mode: the sync effect resets it.
	const commit = () => {
		if (!editing()) return;
		const next = draft().trim();
		editing.set(false);
		if (next !== props.value) props.onChange(next);
	};

	const startEditing = () => {
		editing.set(true);
		const field = host?.querySelector("input");
		field?.focus();
		field?.select();
	};

	return (
		<div
			{...rest}
			ref={(el: HTMLElement) => {
				host = el;
			}}
			class={slot.class("root", "a-inline-edit", editing() && "a-inline-edit-open")}
			style={slot.style("root")}
			data-state={editing() ? "editing" : "idle"}
		>
			{editing() ? (
				<TextInput
					class={slot.class("input", "a-inline-edit-input")}
					value={draft()}
					placeholder={props.placeholder}
					aria-label={props.label}
					onInput={(e: InputEvent) => draft.set((e.target as HTMLInputElement).value)}
					onKeyDown={(e: KeyboardEvent) => {
						if (e.key === "Enter") commit();
						if (e.key === "Escape") {
							draft.set(props.value);
							editing.set(false);
						}
					}}
					onBlur={() => commit()}
				/>
			) : (
				<button
					type="button"
					class={slot.class("display", "a-inline-edit-display")}
					aria-label={props.label ? `Edit ${props.label}` : undefined}
					onClick={startEditing}
				>
					{props.value || props.placeholder || "Edit…"}
					<span class={slot.class("icon")} aria-hidden="true">
						<Icon name="edit" size={14} />
					</span>
				</button>
			)}
		</div>
	);
}

export type CopyFieldSlot = "root" | "label" | "value" | "action";

export type CopyFieldProps = SlotProps<CopyFieldSlot> & {
	/** Text shown and copied. */
	value: string;
	/** Field label (also the copy button's accessible context). */
	label?: string | undefined;
};

const COPIED_MS = 1200;

/**
 * Read-only value with a copy button.
 * Slots: `root` `label` `value` `action`. State: `data-copied`.
 */
export function CopyField(input: CopyFieldProps) {
	const [props, rest, slot] = setup(
		"CopyField",
		input,
		{},
		["value", "label"],
		"root" as CopyFieldSlot,
	);
	const copied = signal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	effect(() => () => clearTimeout(timer));
	return (
		<div
			{...rest}
			class={slot.class("root", "a-copy-field")}
			style={slot.style("root")}
			data-copied={copied() ? "" : undefined}
		>
			<Show when={props.label}>
				<span class={slot.class("label", "a-copy-field-label")}>{props.label}</span>
			</Show>
			<code class={slot.class("value", "a-copy-field-value")}>{props.value}</code>
			<ActionIcon
				class={slot.class("action")}
				label={copied() ? "Copied" : "Copy"}
				size="sm"
				onClick={async () => {
					try {
						await navigator.clipboard.writeText(props.value);
						copied.set(true);
						clearTimeout(timer);
						timer = setTimeout(() => copied.set(false), COPIED_MS);
					} catch {
						copied.set(false);
					}
				}}
			>
				<Icon name={copied() ? "check" : "copy"} size={14} />
			</ActionIcon>
		</div>
	);
}

export type ChecklistItemData = {
	/** Item id. */
	id: string;
	/** Item text. */
	label: string;
	/** Whether the item is ticked. */
	done?: boolean | undefined;
};

export type ChecklistSlot = "root" | "item" | "checkbox" | "label";

export type ChecklistProps = SlotProps<ChecklistSlot> & {
	/** The checklist items (controlled). */
	items: ChecklistItemData[];
	/** Called with the updated items after a tick changes. */
	onChange: (items: ChecklistItemData[]) => void;
};

/**
 * Checklist of items with checkboxes.
 * Slots: `root` `item` `checkbox` `label`. Items expose `data-state="done|todo"`.
 */
export function Checklist(input: ChecklistProps) {
	const [props, rest, slot] = setup(
		"Checklist",
		input,
		{},
		["items", "onChange"],
		"root" as ChecklistSlot,
	);
	return (
		<ul {...rest} class={slot.class("root", "a-checklist")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) => (
					<li>
						<label
							class={slot.class("item", "a-checklist-item", item.done && "a-checklist-item-done")}
							style={slot.style("item")}
							data-state={item.done ? "done" : "todo"}
						>
							<input
								type="checkbox"
								class={slot.class("checkbox")}
								checked={Boolean(item.done)}
								onChange={(e: Event) => {
									const box = e.target as HTMLInputElement;
									const done = box.checked;
									props.onChange(props.items.map((x) => (x.id === item.id ? { ...x, done } : x)));
									// Controlled: if the parent rejected the change, snap the box back.
									const current = props.items.find((x) => x.id === item.id);
									box.checked = Boolean(current?.done);
								}}
							/>
							<span class={slot.class("label")}>{item.label}</span>
						</label>
					</li>
				)}
			</For>
		</ul>
	);
}

export type FeatureListSlot = "root" | "item" | "icon" | "label";

export type FeatureListProps = SlotProps<FeatureListSlot> & {
	/** Features, one per line. */
	items: string[];
	/** Icon before each feature. */
	icon?: IconName | undefined;
};

/**
 * List of features with check icons.
 * Slots: `root` `item` `icon` `label`.
 */
export function FeatureList(input: FeatureListProps) {
	const [props, rest, slot] = setup(
		"FeatureList",
		input,
		{},
		["items", "icon"],
		"root" as FeatureListSlot,
	);
	return (
		<ul {...rest} class={slot.class("root", "a-feature-list")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) => (
					<li class={slot.class("item")} style={slot.style("item")}>
						<span class={slot.class("icon")} aria-hidden="true">
							<Icon name={props.icon ?? "check"} size={14} />
						</span>
						<span class={slot.class("label")}>{item}</span>
					</li>
				)}
			</For>
		</ul>
	);
}

export type PricingCardSlot =
	| "root"
	| "name"
	| "price"
	| "period"
	| "description"
	| "features"
	| "action";

export type PricingCardProps = SlotProps<PricingCardSlot> & {
	/** Plan name. */
	name: string;
	/** Price text, e.g. `$20`. */
	price: string;
	/** Billing period after the price, e.g. `per month`. */
	period?: string | undefined;
	/** Short pitch under the name. */
	description?: string | undefined;
	/** Features included in the plan. */
	features?: string[] | undefined;
	/** Emphasise this plan (e.g. the recommended one). */
	highlighted?: boolean | undefined;
	/** Call to action at the bottom, e.g. a `Button`. */
	action?: unknown;
};

/**
 * Pricing plan card with price, features and a call to action.
 * Slots: `root` `name` `price` `period` `description` `features` `action`. State: `data-highlighted`.
 */
export function PricingCard(input: PricingCardProps) {
	const [props, rest, slot] = setup(
		"PricingCard",
		input,
		{},
		["name", "price", "period", "description", "features", "highlighted", "action"],
		"root" as PricingCardSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-pricing", props.highlighted && "a-pricing-hl")}
			style={slot.style("root")}
			data-highlighted={props.highlighted ? "" : undefined}
		>
			<p class={slot.class("name", "a-pricing-name")}>{props.name}</p>
			<p class={slot.class("price", "a-pricing-price")}>
				<span>{props.price}</span>
				<Show when={props.period}>
					<small class={slot.class("period")}>/{props.period}</small>
				</Show>
			</p>
			<Show when={props.description}>
				<p class={slot.class("description", "a-pricing-desc")}>{props.description}</p>
			</Show>
			<Show when={props.features?.length}>
				<FeatureList class={slot.class("features")} items={props.features ?? []} />
			</Show>
			<Show when={props.action}>
				<div class={slot.class("action", "a-pricing-action")}>{props.action}</div>
			</Show>
		</div>
	);
}

export type StatGroupProps = BaseProps & {
	/** The `Stat`s to show side by side. */
	children?: unknown;
};

/**
 * Row of statistics.
 * Slots: `root`.
 */
export function StatGroup(input: StatGroupProps) {
	const [props, rest, slot] = setup("StatGroup", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-stat-group")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type DotPaginationSlot = "root" | "dot";

export type DotPaginationProps = SlotProps<DotPaginationSlot> & {
	/** Number of dots (pages or slides). */
	count: number;
	/** Index of the current dot (0-based). */
	value: number;
	/** Called with the index the user picks. */
	onChange: (index: number) => void;
	/** Accessible name (default "Pagination"). */
	label?: string | undefined;
};

/**
 * Dot indicators for carousels and slides.
 * Slots: `root` `dot`. Dots expose `data-state="active|inactive"`.
 */
export function DotPagination(input: DotPaginationProps) {
	const [props, rest, slot] = setup(
		"DotPagination",
		input,
		{},
		["count", "value", "onChange", "label"],
		"root" as DotPaginationSlot,
	);
	const dots = () => Array.from({ length: Math.max(0, Math.floor(props.count) || 0) }, (_, i) => i);
	return (
		<div
			aria-label={props.label ?? "Pagination"}
			{...rest}
			class={slot.class("root", "a-dots")}
			style={slot.style("root")}
			role="tablist"
		>
			<For each={dots()}>
				{(i) => (
					<button
						type="button"
						role="tab"
						aria-selected={props.value === i}
						aria-label={`Page ${i + 1}`}
						class={slot.class("dot", "a-dots-item", props.value === i && "a-dots-item-active")}
						style={slot.style("dot")}
						data-state={props.value === i ? "active" : "inactive"}
						onClick={() => props.onChange(i)}
					/>
				)}
			</For>
		</div>
	);
}

export type BackLinkSlot = "root" | "icon" | "label";

export type BackLinkProps = SlotProps<BackLinkSlot> & {
	/** Render as a link. */
	href?: string | undefined;
	/** Click handler (renders a button when there is no `href`). */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Link text. */
	children?: unknown;
};

/**
 * "Back" link with an arrow.
 * Slots: `root` `icon` `label`. Renders `<a>` when `href` is set.
 */
export function BackLink(input: BackLinkProps) {
	const [props, rest, slot] = setup(
		"BackLink",
		input,
		{},
		["href", "onClick", "children"],
		"root" as BackLinkSlot,
	);
	const content = (
		<>
			<span class={slot.class("icon")} aria-hidden="true">
				<Icon name="arrow-left" size={14} />
			</span>
			<span class={slot.class("label")}>{props.children ?? "Back"}</span>
		</>
	);
	if (props.href !== undefined) {
		return (
			<a
				{...rest}
				href={props.href}
				class={slot.class("root", "a-back-link")}
				style={slot.style("root")}
				onClick={(e: MouseEvent) => props.onClick?.(e)}
			>
				{content}
			</a>
		);
	}
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-back-link")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{content}
		</button>
	);
}

export type NextPrevSlot = "root" | "prev" | "next";

export type NextPrevProps = SlotProps<NextPrevSlot> & {
	/** Shows the previous link; called when it is pressed. */
	onPrev?: (() => void) | undefined;
	/** Shows the next link; called when it is pressed. */
	onNext?: (() => void) | undefined;
	/** Title of the previous page. */
	prevLabel?: string | undefined;
	/** Title of the next page. */
	nextLabel?: string | undefined;
	/** Disables the previous link (e.g. on the first page). */
	prevDisabled?: boolean | undefined;
	/** Disables the next link (e.g. on the last page). */
	nextDisabled?: boolean | undefined;
};

/**
 * Previous / next navigation pair.
 * Slots: `root` `prev` `next`.
 */
export function NextPrev(input: NextPrevProps) {
	const [props, rest, slot] = setup(
		"NextPrev",
		input,
		{},
		["onPrev", "onNext", "prevLabel", "nextLabel", "prevDisabled", "nextDisabled"],
		"root" as NextPrevSlot,
	);
	return (
		<nav
			aria-label="Previous and next"
			{...rest}
			class={slot.class("root", "a-nextprev")}
			style={slot.style("root")}
		>
			<Button
				size="sm"
				variant="ghost"
				class={slot.class("prev")}
				disabled={props.prevDisabled || !props.onPrev}
				onClick={() => props.onPrev?.()}
			>
				← {props.prevLabel ?? "Previous"}
			</Button>
			<Button
				size="sm"
				variant="ghost"
				class={slot.class("next")}
				disabled={props.nextDisabled || !props.onNext}
				onClick={() => props.onNext?.()}
			>
				{props.nextLabel ?? "Next"} →
			</Button>
		</nav>
	);
}

export type FileCardSlot = "root" | "icon" | "text" | "name" | "meta" | "remove";

export type FileCardProps = SlotProps<FileCardSlot> & {
	/** File name. */
	name: string;
	/** Small line, e.g. size and type. */
	meta?: string | undefined;
	/** File icon. */
	icon?: IconName | undefined;
	/** Shows a remove button; called when it is pressed. */
	onRemove?: (() => void) | undefined;
};

/**
 * Attached file with icon, name, metadata and remove action.
 * Slots: `root` `icon` `text` `name` `meta` `remove`.
 */
export function FileCard(input: FileCardProps) {
	const [props, rest, slot] = setup(
		"FileCard",
		input,
		{},
		["name", "meta", "icon", "onRemove"],
		"root" as FileCardSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-file-card")} style={slot.style("root")}>
			<span class={slot.class("icon", "a-file-card-icon")} aria-hidden="true">
				<Icon name={props.icon ?? "file"} size={18} />
			</span>
			<span class={slot.class("text", "a-file-card-text")}>
				<span class={slot.class("name", "a-file-card-name")}>{props.name}</span>
				<Show when={props.meta}>
					<span class={slot.class("meta", "a-file-card-meta")}>{props.meta}</span>
				</Show>
			</span>
			<Show when={props.onRemove}>
				<ActionIcon
					class={slot.class("remove")}
					label={`Remove ${props.name}`}
					size="sm"
					onClick={() => props.onRemove?.()}
				>
					<Icon name="x" size={14} />
				</ActionIcon>
			</Show>
		</div>
	);
}

export type VideoFrameSlot = "root" | "frame";

export type VideoFrameProps = SlotProps<VideoFrameSlot> & {
	/** Embed URL (YouTube, Vimeo, or any page that can be framed). */
	src: string;
	/** Accessible title of the embedded frame. */
	title?: string | undefined;
	/** Width divided by height, e.g. `16 / 9`. */
	ratio?: number | undefined;
};

/** Responsive iframe embed. Slots: `root` `frame`. */
export function VideoFrame(input: VideoFrameProps) {
	const [props, rest, slot] = setup(
		"VideoFrame",
		input,
		{},
		["src", "title", "ratio"],
		"root" as VideoFrameSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-video")}
			style={slot.style("root", { "aspect-ratio": String(props.ratio ?? 16 / 9) })}
		>
			<iframe
				class={slot.class("frame", "a-video-frame")}
				style={slot.style("frame")}
				src={props.src}
				title={props.title ?? "Video"}
				allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
				allowfullscreen
			/>
		</div>
	);
}

export type SteppedProgressSlot = "root" | "segment";

export type SteppedProgressProps = SlotProps<SteppedProgressSlot> & {
	/** Number of segments. */
	steps: number;
	/** Completed segments. */
	value: number;
	/** Accessible name (default "Progress"). */
	label?: string | undefined;
};

/**
 * Progress split into discrete steps.
 * Slots: `root` `segment`. Segments expose `data-state="done|current|todo"`.
 */
export function SteppedProgress(input: SteppedProgressProps) {
	const [props, rest, slot] = setup(
		"SteppedProgress",
		input,
		{},
		["steps", "value", "label"],
		"root" as SteppedProgressSlot,
	);
	const n = () => Math.max(1, Math.floor(props.steps) || 1);
	const segments = () => Array.from({ length: n() }, (_, i) => i);
	const state = (i: number) => {
		if (i === props.value - 1) return "current";
		return i < props.value ? "done" : "todo";
	};
	return (
		<div
			aria-label={props.label ?? "Progress"}
			{...rest}
			class={slot.class("root", "a-stepped")}
			style={slot.style("root")}
			role="progressbar"
			aria-valuenow={props.value}
			aria-valuemin={0}
			aria-valuemax={n()}
		>
			<For each={segments()}>
				{(i) => (
					<span
						class={slot.class(
							"segment",
							"a-stepped-seg",
							i < props.value && "a-stepped-seg-done",
							i === props.value - 1 && "a-stepped-seg-current",
						)}
						style={slot.style("segment")}
						data-state={state(i)}
					/>
				)}
			</For>
		</div>
	);
}

export type HeatmapSlot = "root" | "cell";

export type HeatmapProps = SlotProps<HeatmapSlot> & {
	/** Flat values, typically 7 columns (weeks × days). */
	values: number[];
	/** Cells per row (e.g. 7 for weeks). */
	columns?: number | undefined;
	/** Accessible summary (default "Activity heatmap"). */
	label?: string | undefined;
};

const HEAT_FLOOR = 0.15;

/**
 * Grid heatmap of values (e.g. activity).
 * Slots: `root` `cell`. Cells expose `--a-heat` (0–1 intensity) for custom colour ramps.
 */
export function Heatmap(input: HeatmapProps) {
	const [props, rest, slot] = setup(
		"Heatmap",
		input,
		{},
		["values", "columns", "label"],
		"root" as HeatmapSlot,
	);
	const cols = () => Math.max(1, props.columns ?? 7);
	const safe = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
	const max = () => props.values.reduce((m, v) => Math.max(m, safe(v)), 1);
	return (
		<div
			aria-label={props.label ?? "Activity heatmap"}
			{...rest}
			class={slot.class("root", "a-heatmap")}
			style={slot.style("root", { "grid-template-columns": `repeat(${cols()}, 1fr)` })}
			role="img"
		>
			<For each={props.values}>
				{(v) => {
					const intensity = () => safe(v) / max();
					return (
						<span
							class={slot.class("cell", "a-heatmap-cell")}
							style={slot.style("cell", {
								opacity: String(HEAT_FLOOR + intensity() * (1 - HEAT_FLOOR)),
								"--a-heat": String(intensity()),
							})}
							title={String(v)}
						/>
					);
				}}
			</For>
		</div>
	);
}

export type AngleSliderSlot = "root" | "svg" | "track" | "hub" | "arm" | "knob" | "label";

export type AngleSliderProps = SlotProps<AngleSliderSlot> & {
	/** Angle in degrees, 0–359 (controlled). */
	value: number;
	/** Called with the new angle while dragging or using the arrow keys. */
	onChange: (deg: number) => void;
	/** Diameter in pixels. */
	size?: number | undefined;
	/** Accessible name (default "Angle"). */
	label?: string | undefined;
	/** Degrees per arrow key press (default 5). */
	step?: number | undefined;
};

const KNOB_RADIUS = 7;
const TRACK_INSET = 8;

/**
 * Circular slider for an angle.
 * Slots: `root` `svg` `track` `arm` `knob` `label`.
 */
export function AngleSlider(input: AngleSliderProps) {
	const [props, rest, slot] = setup(
		"AngleSlider",
		input,
		{ size: 120, step: 5 },
		["value", "onChange", "size", "label", "step"],
		"root" as AngleSliderSlot,
	);
	const size = () => props.size ?? 120;
	const r = () => size() / 2 - TRACK_INSET;
	const center = () => size() / 2;
	const rad = () => (((Number.isFinite(props.value) ? props.value : 0) - 90) * Math.PI) / 180;
	const x = () => center() + r() * Math.cos(rad());
	const y = () => center() + r() * Math.sin(rad());
	/** The arm starts at the hub's edge so it never crosses the value label. */
	const hub = () => Math.min(r() * 0.42, 26);
	const hubX = () => center() + hub() * Math.cos(rad());
	const hubY = () => center() + hub() * Math.sin(rad());
	const step = () => props.step ?? 5;

	const setFromEvent = (e: PointerEvent) => {
		const el = e.currentTarget as HTMLElement;
		const rect = el.getBoundingClientRect();
		const dx = e.clientX - (rect.left + rect.width / 2);
		const dy = e.clientY - (rect.top + rect.height / 2);
		let deg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
		if (deg < 0) deg += 360;
		props.onChange(Math.round(deg) % 360);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const delta =
			e.key === "ArrowRight" || e.key === "ArrowUp"
				? step()
				: e.key === "ArrowLeft" || e.key === "ArrowDown"
					? -step()
					: 0;
		if (delta === 0) return;
		e.preventDefault();
		props.onChange((((props.value + delta) % 360) + 360) % 360);
	};

	return (
		<div
			aria-label={props.label ?? "Angle"}
			{...rest}
			class={slot.class("root", "a-angle")}
			style={slot.style("root", { width: `${size()}px`, height: `${size()}px` })}
			onPointerDown={(e: PointerEvent) => {
				(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
				setFromEvent(e);
			}}
			onPointerMove={(e: PointerEvent) => {
				if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) {
					setFromEvent(e);
				}
			}}
			role="slider"
			aria-valuemin={0}
			aria-valuemax={359}
			aria-valuenow={props.value}
			aria-valuetext={`${props.value} degrees`}
			tabIndex={0}
			onKeyDown={onKeyDown}
		>
			<svg
				class={slot.class("svg")}
				width={size()}
				height={size()}
				viewBox={`0 0 ${size()} ${size()}`}
				aria-hidden="true"
			>
				<circle
					class={slot.class("track", "a-angle-track")}
					cx={center()}
					cy={center()}
					r={r()}
					fill="none"
				/>
				<circle class={slot.class("hub", "a-angle-hub")} cx={center()} cy={center()} r={hub()} />
				<line class={slot.class("arm", "a-angle-arm")} x1={hubX()} y1={hubY()} x2={x()} y2={y()} />
				<circle class={slot.class("knob", "a-angle-knob")} cx={x()} cy={y()} r={KNOB_RADIUS} />
			</svg>
			<span class={slot.class("label", "a-angle-label")}>{props.value}°</span>
		</div>
	);
}

export type ProseProps = BaseProps & {
	/** Cap the line length for readability (default true). */
	measure?: boolean | undefined;
	/** Long-form content (headings, paragraphs, lists, links, code). */
	children?: unknown;
};

/**
 * Typographic container for rich text (headings, paragraphs, lists, links),
 * e.g. rendered Markdown. Slots: `root`.
 */
export function Prose(input: ProseProps) {
	const [props, rest, slot] = setup("Prose", input, { measure: true }, ["measure", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-prose", props.measure === false && "a-prose-full")}
			style={slot.style("root")}
		>
			{props.children}
		</div>
	);
}

export type BleedProps = BaseProps & {
	/** How far to extend past the container on each side (any CSS length). */
	x?: string | undefined;
	/** Content to extend. */
	children?: unknown;
};

/** Negative horizontal margin to break out of padding. Slots: `root`. */
export function Bleed(input: BleedProps) {
	const [props, rest, slot] = setup("Bleed", input, {}, ["x", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-bleed")}
			style={slot.style("root", {
				"margin-left": props.x ?? "-1rem",
				"margin-right": props.x ?? "-1rem",
			})}
		>
			{props.children}
		</div>
	);
}

export type InsetProps = BaseProps & {
	/** Recessed content. */
	children?: unknown;
};

/**
 * Recessed panel (canvas background, border) for secondary content inside a surface.
 * Slots: `root`.
 */
export function Inset(input: InsetProps) {
	const [props, rest, slot] = setup("Inset", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-inset")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type KanbanColumnSlot = "root" | "header" | "title" | "count" | "body";

export type KanbanColumnProps = SlotProps<KanbanColumnSlot> & {
	/** Column heading (also its accessible name). */
	title: string;
	/** Column id reported to `KanbanBoard` `onMove`; enables dropping cards here. */
	columnId?: string | undefined;
	/** Number shown next to the title, e.g. the card count. */
	count?: number | undefined;
	/** The column's `KanbanCard`s. */
	children?: unknown;
};

/**
 * Kanban column with title, count and cards.
 * Slots: `root` `header` `title` `count` `body`.
 */
export function KanbanColumn(input: KanbanColumnProps) {
	const [props, rest, slot] = setup(
		"KanbanColumn",
		input,
		{},
		["title", "columnId", "count", "children"],
		"root" as KanbanColumnSlot,
	);
	return (
		<section
			aria-label={props.title}
			{...rest}
			data-column-id={props.columnId}
			class={slot.class("root", "a-kanban-col")}
			style={slot.style("root")}
		>
			<header class={slot.class("header", "a-kanban-col-head")} style={slot.style("header")}>
				<strong class={slot.class("title")}>{props.title}</strong>
				<Show when={props.count != null}>
					<span class={slot.class("count", "a-kanban-count")}>{props.count}</span>
				</Show>
			</header>
			<div class={slot.class("body", "a-kanban-col-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</section>
	);
}

export type KanbanCardSlot = "root" | "title" | "meta";

export type KanbanCardProps = SlotProps<KanbanCardSlot> & {
	/** Card title. */
	title: string;
	/** Card id reported to `KanbanBoard` `onMove`; makes the card draggable. */
	cardId?: string | undefined;
	/** Small line, e.g. issue number or assignee. */
	meta?: string | undefined;
	/** Called when the card is clicked (e.g. to open it). */
	onClick?: ((e: MouseEvent) => void) | undefined;
};

/**
 * Card in a kanban column.
 * Slots: `root` `title` `meta`.
 */
export function KanbanCard(input: KanbanCardProps) {
	const [props, rest, slot] = setup(
		"KanbanCard",
		input,
		{},
		["title", "cardId", "meta", "onClick"],
		"root" as KanbanCardSlot,
	);
	return (
		<button
			aria-keyshortcuts={
				props.cardId ? "Alt+ArrowLeft Alt+ArrowRight Alt+ArrowUp Alt+ArrowDown" : undefined
			}
			{...rest}
			type="button"
			data-card-id={props.cardId}
			draggable={props.cardId ? "true" : undefined}
			class={slot.class("root", "a-kanban-card")}
			style={slot.style("root")}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			<span class={slot.class("title", "a-kanban-card-title")}>{props.title}</span>
			<Show when={props.meta}>
				<span class={slot.class("meta", "a-kanban-card-meta")}>{props.meta}</span>
			</Show>
		</button>
	);
}

/** Alt+arrow moves: across columns or within one. */
const KANBAN_STEPS: Record<string, { axis: "column" | "position"; delta: 1 | -1 }> = {
	ArrowLeft: { axis: "column", delta: -1 },
	ArrowRight: { axis: "column", delta: 1 },
	ArrowUp: { axis: "position", delta: -1 },
	ArrowDown: { axis: "position", delta: 1 },
};

export type KanbanBoardProps = BaseProps & {
	/**
	 * Called when a card is dropped on a column or moved with Alt+arrow keys.
	 * `index` is the position in the target column (without the moved card).
	 * Update your data; the board keeps focus on the moved card.
	 */
	onMove?: ((cardId: string, toColumnId: string, index: number) => void) | undefined;
	/** Accessible name for the board. Default "Board". */
	label?: string | undefined;
	/** The board's `KanbanColumn`s. */
	children?: unknown;
};

const columnOf = (el: Element | null) => el?.closest<HTMLElement>("[data-column-id]") ?? null;
const cardsIn = (column: Element, except?: string) =>
	[...column.querySelectorAll<HTMLElement>("[data-card-id]")].filter(
		(c) => c.dataset["cardId"] !== except,
	);

/** Drop position from the pointer: before the first card whose middle is below it. */
function dropIndex(column: Element, cardId: string, clientY: number | undefined): number {
	const cards = cardsIn(column, cardId);
	if (clientY === undefined) return cards.length;
	const index = cards.findIndex((c) => {
		const r = c.getBoundingClientRect();
		return clientY < r.top + r.height / 2;
	});
	return index < 0 ? cards.length : index;
}

/**
 * Horizontal board of kanban columns. With `onMove`, cards (`cardId`) can be
 * dragged between columns (`columnId`) or moved with Alt+←/→ (column) and
 * Alt+↑/↓ (position); moves are announced to screen readers. Slots: `root`.
 */
export function KanbanBoard(input: KanbanBoardProps) {
	const [props, rest, slot] = setup("KanbanBoard", input, { label: "Board" }, [
		"onMove",
		"label",
		"children",
	]);
	const announcement = signal("");
	let root: HTMLElement | undefined;
	let dragging: string | undefined;

	const columns = () => (root ? [...root.querySelectorAll<HTMLElement>("[data-column-id]")] : []);
	const move = (cardId: string, column: HTMLElement, index: number) => {
		const to = column.dataset["columnId"];
		if (!to || !props.onMove) return;
		const title = root?.querySelector(`[data-card-id="${cardId}"]`)?.textContent?.trim() ?? cardId;
		props.onMove(cardId, to, index);
		announcement.set(
			`Moved ${title} to ${column.getAttribute("aria-label") ?? to}, position ${index + 1}.`,
		);
		// The parent re-renders the card in its new column: keep focus on it.
		queueMicrotask(() => root?.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`)?.focus());
	};

	/** Alt+←/→ → neighbouring column (appended); Alt+↑/↓ → one position up/down. */
	const keyTarget = (
		key: string,
		card: HTMLElement,
		column: HTMLElement,
		id: string,
	): [HTMLElement, number] | undefined => {
		const step = KANBAN_STEPS[key];
		if (!step) return undefined;
		if (step.axis === "column") {
			const all = columns();
			const target = all[all.indexOf(column) + step.delta];
			return target ? [target, cardsIn(target, id).length] : undefined;
		}
		const next = cardsIn(column).indexOf(card) + step.delta;
		return next >= 0 && next < cardsIn(column).length ? [column, next] : undefined;
	};

	const onKeyDown = (e: KeyboardEvent) => {
		const card = (e.target as HTMLElement).closest<HTMLElement>("[data-card-id]");
		const column = columnOf(card);
		const id = card?.dataset["cardId"];
		if (!e.altKey || !card || !column || !id || !props.onMove) return;
		const target = keyTarget(e.key, card, column, id);
		if (!target) return;
		e.preventDefault();
		move(id, ...target);
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: a board of columns, not a form fieldset (no legend, no form semantics)
		<div
			aria-label={props.label}
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			role="group"
			class={slot.class("root", "a-kanban")}
			style={slot.style("root")}
			onKeyDown={onKeyDown}
			onDragStart={(e: DragEvent) => {
				const card = (e.target as HTMLElement).closest<HTMLElement>("[data-card-id]");
				dragging = card?.dataset["cardId"];
				if (!dragging || !e.dataTransfer) return;
				e.dataTransfer.setData("text/plain", dragging);
				e.dataTransfer.effectAllowed = "move";
				card?.setAttribute("data-dragging", "");
			}}
			onDragOver={(e: DragEvent) => {
				const column = columnOf(e.target as Element);
				if (!column || !dragging) return;
				e.preventDefault();
				if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
				for (const c of columns()) c.toggleAttribute("data-drop-target", c === column);
			}}
			onDrop={(e: DragEvent) => {
				const column = columnOf(e.target as Element);
				const id = e.dataTransfer?.getData("text/plain") || dragging;
				if (!column || !id) return;
				e.preventDefault();
				move(id, column, dropIndex(column, id, e.clientY));
			}}
			onDragEnd={() => {
				dragging = undefined;
				for (const c of columns()) c.removeAttribute("data-drop-target");
				root?.querySelector("[data-dragging]")?.removeAttribute("data-dragging");
			}}
		>
			{props.children}
			<div role="status" aria-live="polite" class="a-sr-only">
				{announcement()}
			</div>
		</div>
	);
}
