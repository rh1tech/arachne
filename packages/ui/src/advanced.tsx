import { For, mergeProps, Portal, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { watchClickOutside } from "./click-outside.ts";
import { cx } from "./cx.ts";
import { DialogFrame, type DialogSlot } from "./dialog.tsx";
import { rovingIndex, trapFocus, whenConnected } from "./focus.ts";
import { Icon } from "./icons.tsx";
import { TextInput } from "./input.tsx";
import { watchEscape } from "./layers.ts";
import { ColorSwatch } from "./overlays-extra.tsx";
import { lockBodyScroll } from "./scroll-lock.ts";
import { createId, type SlotProps, setup } from "./system.ts";
import { ActionIcon } from "./widgets.tsx";

export type ContextMenuItem = {
	/** Item id. */
	id: string;
	/** Item text. */
	label: string;
	/** Destructive action: danger colour. */
	danger?: boolean | undefined;
	/** Shown but can't be chosen. */
	disabled?: boolean | undefined;
	/** Called when the item is chosen; the menu then closes. */
	onSelect: () => void;
};

export type ContextMenuSlot = "root" | "menu" | "item";

export type ContextMenuProps = SlotProps<ContextMenuSlot> & {
	/** Menu items, in order. */
	items: ContextMenuItem[];
	/** The area that opens the menu on right-click, Shift+F10 or the ContextMenu key. */
	children?: unknown;
};

/** Keep a `w`×`h` box at (`x`, `y`) inside the viewport with an 8px margin. */
export function clampToViewport(
	x: number,
	y: number,
	w: number,
	h: number,
	vw = typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerWidth,
	vh = typeof window === "undefined" ? Number.POSITIVE_INFINITY : window.innerHeight,
): { x: number; y: number } {
	const margin = 8;
	return {
		x: Math.max(margin, Math.min(x, vw - w - margin)),
		y: Math.max(margin, Math.min(y, vh - h - margin)),
	};
}

/**
 * Right-click (or Shift+F10 / ContextMenu key) menu. Clamped to the viewport,
 * focuses the first item, ↑ ↓ Home End navigate, Escape restores focus.
 * Slots: `root` `menu` `item`.
 */
export function ContextMenu(input: ContextMenuProps) {
	const [props, rest, slot] = setup(
		"ContextMenu",
		input,
		{},
		["items", "children"],
		"root" as ContextMenuSlot,
	);
	const open = signal(false);
	const pos = signal({ x: 0, y: 0 });
	let menu: HTMLElement | undefined;
	let returnFocus: HTMLElement | null = null;

	const items = () =>
		menu ? [...menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')] : [];
	const close = () => {
		open.set(false);
		if (returnFocus?.isConnected) returnFocus.focus();
		returnFocus = null;
	};
	const openAt = (x: number, y: number) => {
		returnFocus = document.activeElement as HTMLElement | null;
		pos.set({ x, y });
		open.set(true);
	};

	watchClickOutside(
		() => open(),
		() => menu,
		() => open.set(false),
	);
	watchEscape(() => open(), close);

	effect(() => {
		if (!open()) return;
		return whenConnected(
			() => menu,
			(el) => {
				const rect = el.getBoundingClientRect();
				const next = clampToViewport(pos().x, pos().y, rect.width, rect.height);
				if (next.x !== pos().x || next.y !== pos().y) pos.set(next);
				items()
					.find((b) => !b.disabled)
					?.focus({ preventScroll: true });
			},
		);
	});

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: context-menu host listens for contextmenu / Shift+F10
		<div
			{...rest}
			class={slot.class("root", "a-context-host")}
			style={slot.style("root", { display: "block" })}
			onContextMenu={(e: MouseEvent) => {
				e.preventDefault();
				openAt(e.clientX, e.clientY);
			}}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) {
					e.preventDefault();
					const r = (e.target as HTMLElement).getBoundingClientRect();
					openAt(r.left, r.bottom);
				}
			}}
		>
			{props.children}
			<Show when={open()} fallback={null}>
				<Portal>
					<div
						ref={(el: HTMLElement) => {
							menu = el;
						}}
						class={slot.class("menu", "a-context-menu")}
						role="menu"
						style={slot.style("menu", { left: `${pos().x}px`, top: `${pos().y}px` })}
						onKeyDown={(e: KeyboardEvent) => {
							const list = items();
							const current = list.indexOf(document.activeElement as HTMLButtonElement);
							if (e.key === "Tab") {
								e.preventDefault();
								close();
								return;
							}
							const next = rovingIndex(
								e.key,
								current,
								list.length,
								(i) => Boolean(list[i]?.disabled),
								{
									orientation: "vertical",
								},
							);
							if (next === null) return;
							e.preventDefault();
							list[next]?.focus();
						}}
					>
						<For each={props.items}>
							{(item) => (
								<button
									type="button"
									role="menuitem"
									tabindex="-1"
									class={slot.class("item", "a-menu-item", item.danger && "a-menu-item-danger")}
									style={slot.style("item")}
									disabled={item.disabled}
									onClick={() => {
										item.onSelect();
										close();
									}}
								>
									{item.label}
								</button>
							)}
						</For>
					</div>
				</Portal>
			</Show>
		</div>
	);
}

