import { omitProps, Show } from "@arachne/render";
import { effect } from "@arachne/signals";
import { Button } from "./button.tsx";
import { watchClickOutside } from "./click-outside.ts";
import { autoPosition } from "./floating.ts";
import { whenConnected } from "./focus.ts";
import { watchEscape } from "./layers.ts";
import { createPresence } from "./motion.ts";
import { createId, createSlots, type SlotProps, withDefaults } from "./system.ts";

export type PopoverPlacement =
	| "bottom-start"
	| "bottom-end"
	| "bottom"
	| "top-start"
	| "top-end"
	| "top";

/** Attributes to spread on a custom trigger so it stays wired for a11y. */
export type PopoverTriggerApi = {
	/** Whether the panel is open. */
	open: boolean;
	/** Opens or closes the panel. */
	toggle: () => void;
	/** ARIA and event attributes to spread onto your trigger element. */
	attrs: {
		"aria-expanded": boolean;
		"aria-controls": string;
		"aria-haspopup": "dialog";
		onClick: () => void;
	};
};

export type PopoverSlot = "root" | "trigger" | "panel" | "arrow";

export type PopoverProps = SlotProps<PopoverSlot> & {
	/** Whether the panel is open (controlled). */
	open: boolean;
	/** Called with the next open state (trigger click, Escape, outside click). */
	onOpenChange: (open: boolean) => void;
	/** Label for the built-in trigger button */
	label?: unknown;
	/** Render your own trigger: `trigger={(t) => <MyButton {...t.attrs} />}`. */
	trigger?: ((api: PopoverTriggerApi) => unknown) | undefined;
	/** Preferred side and alignment; flips and shifts to stay in view. */
	placement?: PopoverPlacement | undefined;
	/** Show a small arrow pointing at the trigger. */
	arrow?: boolean | undefined;
	/** Accessible name for the panel (defaults to the trigger label when it's text). */
	panelLabel?: string | undefined;
	/** Panel content. */
	children?: unknown;
};

const OWN_KEYS = [
	"open",
	"onOpenChange",
	"label",
	"trigger",
	"placement",
	"arrow",
	"panelLabel",
	"children",
	"id",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/**
 * Click-to-toggle panel anchored to a trigger. Escape / outside click close it
 * and return focus to the trigger.
 * Slots: `root` `trigger` `panel` `arrow`.
 */
export function Popover(input: PopoverProps) {
	const props = withDefaults("Popover", { placement: "bottom-start" }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<PopoverSlot>("Popover", props);
	const id = `${createId("popover", props.id)}-panel`;
	const presence = createPresence(() => props.open);
	let host: HTMLElement | undefined;
	let panel: HTMLElement | undefined;

	const setOpen = (open: boolean) => props.onOpenChange(open);
	const toggle = () => setOpen(!props.open);
	const triggerEl = () => host?.querySelector<HTMLElement>(`[aria-controls="${id}"]`) ?? undefined;

	watchClickOutside(
		() => props.open,
		() => host,
		() => setOpen(false),
	);
	watchEscape(
		() => props.open,
		() => {
			setOpen(false);
			triggerEl()?.focus();
		},
	);

	const triggerApi = (): PopoverTriggerApi => ({
		open: props.open,
		toggle,
		attrs: {
			"aria-expanded": props.open,
			"aria-controls": id,
			"aria-haspopup": "dialog",
			onClick: toggle,
		},
	});

	const view = (
		<div
			{...rest}
			id={props.id}
			ref={(el: HTMLElement) => {
				host = el;
			}}
			class={slot.class("root", "a-popover-host")}
			style={slot.style("root")}
			data-state={props.open ? "open" : "closed"}
		>
			{props.trigger ? (
				props.trigger(triggerApi())
			) : (
				<Button
					variant="ghost"
					size="sm"
					class={slot.class("trigger", "a-popover-trigger")}
					aria-expanded={props.open}
					aria-controls={id}
					aria-haspopup="dialog"
					onClick={toggle}
				>
					{props.label ?? "Open"}
				</Button>
			)}
			<Show when={presence.mounted()}>
				<div
					ref={(el: HTMLElement) => {
						panel = el;
						presence.ref(el);
					}}
					id={id}
					class={slot.class("panel", "a-popover")}
					style={slot.style("panel")}
					role="dialog"
					aria-label={
						props.panelLabel ?? (typeof props.label === "string" ? props.label : undefined)
					}
					data-state={presence.state()}
					data-placement={props.placement}
				>
					<Show when={props.arrow}>
						<span class={slot.class("arrow", "a-popover-arrow")} aria-hidden="true" />
					</Show>
					{props.children}
				</div>
			</Show>
		</div>
	);

	effect(() => {
		if (!presence.mounted()) return;
		return whenConnected(
			() => panel,
			(el) => {
				const anchor = triggerEl() ?? host;
				return anchor
					? autoPosition(anchor, el, () => props.placement ?? "bottom-start")
					: undefined;
			},
		);
	});

	// Return focus to the trigger when the panel closes while it held focus.
	effect(() => {
		if (!props.open) return;
		const panel = () => document.getElementById(id);
		return () => {
			const active = document.activeElement;
			if (!active || active === document.body || panel()?.contains(active)) triggerEl()?.focus();
		};
	});

	return view;
}
