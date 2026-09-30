import { For, omitProps, Show } from "@arachnejs/render";
import { effect } from "@arachnejs/signals";
import { rovingIndex, whenConnected } from "./focus.ts";
import { createScrollOverflow, watchScrollOverflow } from "./scroll-overflow.ts";
import { createId, createSlots, type SlotProps, withDefaults } from "./system.ts";

export type TabItem = {
	/** Tab id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Tab label (text or content). */
	label: unknown;
	/** Shown but can't be selected; skipped by arrow keys. */
	disabled?: boolean | undefined;
	/** Leading icon or content. */
	icon?: unknown;
	/** Trailing content, e.g. a count badge. */
	badge?: unknown;
	/** Panel content; when any item has one, Tabs renders linked `tabpanel`s. */
	panel?: unknown;
};

export type TabsSlot =
	| "root"
	| "viewport"
	| "list"
	| "tab"
	| "icon"
	| "badge"
	| "indicator"
	| "panel"
	| "scroll";

export type TabsProps = SlotProps<TabsSlot> & {
	/** The tabs, in order. */
	items: TabItem[];
	/** Id of the selected tab. */
	value: string;
	/** Called with the id of the tab the user selects. */
	onChange: (id: string) => void;
	/** `line` (underline), `pills`, `enclosed` (card tabs) or `segmented`. */
	variant?: "line" | "pills" | "enclosed" | "segmented" | undefined;
	/** Tab height and text size. */
	size?: "sm" | "md" | "lg" | undefined;
	/** Stretch tabs to fill the row. */
	grow?: boolean | undefined;
	/** `auto` selects on arrow focus (default); `manual` waits for Enter/Space. */
	activation?: "auto" | "manual" | undefined;
	/** Accessible name for the tablist. */
	label?: string | undefined;
};