export type ColorPickerSlot = "root" | "native" | "swatches" | "swatch" | "value";

export type ColorPickerProps = SlotProps<ColorPickerSlot> & {
	/** Selected colour (controlled), e.g. `#1e87f0`. */
	value: string;
	/** Preset colours shown as swatches. */
	swatches?: string[] | undefined;
	/** Called with the picked colour. */
	onChange: (color: string) => void;
};

const DEFAULT_SWATCHES = [
	"#1e87f0",
	"#e74c3c",
	"#1f8f4e",
	"#d97706",
	"#7c3aed",
	"#0f172a",
	"#64748b",
	"#ffffff",
];

/**
 * Native color input + swatches.
 * Slots: `root` `native` `swatches` `swatch` `value`.
 */
export function ColorPicker(input: ColorPickerProps) {
	const [props, rest, slot] = setup(
		"ColorPicker",
		input,
		{},
		["value", "swatches", "onChange"],
		"root" as ColorPickerSlot,
	);
	const swatches = () => props.swatches ?? DEFAULT_SWATCHES;
	const value = () => (props.value ?? "").toLowerCase();
	return (
		<div {...rest} class={slot.class("root", "a-color-picker")} style={slot.style("root")}>
			<input
				type="color"
				class={slot.class("native", "a-color-picker-native")}
				style={slot.style("native")}
				aria-label="Custom color"
				value={props.value}
				onInput={(e: Event) => props.onChange((e.target as HTMLInputElement).value)}
			/>
			<fieldset
				class={slot.class("swatches", "a-color-picker-swatches")}
				style={slot.style("swatches", {
					border: "0",
					margin: "0",
					padding: "0",
					"min-inline-size": "0",
				})}
				aria-label="Swatches"
			>
				<For each={swatches()}>
					{(c) => (
						<ColorSwatch
							color={c}
							size={22}
							onClick={() => props.onChange(c)}
							class={slot.class("swatch", value() === c.toLowerCase() && "a-swatch-active")}
						/>
					)}
				</For>
			</fieldset>
			<span class={slot.class("value", "a-color-picker-value")} style={slot.style("value")}>
				{props.value}
			</span>
		</div>
	);
}

export type LightboxImage = {
	/** Image URL. */
	src: string;
	/** Alternative text (also the viewer's accessible name). */
	alt?: string | undefined;
	/** Caption under the image. */
	caption?: string | undefined;
};

export type LightboxSlot =
	| "root"
	| "backdrop"
	| "stage"
	| "image"
	| "caption"
	| "controls"
	| "control";

export type LightboxProps = SlotProps<LightboxSlot> & {
	/** The images, in order. */
	images: LightboxImage[];
	/** Index of the shown image; `null` closes the viewer. */
	index: number | null;
	/** Called on Escape, backdrop click or the close button; set `index` to `null`. */
	onClose: () => void;
	/** Called with the next index when the user moves with ← / → or the arrows. */
	onChange?: ((index: number) => void) | undefined;
};

/** Wrap `index` into `[0, count)`; `null` when there is nothing to show. */
export function wrapIndex(index: number, count: number): number | null {
	if (count <= 0 || !Number.isFinite(index)) return null;
	return ((Math.trunc(index) % count) + count) % count;
}

/**
 * Fullscreen image viewer: focus trap, Escape, ← → between images.
 * Slots: `root` `backdrop` `stage` `image` `caption` `controls` `control`.
 */
