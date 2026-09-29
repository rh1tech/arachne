import { For, omitProps, Show } from "@arachne/render";
import { effect } from "@arachne/signals";
import { watchClickOutside } from "./click-outside.ts";
import { autoPosition } from "./floating.ts";
import { rovingIndex, whenConnected } from "./focus.ts";
import { watchEscape } from "./layers.ts";
import { createPresence } from "./motion.ts";
import { createSlots, type SlotProps, withDefaults } from "./system.ts";

export type MenuAction = {
	type?: "item" | undefined;
	label: unknown;
	onSelect: () => void;
	danger?: boolean | undefined;
	disabled?: boolean | undefined;
	icon?: unknown;
	/** Right-aligned hint, e.g. `⌘K`. */
	shortcut?: string | undefined;
	description?: string | undefined;
};

export type MenuItem = MenuAction | { type: "separator" } | { type: "label"; label: unknown };

export type MenuSlot =
	| "root"
	| "item"
	| "icon"
	| "label"
	| "description"
	| "shortcut"
	| "separator"
	| "group";

export type MenuPlacement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

export type MenuProps = SlotProps<MenuSlot> & {
	open: boolean;
	items: MenuItem[];
	/** Called on outside click / Escape / selection. Prefer with a wrapping `.a-menu-host`. */
	onClose?: (() => void) | undefined;
	placement?: MenuPlacement | undefined;
	/** Accessible name for the menu. */
	label?: string | undefined;
};

const OWN_KEYS = [
	"open",
	"items",
	"onClose",
	"placement",
	"label",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

function isAction(item: MenuItem): item is MenuAction {
	return item.type === undefined || item.type === "item";
}

/**
 * Action menu with roving focus (↑ ↓ Home End, type-ahead), Escape, outside
 * click, focus restore and enter/exit motion.
 * Slots: `root` `item` `icon` `label` `description` `shortcut` `separator` `group`.
 */
export function Menu(input: MenuProps) {
	const props = withDefaults("Menu", { placement: "bottom-start" }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<MenuSlot>("Menu", props);
	const presence = createPresence(() => props.open);
	let panel: HTMLElement | undefined;
	let returnFocus: HTMLElement | null = null;

	const close = () => props.onClose?.();
	const buttons = () =>
		panel ? [...panel.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')] : [];

	watchClickOutside(
		() => props.open && Boolean(props.onClose),
		() => panel?.closest(".a-menu-host") ?? panel,
		close,
	);
	watchEscape(() => props.open && Boolean(props.onClose), close);

	const onKeyDown = (e: KeyboardEvent) => {
		const list = buttons();
		const current = list.indexOf(document.activeElement as HTMLButtonElement);
		if (e.key === "Tab") {
			close();
			return;
		}
		const next = rovingIndex(e.key, current, list.length, (i) => Boolean(list[i]?.disabled), {
			orientation: "vertical",
		});
		if (next !== null) {
			e.preventDefault();
			list[next]?.focus();
			return;
		}
		if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
			const char = e.key.toLowerCase();
			const order = [...list.slice(current + 1), ...list.slice(0, current + 1)];
			order
				.find((b) => !b.disabled && b.textContent?.trim().toLowerCase().startsWith(char))
				?.focus();
		}
	};

	const view = (
		<Show when={presence.mounted()}>
			<div
				aria-label={props.label}
				{...rest}
				ref={(el: HTMLElement) => {
					panel = el;
					presence.ref(el);
				}}
				class={slot.class("root", "a-menu")}
				style={slot.style("root")}
				role="menu"
				aria-orientation="vertical"
				data-state={presence.state()}
				data-placement={props.placement}
				onKeyDown={onKeyDown}
			>
				<For each={props.items}>
					{(item) => {
						if (item.type === "separator") {
							return <hr class={slot.class("separator", "a-menu-separator")} />;
						}
						if (!isAction(item)) {
							return (
								<div class={slot.class("group", "a-menu-group")} role="presentation">
									{item.label}
								</div>
							);
						}
						return (
							<button
								type="button"
								role="menuitem"
								tabindex="-1"
								class={slot.class("item", "a-menu-item", item.danger && "a-menu-item-danger")}
								style={slot.style("item")}
								data-danger={item.danger ? "" : undefined}
								disabled={item.disabled}
								onClick={() => {
									item.onSelect();
									close();
								}}
							>
								<Show when={item.icon}>
									<span class={slot.class("icon", "a-menu-icon")} aria-hidden="true">
										{item.icon}
									</span>
								</Show>
								<span class={slot.class("label", "a-menu-label")}>
									{item.label}
									<Show when={item.description}>
										<span class={slot.class("description", "a-menu-description")}>
											{item.description}
										</span>
									</Show>
								</span>
								<Show when={item.shortcut}>
									<kbd class={slot.class("shortcut", "a-menu-shortcut")}>{item.shortcut}</kbd>
								</Show>
							</button>
						);
					}}
				</For>
			</div>
		</Show>
	);

	// Inside `.a-menu-host`, anchor to the host so the menu flips/shifts and isn't clipped.
	effect(() => {
		if (!presence.mounted()) return;
		return whenConnected(
			() => panel,
			(el) => {
				const host = el.parentElement?.closest(".a-menu-host");
				return host
					? autoPosition(host, el, () => props.placement ?? "bottom-start", { offset: 6 })
					: undefined;
			},
		);
	});

	effect(() => {
		if (!props.open || !presence.mounted()) return;
		returnFocus = document.activeElement as HTMLElement | null;
		const release = whenConnected(
			() => panel,
			() => {
				buttons()
					.find((b) => !b.disabled)
					?.focus({ preventScroll: true });
			},
		);
		return () => {
			release();
			const target = returnFocus;
			returnFocus = null;
			const focusInside = panel?.contains(document.activeElement) ?? false;
			const focusLost = document.activeElement === document.body || !document.activeElement;
			if (target?.isConnected && (focusInside || focusLost)) target.focus({ preventScroll: true });
		};
	});

	return view;
}