const OWN_KEYS = [
	"items",
	"value",
	"onChange",
	"variant",
	"size",
	"grow",
	"activation",
	"label",
	"id",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

const SCROLL_STEP = 160;

/**
 * WAI-ARIA tabs: roving tabindex, ← → Home End, linked panels, animated
 * indicator (transform only), overflow scroll buttons.
 * Slots: `root` `viewport` `list` `tab` `icon` `badge` `indicator` `panel` `scroll`.
 * Indicator geometry is exposed as `--a-tab-x` / `--a-tab-w` on the list.
 */
export function Tabs(input: TabsProps) {
	const props = withDefaults("Tabs", { variant: "line", size: "md", activation: "auto" }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<TabsSlot>("Tabs", props);
	const id = createId("tabs", props.id);
	const scroll = createScrollOverflow();
	let list: HTMLElement | undefined;

	const tabId = (item: TabItem) => `${id}-tab-${item.id}`;
	const panelId = (item: TabItem) => `${id}-panel-${item.id}`;
	const hasPanels = () => props.items.some((item) => item.panel !== undefined);
	const activeItem = () => props.items.find((item) => item.id === props.value);
	const focusTarget = () =>
		activeItem() && !activeItem()?.disabled
			? props.value
			: props.items.find((item) => !item.disabled)?.id;

	const tabs = () => (list ? [...list.querySelectorAll<HTMLElement>('[role="tab"]')] : []);

	const onKeyDown = (e: KeyboardEvent) => {
		const nodes = tabs();
		const current = nodes.indexOf(document.activeElement as HTMLElement);
		if (current < 0) return;
		if (props.activation === "manual" && (e.key === "Enter" || e.key === " ")) {
			e.preventDefault();
			const item = props.items[current];
			if (item && !item.disabled) props.onChange(item.id);
			return;
		}
		const next = rovingIndex(e.key, current, nodes.length, (i) =>
			Boolean(props.items[i]?.disabled),
		);
		if (next === null) return;
		e.preventDefault();
		nodes[next]?.focus();
		const item = props.items[next];
		if (item && props.activation !== "manual") props.onChange(item.id);
	};

	watchScrollOverflow(
		scroll,
		() => list,
		() => {
			props.items;
			props.value;
		},
	);

	const view = (
		<div
			{...rest}
			id={props.id}
			class={slot.class(
				"root",
				"a-tabs-shell",
				`a-tabs-${props.variant}`,
				props.size !== "md" && `a-tabs-${props.size}`,
				props.grow && "a-tabs-grow",
				scroll.overflowing() && "a-tabs-overflow",
			)}
			style={slot.style("root")}
			data-variant={props.variant}
		>
			<div class="a-tabs-bar">
				<Show when={scroll.overflowing()}>
					<button
						type="button"
						class={slot.class("scroll", "a-tabs-scroll")}
						aria-label="Scroll tabs left"
						tabindex="-1"
						disabled={!scroll.canLeft()}
						onClick={() => scroll.scrollBy(-SCROLL_STEP)}
					>
						‹
					</button>
				</Show>
				<div
					class={slot.class(
						"viewport",
						"a-tabs-viewport",
						scroll.canLeft() && "a-tabs-fade-left",
						scroll.canRight() && "a-tabs-fade-right",
					)}
					style={slot.style("viewport")}
				>
					<div
						ref={(el: HTMLElement) => {
							list = el;
						}}
						class={slot.class("list", "a-tabs-track")}
						style={slot.style("list")}
						role="tablist"
						aria-label={props.label}
						aria-orientation="horizontal"
						onKeyDown={onKeyDown}
					>
						<For each={props.items}>
							{(item) => {
								const active = () => props.value === item.id;
								return (
									<button
										type="button"
										role="tab"
										id={tabId(item)}
										aria-selected={active()}
										aria-controls={hasPanels() ? panelId(item) : undefined}
										tabindex={focusTarget() === item.id ? "0" : "-1"}
										disabled={item.disabled}
										data-tab-id={item.id}
										data-state={active() ? "active" : "inactive"}
										class={slot.class("tab", "a-tab", active() && "a-tab-active")}
										style={slot.style("tab")}
										onClick={() => {
											if (!item.disabled) props.onChange(item.id);
										}}
									>
										<Show when={item.icon}>
											<span class={slot.class("icon", "a-tab-icon")} aria-hidden="true">
												{item.icon}
											</span>
										</Show>
										<span class="a-tab-label">{item.label}</span>
										<Show when={item.badge !== undefined}>
											<span class={slot.class("badge", "a-tab-badge")}>{item.badge}</span>
										</Show>
									</button>
								);
							}}
						</For>
						<span class={slot.class("indicator", "a-tabs-indicator")} aria-hidden="true" />
					</div>
				</div>
				<Show when={scroll.overflowing()}>
					<button
						type="button"
						class={slot.class("scroll", "a-tabs-scroll")}
						aria-label="Scroll tabs right"
						tabindex="-1"
						disabled={!scroll.canRight()}
						onClick={() => scroll.scrollBy(SCROLL_STEP)}
					>
						›
					</button>
				</Show>
			</div>
			<Show when={hasPanels() && activeItem()}>
				{(item: TabItem) => (
					<div
						role="tabpanel"
						id={panelId(item)}
						aria-labelledby={tabId(item)}
						tabindex="0"
						class={slot.class("panel", "a-tabs-panel")}
						style={slot.style("panel")}
					>
						{item.panel}
					</div>
				)}
			</Show>
		</div>
	);

	// Slide the indicator to the active tab; re-measure on resize.
	const measure = () => {
		if (!list) return;
		const el = tabs().find((node) => node.dataset["tabId"] === props.value);
		if (!el) {
			list.style.setProperty("--a-tab-w", "0");
			return;
		}
		list.style.setProperty("--a-tab-x", `${el.offsetLeft}px`);
		list.style.setProperty("--a-tab-w", `${el.offsetWidth}`);
		// Enable the slide only after the first real measurement.
		if (el.offsetWidth > 0)
			requestAnimationFrame(() => list?.setAttribute("data-indicator-ready", ""));
		const { scrollLeft, clientWidth } = list;
		if (el.offsetLeft < scrollLeft || el.offsetLeft + el.offsetWidth > scrollLeft + clientWidth) {
			el.scrollIntoView?.({ inline: "nearest", block: "nearest" });
		}
	};

	effect(() => {
		props.value;
		props.items;
		return whenConnected(
			() => list,
			(el) => {
				measure();
				const raf = requestAnimationFrame(measure);
				const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : undefined;
				ro?.observe(el);
				return () => {
					cancelAnimationFrame(raf);
					ro?.disconnect();
				};
			},
		);
	});

	return view;
}
