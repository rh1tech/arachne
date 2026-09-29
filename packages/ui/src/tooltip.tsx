import { omitProps, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { autoPosition } from "./floating.ts";
import { whenConnected } from "./focus.ts";
import { watchEscape } from "./layers.ts";
import { createPresence } from "./motion.ts";
import { createId, createSlots, type SlotProps, withDefaults } from "./system.ts";

export type TooltipSlot = "root" | "target" | "tooltip" | "arrow";

export type TooltipProps = SlotProps<TooltipSlot> & {
	content: unknown;
	placement?: "top" | "bottom" | "left" | "right" | undefined;
	/** Delay before showing on hover, ms (default 250). Focus shows immediately. */
	openDelay?: number | undefined;
	/** Delay before hiding, ms (default 80) — lets the pointer reach the tooltip. */
	closeDelay?: number | undefined;
	arrow?: boolean | undefined;
	disabled?: boolean | undefined;
	children?: unknown;
};

const OWN_KEYS = [
	"content",
	"placement",
	"openDelay",
	"closeDelay",
	"arrow",
	"disabled",
	"children",
	"id",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/**
 * Hover/focus tooltip linked with `aria-describedby`; Escape dismisses and the
 * tooltip itself is hoverable (WCAG 1.4.13).
 * Slots: `root` `target` `tooltip` `arrow`.
 */
export function Tooltip(input: TooltipProps) {
	const props = withDefaults(
		"Tooltip",
		{ placement: "top", openDelay: 250, closeDelay: 80, arrow: true },
		input,
	);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<TooltipSlot>("Tooltip", props);
	const id = `${createId("tooltip", props.id)}-tip`;
	const open = signal(false);
	const presence = createPresence(() => open() && !props.disabled);
	let timer: ReturnType<typeof setTimeout> | undefined;
	let target: HTMLElement | undefined;
	let tip: HTMLElement | undefined;

	const schedule = (next: boolean, delay: number) => {
		clearTimeout(timer);
		if (delay <= 0) open.set(next);
		else timer = setTimeout(() => open.set(next), delay);
	};
	const show = (delay = props.openDelay ?? 0) => schedule(true, delay);
	const hide = () => schedule(false, props.closeDelay ?? 0);

	watchEscape(
		() => open(),
		() => schedule(false, 0),
	);
	effect(() => () => clearTimeout(timer));

	const view = (
		// biome-ignore lint/a11y/noStaticElementInteractions: hover bridge; keyboard users get focus handlers on the target
		<span
			{...rest}
			id={props.id}
			class={slot.class("root", "a-tooltip-host")}
			style={slot.style("root")}
			onMouseEnter={() => show()}
			onMouseLeave={hide}
		>
			<span
				ref={(el: HTMLElement) => {
					target = el;
				}}
				class={slot.class("target", "a-tooltip-target")}
				style={slot.style("target")}
				aria-describedby={props.disabled ? undefined : id}
				onFocusIn={() => show(0)}
				onFocusOut={() => schedule(false, 0)}
			>
				{props.children}
			</span>
			<Show when={presence.mounted()}>
				<span
					ref={(el: HTMLElement) => {
						tip = el;
						presence.ref(el);
					}}
					id={id}
					role="tooltip"
					class={slot.class("tooltip", "a-tooltip", `a-tooltip-${props.placement}`)}
					style={slot.style("tooltip")}
					data-state={presence.state()}
					data-placement={props.placement}
				>
					{props.content}
					<Show when={props.arrow}>
						<span class={slot.class("arrow", "a-tooltip-arrow")} aria-hidden="true" />
					</Show>
				</span>
			</Show>
		</span>
	);

	// Flip/shift against the viewport; escapes overflow clipping via position: fixed.
	effect(() => {
		if (!presence.mounted()) return;
		return whenConnected(
			() => tip,
			(el) => (target ? autoPosition(target, el, () => props.placement ?? "top") : undefined),
		);
	});

	return view;
}