export function Lightbox(input: LightboxProps) {
	const [props, rest, slot] = setup(
		"Lightbox",
		input,
		{},
		["images", "index", "onClose", "onChange"],
		"root" as LightboxSlot,
	);
	const count = () => props.images.length;
	const open = () => props.index != null && count() > 0;
	const current = () => {
		const i = props.index == null ? null : wrapIndex(props.index, count());
		return i == null ? undefined : props.images[i];
	};
	const step = (dir: -1 | 1) => {
		if (props.index == null) return;
		const next = wrapIndex(props.index + dir, count());
		if (next != null) props.onChange?.(next);
	};
	let stage: HTMLElement | undefined;

	effect(() => {
		if (!open()) return;
		return lockBodyScroll();
	});
	watchEscape(open, () => props.onClose());

	effect(() => {
		if (!open()) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "ArrowRight") step(1);
			if (e.key === "ArrowLeft") step(-1);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});

	const view = (
		<Show when={open()} fallback={null}>
			<Portal>
				<div
					aria-label={current()?.alt || "Image viewer"}
					{...rest}
					ref={(el: HTMLElement) => {
						stage = el;
					}}
					class={slot.class("root", "a-lightbox")}
					style={slot.style("root")}
					role="dialog"
					aria-modal="true"
				>
					<button
						type="button"
						class={slot.class("backdrop", "a-lightbox-backdrop")}
						style={slot.style("backdrop")}
						aria-label="Close"
						tabindex="-1"
						onClick={() => props.onClose()}
					/>
					<div class={slot.class("stage", "a-lightbox-stage")} style={slot.style("stage")}>
						<Show when={current()}>
							{(image: LightboxImage) => (
								<>
									<img
										class={slot.class("image", "a-lightbox-img")}
										style={slot.style("image")}
										src={image.src}
										alt={image.alt ?? ""}
									/>
									{image.caption ? (
										<p
											class={slot.class("caption", "a-lightbox-caption")}
											style={slot.style("caption")}
										>
											{image.caption}
										</p>
									) : null}
								</>
							)}
						</Show>
					</div>
					<div class={slot.class("controls", "a-lightbox-controls")} style={slot.style("controls")}>
						<ActionIcon
							class={slot.class("control")}
							label="Previous"
							disabled={count() < 2}
							onClick={() => step(-1)}
						>
							<Icon name="chevron-left" />
						</ActionIcon>
						<ActionIcon class={slot.class("control")} label="Close" onClick={() => props.onClose()}>
							<Icon name="x" />
						</ActionIcon>
						<ActionIcon
							class={slot.class("control")}
							label="Next"
							disabled={count() < 2}
							onClick={() => step(1)}
						>
							<Icon name="chevron-right" />
						</ActionIcon>
					</div>
				</div>
			</Portal>
		</Show>
	);

	effect(() => {
		if (!open()) return;
		return whenConnected(
			() => stage,
			(el) => trapFocus(el),
		);
	});

	return view;
}

export type TransferListSlot = "root" | "pane" | "title" | "list" | "item" | "actions";

export type TransferListProps = SlotProps<TransferListSlot> & {
	/** Items in the left list. */
	left: string[];
	/** Items in the right list. */
	right: string[];
	/** Heading of the left list. */
	leftTitle?: string | undefined;
	/** Heading of the right list. */
	rightTitle?: string | undefined;
	/** Called with both lists after items are moved. */
	onChange: (next: { left: string[]; right: string[] }) => void;
};

/**
 * Dual-list mover (Mantine TransferList). Rows keep their DOM between moves.
 * Slots: `root` `pane` `title` `list` `item` `actions`.
 */
export function TransferList(input: TransferListProps) {
	const [props, rest, slot] = setup(
		"TransferList",
		input,
		{},
		["left", "right", "leftTitle", "rightTitle", "onChange"],
		"root" as TransferListSlot,
	);
	const selected = signal<string | null>(null);

	const moveRight = () => {
		const v = selected();
		if (!v || !props.left.includes(v)) return;
		props.onChange({
			left: props.left.filter((x) => x !== v),
			right: [...props.right, v],
		});
		selected.set(null);
	};
	const moveLeft = () => {
		const v = selected();
		if (!v || !props.right.includes(v)) return;
		props.onChange({
			right: props.right.filter((x) => x !== v),
			left: [...props.left, v],
		});
		selected.set(null);
	};

	const pane = (title: () => string, items: () => string[]) => (
		<div class={slot.class("pane", "a-transfer-pane")} style={slot.style("pane")}>
			<p class={slot.class("title", "a-transfer-title")} style={slot.style("title")}>
				{title()}
			</p>
			<ul class={slot.class("list", "a-transfer-list")} style={slot.style("list")}>
				<For each={items()}>
					{(item) => (
						<li>
							<button
								type="button"
								class={slot.class(
									"item",
									"a-transfer-item",
									selected() === item && "a-transfer-item-active",
								)}
								style={slot.style("item")}
								aria-pressed={selected() === item}
								onClick={() => selected.set(item)}
							>
								{item}
							</button>
						</li>
					)}
				</For>
			</ul>
		</div>
	);

	return (
		<div {...rest} class={slot.class("root", "a-transfer")} style={slot.style("root")}>
			{pane(
				() => props.leftTitle ?? "Available",
				() => props.left,
			)}
			<div class={slot.class("actions", "a-transfer-actions")} style={slot.style("actions")}>
				<Button
					size="sm"
					variant="ghost"
					aria-label="Move to selected"
					onClick={moveRight}
					disabled={!selected()}
				>
					→
				</Button>
				<Button
					size="sm"
					variant="ghost"
					aria-label="Move to available"
					onClick={moveLeft}
					disabled={!selected()}
				>
					←
				</Button>
			</div>
			{pane(
				() => props.rightTitle ?? "Selected",
				() => props.right,
			)}
		</div>
	);
}

