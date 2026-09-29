/**
 * Bulma-style hierarchical documentation / showcase menu.
 */
import { For, Show } from "@arachne/render";
import { signal } from "@arachne/signals";
import { Icon } from "./icons.tsx";
import { createId, type SlotProps, setup } from "./system.ts";

export type DocMenuItem = {
	id: string;
	label: string;
};

export type DocMenuSection = {
	id: string;
	label: string;
	/** Nested pages. If omitted, the section itself is a selectable leaf. */
	items?: DocMenuItem[] | undefined;
};

export type DocMenuSlot =
	| "root"
	| "brand"
	| "list"
	| "section"
	| "label"
	| "chevron"
	| "items"
	| "link";

export type DocMenuProps = SlotProps<DocMenuSlot> & {
	/** Brand row above the menu (icon + title). */
	brand?: unknown;
	sections: DocMenuSection[];
	value: string;
	onChange: (id: string) => void;
	/** Section ids forced open; others containing `value` open by default. */
	defaultOpen?: string[] | undefined;
	/** Accessible name (default "Documentation"). */
	label?: string | undefined;
};

function sectionContains(section: DocMenuSection, id: string): boolean {
	if (section.id === id) return true;
	return section.items?.some((item) => item.id === id) ?? false;
}

/**
 * Sidebar catalog with collapsible sections.
 * Slots: `root` `brand` `list` `section` `label` `chevron` `items` `link`.
 * Sections expose `data-state` (`open` | `closed`); links `data-state` (`active` | `inactive`).
 */
export function DocMenu(input: DocMenuProps) {
	const [props, rest, slot] = setup(
		"DocMenu",
		input,
		{},
		["brand", "sections", "value", "onChange", "defaultOpen", "label", "id"],
		"root" as DocMenuSlot,
	);
	const baseId = createId("doc-menu", props.id);
	const open = signal<Record<string, boolean>>({});

	const isOpen = (section: DocMenuSection) => {
		const state = open();
		if (section.id in state) return state[section.id] === true;
		if (props.defaultOpen?.includes(section.id)) return true;
		return sectionContains(section, props.value);
	};

	const toggle = (section: DocMenuSection) => {
		const next = { ...open() };
		next[section.id] = !isOpen(section);
		open.set(next);
	};

	const select = (id: string) => {
		props.onChange(id);
	};

	return (
		<nav
			aria-label={props.label ?? "Documentation"}
			{...rest}
			id={props.id}
			class={slot.class("root", "a-doc-menu")}
			style={slot.style("root")}
		>
			<Show when={props.brand}>
				<div class={slot.class("brand", "a-doc-menu-brand")}>{props.brand}</div>
			</Show>
			<ul class={slot.class("list", "a-doc-menu-list")}>
				<For each={props.sections}>
					{(section) => {
						const hasItems = () => (section.items?.length ?? 0) > 0;
						const expanded = () => hasItems() && isOpen(section);
						const leafActive = () => !hasItems() && props.value === section.id;
						const listId = `${baseId}-${section.id}`;
						return (
							<li
								class={slot.class(
									"section",
									"a-doc-menu-section",
									expanded() && "a-doc-menu-section-open",
								)}
								data-state={expanded() ? "open" : "closed"}
							>
								<Show
									when={hasItems()}
									fallback={
										<button
											type="button"
											class={slot.class(
												"label",
												"a-doc-menu-label",
												leafActive() && "a-doc-menu-active",
											)}
											data-state={leafActive() ? "active" : "inactive"}
											aria-current={leafActive() ? "page" : undefined}
											onClick={() => select(section.id)}
										>
											<span>{section.label}</span>
										</button>
									}
								>
									<button
										type="button"
										class={slot.class("label", "a-doc-menu-label")}
										aria-expanded={expanded()}
										aria-controls={listId}
										onClick={() => toggle(section)}
									>
										<span>{section.label}</span>
										<Show
											when={expanded()}
											fallback={
												<Icon
													name="chevron-right"
													size="sm"
													class={slot.class("chevron", "a-doc-menu-chevron")}
												/>
											}
										>
											<Icon
												name="chevron-down"
												size="sm"
												class={slot.class("chevron", "a-doc-menu-chevron")}
											/>
										</Show>
									</button>
								</Show>
								<Show when={expanded()}>
									<ul class={slot.class("items", "a-doc-menu-items")} id={listId}>
										<For each={section.items ?? []}>
											{(item) => {
												const active = () => props.value === item.id;
												return (
													<li>
														<button
															type="button"
															class={slot.class(
																"link",
																"a-doc-menu-link",
																active() && "a-doc-menu-active",
															)}
															data-state={active() ? "active" : "inactive"}
															aria-current={active() ? "page" : undefined}
															onClick={() => select(item.id)}
														>
															{item.label}
														</button>
													</li>
												);
											}}
										</For>
									</ul>
								</Show>
							</li>
						);
					}}
				</For>
			</ul>
		</nav>
	);
}
