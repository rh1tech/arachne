import { For, Show } from "@arachne/render";
import { type SlotProps, setup } from "./system.ts";

export type AppShellSlot = "root" | "sidebar" | "main" | "header" | "content";

export type AppShellProps = SlotProps<AppShellSlot> & {
	sidebar?: unknown;
	header?: unknown;
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
		["sidebar", "header", "children"],
		"root" as AppShellSlot,
	);
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
				<main class={slot.class("content", "a-shell-content")} style={slot.style("content")}>
					{props.children}
				</main>
			</div>
		</div>
	);
}

export type SidebarItem = {
	id: string;
	label: string;
	onSelect?: (() => void) | undefined;
	disabled?: boolean | undefined;
};

export type SidebarNavSlot = "root" | "link";

export type SidebarNavProps = SlotProps<SidebarNavSlot> & {
	items: SidebarItem[];
	value?: string | undefined;
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
	items: Array<{ id: string; label: string; disabled?: boolean | undefined }>;
	/** Accessible name for the group (default "Options"). */
	label?: string | undefined;
	value: string;
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
