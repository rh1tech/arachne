import { For, Show } from "@arachnejs/render";
import { type SlotProps, setup } from "./system.ts";

export type AppShellSlot = "root" | "sidebar" | "main" | "header" | "content";

export type AppShellProps = SlotProps<AppShellSlot> & {
	/** Content of the side column, e.g. a `SidebarNav`. */
	sidebar?: unknown;
	/** Content of the top bar. */
	header?: unknown;
	/**
	 * Element for the content area (default `"main"`). Use `"div"` when the shell is
	 * nested in a page that already has a `<main>` landmark.
	 */
	contentAs?: "main" | "div" | undefined;
	/** Main content. */
	children?: unknown;
};

/**
 * Application chrome: optional sidebar + header around main content.
 * Slots: `root` `sidebar` `main` `header` `content`.
 */
export function AppShell(input: AppShellProps) {
	const [props, rest, slot] = setup(
		"AppShell",
		input,
		{},
		["sidebar", "header", "contentAs", "children"],
		"root" as AppShellSlot,
	);
	const contentClass = () => slot.class("content", "a-shell-content");
	return (
		<div {...rest} class={slot.class("root", "a-shell")} style={slot.style("root")}>
			<Show when={props.sidebar}>
				<aside class={slot.class("sidebar", "a-shell-sidebar")} style={slot.style("sidebar")}>
					{props.sidebar}
				</aside>
			</Show>
			<div class={slot.class("main", "a-shell-main")} style={slot.style("main")}>
				<Show when={props.header}>
					<header class={slot.class("header", "a-shell-header")} style={slot.style("header")}>
						{props.header}
					</header>
				</Show>
				<Show
					when={props.contentAs === "div"}
					fallback={
						<main class={contentClass()} style={slot.style("content")}>
							{props.children}
						</main>
					}
				>
					<div class={contentClass()} style={slot.style("content")}>
						{props.children}
					</div>
				</Show>
			</div>
		</div>
	);
}

export type SidebarItem = {
	/** Item id, passed to `onChange` and matched against `value`. */
	id: string;
	/** Item text. */
	label: string;
	/** Called when this item is chosen (in addition to `onChange`). */
	onSelect?: (() => void) | undefined;
	/** Shown but can't be chosen. */
	disabled?: boolean | undefined;
};

export type SidebarNavSlot = "root" | "link";

export type SidebarNavProps = SlotProps<SidebarNavSlot> & {
	/** Navigation items, in order. */
	items: SidebarItem[];
	/** Id of the current item (marked `aria-current`). */
	value?: string | undefined;
	/** Called with the id of the item the user picks. */
	onChange?: ((id: string) => void) | undefined;
	/** Accessible name for the nav (default "Sidebar"). */
	label?: string | undefined;
};

/** Vertical nav list. Slots: `root` `link`. Links expose `data-state` (`active` | `inactive`). */
export function SidebarNav(input: SidebarNavProps) {
	const [props, rest, slot] = setup(
		"SidebarNav",
		input,
		{},
		["items", "value", "onChange", "label"],
		"root" as SidebarNavSlot,
	);
	return (
		<nav
			aria-label={props.label ?? "Sidebar"}
			{...rest}
			class={slot.class("root", "a-sidebar-nav")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class("link", "a-sidebar-link", active() && "a-sidebar-link-active")}
							style={slot.style("link")}
							disabled={item.disabled}
							aria-current={active() ? "page" : undefined}
							data-state={active() ? "active" : "inactive"}
							onClick={() => {
								if (item.disabled) return;
								props.onChange?.(item.id);
								item.onSelect?.();
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

export type SegmentedSlot = "root" | "segment";

export type SegmentedProps = SlotProps<SegmentedSlot> & {
	/** Options: `id`, `label` and optional `disabled`. */
	items: Array<{ id: string; label: string; disabled?: boolean | undefined }>;
	/** Accessible name for the group (default "Options"). */
	label?: string | undefined;
	/** Id of the selected option. */
	value: string;
	/** Called with the id the user picks. */
	onChange: (id: string) => void;
};

/** Pressed-button group. Slots: `root` `segment`. Segments expose `data-state`. */
export function Segmented(input: SegmentedProps) {
	const [props, rest, slot] = setup(
		"Segmented",
		input,
		{},
		["items", "label", "value", "onChange"],
		"root" as SegmentedSlot,
	);
	return (
		<fieldset
			aria-label={props.label ?? "Options"}
			{...rest}
			class={slot.class("root", "a-segmented")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class("segment", "a-segment", active() && "a-segment-active")}
							style={slot.style("segment")}
							disabled={item.disabled}
							aria-pressed={active()}
							data-state={active() ? "active" : "inactive"}
							onClick={() => props.onChange(item.id)}
						>
							{item.label}
						</button>
					);
				}}
			</For>
		</fieldset>
	);
}