export type SpotlightAction = {
	/** Action id. */
	id: string;
	/** Action name; what the search matches. */
	label: string;
	/** Secondary line under the label. */
	description?: string | undefined;
	/** Called when the action is chosen; the palette then closes. */
	onSelect: () => void;
};

export type SpotlightSlot =
	| "root"
	| "backdrop"
	| "panel"
	| "input"
	| "list"
	| "option"
	| "label"
	| "description"
	| "empty";

export type SpotlightProps = SlotProps<SpotlightSlot> & {
	/** Whether the palette is shown (controlled). */
	open: boolean;
	/** Actions to search and run. */
	actions: SpotlightAction[];
	/** Called on Escape, backdrop click or after an action runs; set `open` to false. */
	onClose: () => void;
	/** Search field hint. */
	placeholder?: string | undefined;
};

/**
 * Command palette: the search input is a combobox driving a listbox —
 * ↑ ↓ move the active option, Enter runs it, Escape closes.
 * Slots: `root` `backdrop` `panel` `input` `list` `option` `label` `description` `empty`.
 */
export function Spotlight(input: SpotlightProps) {
	const [props, rest, slot] = setup(
		"Spotlight",
		input,
		{},
		["open", "actions", "onClose", "placeholder", "id"],
		"root" as SpotlightSlot,
	);
	const query = signal("");
	const active = signal(0);
	const id = `${createId("spotlight", props.id)}-palette`;
	let panel: HTMLElement | undefined;

	const matches = () => {
		const q = query().trim().toLowerCase();
		if (!q) return props.actions;
		return props.actions.filter(
			(a) =>
				a.label.toLowerCase().includes(q) || (a.description?.toLowerCase().includes(q) ?? false),
		);
	};
	const activeIndex = () => Math.min(active(), Math.max(0, matches().length - 1));
	const optionId = (action: SpotlightAction) => `${id}-option-${action.id}`;
	const run = (action: SpotlightAction | undefined) => {
		if (!action) return;
		action.onSelect();
		props.onClose();
	};

	effect(() => {
		if (!props.open) {
			query.set("");
			active.set(0);
			return;
		}
		return lockBodyScroll();
	});
	watchEscape(
		() => props.open,
		() => props.onClose(),
	);

	const onKeyDown = (e: KeyboardEvent) => {
		const count = matches().length;
		if (e.key === "ArrowDown" || e.key === "ArrowUp") {
			e.preventDefault();
			if (!count) return;
			const dir = e.key === "ArrowDown" ? 1 : -1;
			active.set((activeIndex() + dir + count) % count);
			return;
		}
		if (e.key === "Enter") {
			e.preventDefault();
			run(matches()[activeIndex()]);
		}
	};

	const view = (
		<Show when={props.open} fallback={null}>
			<Portal>
				<div
					aria-label="Command palette"
					{...rest}
					id={props.id}
					class={slot.class("root", "a-spotlight")}
					style={slot.style("root")}
					role="dialog"
					aria-modal="true"
				>
					<button
						type="button"
						class={slot.class("backdrop", "a-spotlight-backdrop")}
						style={slot.style("backdrop")}
						aria-label="Close"
						tabindex="-1"
						onClick={() => props.onClose()}
					/>
					<div
						ref={(el: HTMLElement) => {
							panel = el;
						}}
						class={slot.class("panel", "a-spotlight-panel")}
						style={slot.style("panel")}
						data-a-spotlight=""
					>
						<TextInput
							class={slot.class("input", "a-spotlight-input")}
							value={query()}
							placeholder={props.placeholder ?? "Search actions…"}
							role="combobox"
							aria-expanded="true"
							aria-controls={`${id}-list`}
							aria-autocomplete="list"
							aria-activedescendant={
								matches()[activeIndex()]
									? optionId(matches()[activeIndex()] as SpotlightAction)
									: undefined
							}
							data-autofocus=""
							onKeyDown={onKeyDown}
							onInput={(e: InputEvent) => {
								query.set((e.target as HTMLInputElement).value);
								active.set(0);
							}}
						/>
						<div
							class={slot.class("list", "a-spotlight-list")}
							style={slot.style("list")}
							id={`${id}-list`}
							role="listbox"
							aria-label="Actions"
						>
							<For
								each={matches()}
								fallback={
									<div class={slot.class("empty", "a-spotlight-empty")} style={slot.style("empty")}>
										No results
									</div>
								}
							>
								{(action, i) => (
									// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard is handled by the combobox input (aria-activedescendant)
									// biome-ignore lint/a11y/useFocusableInteractive: options stay unfocused; the combobox input owns focus via aria-activedescendant
									<div
										id={optionId(action)}
										role="option"
										aria-selected={i() === activeIndex()}
										class={slot.class(
											"option",
											"a-spotlight-item",
											i() === activeIndex() && "a-spotlight-item-active",
										)}
										style={slot.style("option")}
										data-state={i() === activeIndex() ? "active" : undefined}
										onMouseEnter={() => active.set(i())}
										onClick={() => run(action)}
									>
										<span
											class={slot.class("label", "a-spotlight-label")}
											style={slot.style("label")}
										>
											{action.label}
										</span>
										{action.description ? (
											<span
												class={slot.class("description", "a-spotlight-desc")}
												style={slot.style("description")}
											>
												{action.description}
											</span>
										) : null}
									</div>
								)}
							</For>
						</div>
					</div>
				</div>
			</Portal>
		</Show>
	);

	effect(() => {
		if (!props.open) return;
		return whenConnected(
			() => panel,
			(el) => trapFocus(el),
		);
	});

	return view;
}

