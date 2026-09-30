import { For, omitProps, Show } from "@arachnejs/render";
import { createId, createSlots, type SlotProps, withDefaults } from "./system.ts";

export type AccordionItem = {
	/** Item id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Header text or content (the toggle button's label). */
	title: unknown;
	/** Panel content shown when the item is open. */
	content: unknown;
	/** The header can't be toggled. */
	disabled?: boolean | undefined;
	/** Leading icon / avatar next to the title. */
	icon?: unknown;
	/** Secondary line under the title. */
	subtitle?: unknown;
};

export type AccordionSlot =
	| "root"
	| "item"
	| "trigger"
	| "icon"
	| "title"
	| "subtitle"
	| "chevron"
	| "panel"
	| "content";

type AccordionBase = SlotProps<AccordionSlot> & {
	/** The sections, in order. */
	items: AccordionItem[];
	/** `separated` renders each item as its own card. */
	variant?: "default" | "separated" | "flush" | undefined;
	/** Custom chevron (any node); `null` hides it. */
	chevron?: unknown;
};

export type AccordionProps =
	| (AccordionBase & {
			/** Single mode: one item open at a time (`value` is an id or `null`). */
			multiple?: false | undefined;
			/** Id of the open item, or `null` when all are closed. */
			value: string | null;
			/** Called with the id to open, or `null` when the open item is closed. */
			onChange: (id: string | null) => void;
	  })
	| (AccordionBase & {
			multiple: true;
			value: string[];
			onChange: (ids: string[]) => void;
	  });

const OWN_KEYS = [
	"items",
	"value",
	"onChange",
	"multiple",
	"variant",
	"chevron",
	"id",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/**
 * Disclosure list. Panels stay mounted (state and focus survive toggling) and
 * animate height via `grid-template-rows`.
 * Slots: `root` `item` `trigger` `icon` `title` `subtitle` `chevron` `panel` `content`.
 */
export function Accordion(input: AccordionProps) {
	const props = withDefaults("Accordion", { variant: "default" }, input) as AccordionProps;
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<AccordionSlot>("Accordion", props);
	const id = createId("accordion", props.id);

	const isOpen = (itemId: string) =>
		props.multiple ? props.value.includes(itemId) : props.value === itemId;

	const toggle = (itemId: string) => {
		if (props.multiple) {
			const next = isOpen(itemId)
				? props.value.filter((v) => v !== itemId)
				: [...props.value, itemId];
			props.onChange(next);
			return;
		}
		props.onChange(isOpen(itemId) ? null : itemId);
	};

	return (
		<div
			{...rest}
			id={props.id}
			class={slot.class(
				"root",
				"a-accordion",
				props.variant !== "default" && `a-accordion-${props.variant}`,
			)}
			style={slot.style("root")}
			data-variant={props.variant}
		>
			<For each={props.items}>
				{(item) => {
					const open = () => isOpen(item.id);
					const state = () => (open() ? "open" : "closed");
					const triggerId = `${id}-trigger-${item.id}`;
					const panelId = `${id}-panel-${item.id}`;
					return (
						<div
							class={slot.class("item", "a-accordion-item", open() && "a-accordion-item-open")}
							style={slot.style("item")}
							data-state={state()}
						>
							<h3 class="a-accordion-heading">
								<button
									type="button"
									id={triggerId}
									class={slot.class("trigger", "a-accordion-trigger")}
									style={slot.style("trigger")}
									aria-expanded={open()}
									aria-controls={panelId}
									disabled={item.disabled}
									data-state={state()}
									onClick={() => toggle(item.id)}
								>
									<Show when={item.icon}>
										<span class={slot.class("icon", "a-accordion-icon")} aria-hidden="true">
											{item.icon}
										</span>
									</Show>
									<span class="a-accordion-heading-text">
										<span class={slot.class("title", "a-accordion-title")}>{item.title}</span>
										<Show when={item.subtitle}>
											<span class={slot.class("subtitle", "a-accordion-subtitle")}>
												{item.subtitle}
											</span>
										</Show>
									</span>
									<Show when={props.chevron !== null}>
										<span class={slot.class("chevron", "a-accordion-chevron")} aria-hidden="true">
											{props.chevron ?? <Chevron />}
										</span>
									</Show>
								</button>
							</h3>
							<section
								id={panelId}
								aria-labelledby={triggerId}
								class={slot.class("panel", "a-accordion-panel")}
								style={slot.style("panel")}
								data-state={state()}
								inert={!open()}
							>
								<div
									class={slot.class("content", "a-accordion-content")}
									style={slot.style("content")}
								>
									{item.content}
								</div>
							</section>
						</div>
					);
				}}
			</For>
		</div>
	);
}

function Chevron() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path
				d="M6 9l6 6 6-6"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
			/>
		</svg>
	);
}