export type ConfirmDialogProps = SlotProps<DialogSlot> & {
	/** Whether the dialog is shown (controlled). */
	open: boolean;
	/** Dialog heading. */
	title?: string | undefined;
	/** The question to confirm. */
	message: string;
	/** Confirm button text. */
	confirmLabel?: string | undefined;
	/** Cancel button text. */
	cancelLabel?: string | undefined;
	/** Destructive action: the confirm button uses the danger style. */
	danger?: boolean | undefined;
	/** Called when the user confirms. */
	onConfirm: () => void;
	/** Called on cancel, Escape or backdrop click. */
	onCancel: () => void;
};

/**
 * Confirmation built on the shared dialog surface (focus trap, Escape,
 * scroll lock, motion). Initial focus goes to Cancel — the safe choice.
 * Slots match Modal (`root` `backdrop` `panel` …); attributes land on the panel.
 */
export function ConfirmDialog(input: ConfirmDialogProps) {
	const [props, rest] = setup(
		"ConfirmDialog",
		input,
		{},
		[
			"open",
			"title",
			"message",
			"confirmLabel",
			"cancelLabel",
			"danger",
			"onConfirm",
			"onCancel",
			"id",
		],
		"panel" as DialogSlot,
	);
	const frame = mergeProps(rest as Record<string, unknown>, {
		get open() {
			return props.open;
		},
		get title() {
			return props.title;
		},
		get description() {
			return props.message;
		},
		get id() {
			return props.id;
		},
		get class() {
			return input.class;
		},
		get style() {
			return input.style;
		},
		get unstyled() {
			return input.unstyled;
		},
		get styles() {
			return input.styles;
		},
		label: "Confirm",
		role: "alertdialog",
		hideClose: true,
		onClose: () => props.onCancel(),
		get classes() {
			return { ...input.classes, root: cx("a-confirm", input.classes?.root) };
		},
		get footer() {
			return (
				<>
					<Button variant="ghost" size="sm" data-autofocus="" onClick={() => props.onCancel()}>
						{props.cancelLabel ?? "Cancel"}
					</Button>
					<Button
						variant={props.danger ? "danger" : undefined}
						size="sm"
						onClick={() => props.onConfirm()}
					>
						{props.confirmLabel ?? "Confirm"}
					</Button>
				</>
			);
		},
	});
	return DialogFrame(frame as Parameters<typeof DialogFrame>[0], {
		name: "ConfirmDialog",
		base: "a-modal",
		modifiers: () => ["a-modal-sm", props.danger && "a-confirm-danger"],
	});
}
