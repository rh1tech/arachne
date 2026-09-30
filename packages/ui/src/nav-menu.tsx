import { For, Portal, Show } from "@arachnejs/render";
import { effect, signal } from "@arachnejs/signals";
import { rovingIndex, trapFocus, whenConnected } from "./focus.ts";
import { lockBodyScroll } from "./scroll-lock.ts";
import { createScrollOverflow, watchScrollOverflow } from "./scroll-overflow.ts";
import { type BaseProps, createId, type SlotProps, type Slots, setup } from "./system.ts";

export type NavMenuItem = {
	/** Item id; used by the controller to track open submenus. */
	id: string;
	/** Menu text. */
	label: string;
	/** Link target (renders a link). */
	href?: string | undefined;
	/** Marks the current page (`aria-current`). */
	active?: boolean | undefined;
	/** Shown but can't be chosen. */
	disabled?: boolean | undefined;
	/** Called when the item is chosen. */
	onSelect?: (() => void) | undefined;
	/** Nested items, shown as a submenu. */
	children?: NavMenuItem[] | undefined;
};

export type NavMenuTrigger = "hover" | "click";

export type NavbarController = {
	/** Ids of the open submenus, outermost first. */
	openPath: () => string[];
	/** Whether the mobile menu is expanded. */
	mobileOpen: () => boolean;
	/** Whether the submenu with this id is open. */
	isOpen: (id: string) => boolean;
	/** Opens the submenus along `path` (and closes the others). */
	openTo: (path: string[]) => void;
	/** Opens or closes the submenu at the end of `path`. */
	toggle: (path: string[]) => void;
	/** Closes every submenu. */
	closeAll: () => void;
	/** Closes the submenus after a short delay (hover intent). */
	scheduleClose: () => void;
	/** Cancels a pending `scheduleClose`. */
	cancelClose: () => void;
	/** Expands or collapses the mobile menu. */
	setMobileOpen: (open: boolean) => void;
	/** Toggles the mobile menu. */
	toggleMobile: () => void;
	/** Clears timers; call when the navbar is removed. */
	dispose: () => void;
};

export type CreateNavbarControllerOptions = {
	/** Desktop submenu trigger. Mobile always uses click. Default: hover */
	trigger?: NavMenuTrigger | undefined;
};

export function createNavbarController(
	_options: CreateNavbarControllerOptions = {},
): NavbarController {
	const openPath = signal<string[]>([]);
	const mobileOpen = signal(false);
	let leaveTimer: ReturnType<typeof setTimeout> | undefined;

	const clearLeave = () => {
		if (leaveTimer !== undefined) {
			clearTimeout(leaveTimer);
			leaveTimer = undefined;
		}
	};

	const onDocClick = (e: MouseEvent) => {
		const target = e.target;
		if (!(target instanceof Element)) return;
		// Mobile drawer is portaled to body, outside `.a-navbar`.
		if (target.closest(".a-navbar-mobile")) return;
		if (target.closest(".a-nav-sub") || target.closest(".a-nav-flyout")) return;
		if (target.closest(".a-navbar")) return;
		clearLeave();
		openPath.set([]);
		mobileOpen.set(false);
	};

	const onKeyDown = (e: KeyboardEvent) => {
		if (e.key !== "Escape") return;
		clearLeave();
		openPath.set([]);
		mobileOpen.set(false);
	};

	if (typeof document !== "undefined") {
		document.addEventListener("click", onDocClick);
		document.addEventListener("keydown", onKeyDown);
	}

	const api: NavbarController = {
		openPath: () => openPath(),
		mobileOpen: () => mobileOpen(),
		isOpen(id) {
			return openPath().includes(id);
		},
		openTo(path) {
			clearLeave();
			openPath.set([...path]);
		},
		toggle(path) {
			clearLeave();
			const id = path[path.length - 1];
			if (!id) return;
			if (openPath().includes(id)) {
				openPath.set(path.slice(0, -1));
				return;
			}
			openPath.set([...path]);
		},
		closeAll() {
			clearLeave();
			openPath.set([]);
		},
		scheduleClose() {
			clearLeave();
			leaveTimer = setTimeout(() => {
				openPath.set([]);
				leaveTimer = undefined;
			}, 180);
		},
		cancelClose() {
			clearLeave();
		},
		setMobileOpen(open) {
			clearLeave();
			mobileOpen.set(open);
			if (!open) openPath.set([]);
		},
		toggleMobile() {
			api.setMobileOpen(!mobileOpen());
		},
		dispose() {
			clearLeave();
			if (typeof document !== "undefined") {
				document.removeEventListener("click", onDocClick);
				document.removeEventListener("keydown", onKeyDown);
			}
		},
	};

	return api;
}

export type NavbarSlot =
	| "root"
	| "brand"
	| "desktop"
	| "shell"
	| "scroll"
	| "viewport"
	| "track"
	| "list"
	| "item"
	| "link"
	| "end"
	| "burger"
	| "mobile"
	| "backdrop"
	| "panel"
	| "header"
	| "title"
	| "close";

type NavContext = {
	ctrl: NavbarController;
	trigger: NavMenuTrigger;
	mode: "desktop" | "mobile";
	slot: Slots<NavbarSlot>;
	onNavigate?: (() => void) | undefined;
	/** Per-navbar id scoping DOM lookups (flyouts are portaled). */
	owner: string;
};

type BranchInfo = { depth: number; ancestors: string[]; ctx: NavContext };

/** Enabled menuitems that are direct children of a (menubar|menu) list. */
function menuItemsOf(list: Element | null | undefined): HTMLElement[] {
	if (!list) return [];
	return [...list.children]
		.map((li) => li.firstElementChild as HTMLElement | null)
		.filter(
			(el): el is HTMLElement =>
				!!el &&
				el.getAttribute("role") === "menuitem" &&
				!(el as HTMLButtonElement).disabled &&
				el.getAttribute("aria-disabled") !== "true",
		);
}

const byOwner = (owner: string, attr: string, id: string) =>
	document.querySelector<HTMLElement>(`[data-nav-owner="${owner}"][${attr}="${id}"]`);

/** Roving tab stop on the menubar: focus `index`, make it the only Tab stop. */
function roveMenubar(owner: string, index: number): void {
	const bar = menuItemsOf(document.querySelector(`[data-nav-owner="${owner}"][role="menubar"]`));
	const target = bar[(index + bar.length) % bar.length];
	if (!target) return;
	for (const el of bar) el.setAttribute("tabindex", el === target ? "0" : "-1");
	target.focus();
}

function focusMenuEdge(owner: string, id: string, edge: "first" | "last"): void {
	const items = menuItemsOf(byOwner(owner, "data-nav-menu", id));
	(edge === "first" ? items[0] : items[items.length - 1])?.focus();
}

/** Move to the adjacent top-level item (closing submenus). */
function stepMenubar(owner: string, ctrl: NavbarController, topId: string, delta: number): void {
	ctrl.closeAll();
	const bar = menuItemsOf(document.querySelector(`[data-nav-owner="${owner}"][role="menubar"]`));
	const from = bar.findIndex((el) => el.dataset["navTrigger"] === topId);
	roveMenubar(owner, from + delta);
}

type NavKey = {
	e: KeyboardEvent;
	branch: BranchInfo;
	items: HTMLElement[];
	index: number;
	id: string;
	hasPopup: boolean;
};

function consume(e: KeyboardEvent): void {
	e.preventDefault();
	e.stopPropagation();
}

/** Top-level bar: ← → Home End rove; ↓ ↑ open the submenu at its first/last item. */
function menubarKey({ e, branch, items, index, id, hasPopup }: NavKey): void {
	const { ctrl, owner } = branch.ctx;
	const next = rovingIndex(e.key, index, items.length, () => false, { orientation: "horizontal" });
	if (next !== null) {
		consume(e);
		if (ctrl.openPath().length) ctrl.closeAll();
		roveMenubar(owner, next);
	} else if (hasPopup && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
		consume(e);
		ctrl.openTo([id]);
		focusMenuEdge(owner, id, e.key === "ArrowDown" ? "first" : "last");
	}
}

/** Horizontal step out of a submenu: → opens a nested menu or moves right; ← closes a level or moves left. */
function menuSideKey({ e, branch, id, hasPopup }: NavKey): void {
	const { ctrl, owner } = branch.ctx;
	const top = branch.ancestors[0] ?? "";
	consume(e);
	if (e.key === "ArrowRight") {
		if (hasPopup) {
			ctrl.openTo([...branch.ancestors, id]);
			focusMenuEdge(owner, id, "first");
		} else stepMenubar(owner, ctrl, top, 1);
		return;
	}
	if (branch.depth > 1) {
		// `ancestors` ends with this menu's own trigger: close this level only.
		ctrl.openTo(branch.ancestors.slice(0, -1));
		byOwner(
			owner,
			"data-nav-trigger",
			branch.ancestors[branch.ancestors.length - 1] ?? "",
		)?.focus();
	} else stepMenubar(owner, ctrl, top, -1);
}

/** Inside a submenu: ↑ ↓ Home End move, ← → change level, Escape returns to the bar. */
function menuKey(key: NavKey): void {
	const { e, branch, items, index } = key;
	const { ctrl, owner } = branch.ctx;
	const next = rovingIndex(e.key, index, items.length, () => false, { orientation: "vertical" });
	if (next !== null) {
		consume(e);
		items[next]?.focus();
	} else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
		menuSideKey(key);
	} else if (e.key === "Escape") {
		consume(e);
		ctrl.closeAll();
		byOwner(owner, "data-nav-trigger", branch.ancestors[0] ?? "")?.focus();
	} else if (e.key === "Tab") {
		ctrl.closeAll();
	}
}

/** WAI-ARIA menubar keyboard model for the desktop navbar. */
function onNavKeyDown(e: KeyboardEvent, branch: BranchInfo): void {
	if (branch.ctx.mode !== "desktop" || e.ctrlKey || e.metaKey || e.altKey) return;
	const target = e.target as HTMLElement;
	const items = menuItemsOf(e.currentTarget as HTMLElement);
	const index = items.indexOf(target);
	if (index < 0) return;
	const key: NavKey = {
		e,
		branch,
		items,
		index,
		id: target.dataset["navTrigger"] ?? "",
		hasPopup: target.getAttribute("aria-haspopup") === "menu",
	};
	if (branch.depth === 0) menubarKey(key);
	else menuKey(key);
}

type BranchProps = {
	items: NavMenuItem[];
	depth: number;
	ancestors: string[];
	ctx: NavContext;
	/** Top-level desktop submenu rendered in a fixed flyout (avoids scroll clipping). */
	flyout?: boolean | undefined;
};

type ItemProps = {
	item: NavMenuItem;
	depth: number;
	ancestors: string[];
	ctx: NavContext;
	index?: number | undefined;
};

/** Desktop: the menubar is one Tab stop (first item); menu items are reached by arrows. */
const navTabIndex = (props: ItemProps): string | undefined =>
	props.ctx.mode !== "desktop" ? undefined : props.depth === 0 && props.index === 0 ? "0" : "-1";

function NavFlyout(props: {
	/** Trigger element the flyout anchors to (scoped to this navbar). */
	anchor: () => HTMLElement | undefined;
	items: NavMenuItem[];
	ancestors: string[];
	ctx: NavContext;
}) {
	const pos = signal("visibility:hidden");
	effect(() => {
		const sync = () => {
			const trigger = props.anchor();
			if (!trigger) return;
			const r = trigger.getBoundingClientRect();
			pos.set(
				`position:fixed;top:${Math.round(r.bottom + 4)}px;left:${Math.round(r.left)}px;z-index:var(--a-z-dropdown, 60)`,
			);
		};
		sync();
		window.addEventListener("resize", sync);
		window.addEventListener("scroll", sync, true);
		return () => {
			window.removeEventListener("resize", sync);
			window.removeEventListener("scroll", sync, true);
		};
	});
	return (
		<Portal>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: hover bridge keeps the flyout open; keyboard uses the menu buttons */}
			<div
				class="a-nav-flyout"
				style={pos()}
				onMouseEnter={() => props.ctx.ctrl.cancelClose()}
				onMouseLeave={() => props.ctx.ctrl.scheduleClose()}
			>
				<NavBranch
					items={props.items}
					depth={1}
					ancestors={props.ancestors}
					ctx={{ ...props.ctx, mode: "desktop" }}
					flyout
				/>
			</div>
		</Portal>
	);
}

type TriggerProps = ItemProps & {
	hasKids: boolean;
	open: () => boolean;
	setTrigger: (el: HTMLElement) => void;
	activate: () => void;
	path: string[];
};

/** Leaf item with `href`: a real link so middle-click / new tab work. */
function NavLeafLink(props: TriggerProps) {
	const { slot } = props.ctx;
	return (
		<a
			ref={props.setTrigger}
			role="menuitem"
			tabindex={navTabIndex(props)}
			href={props.item.disabled ? undefined : props.item.href}
			data-nav-trigger={props.item.id}
			data-nav-owner={props.ctx.owner}
			class={slot.class("link", "a-nav-link", props.item.active && "a-nav-link-active")}
			aria-current={props.item.active ? "page" : undefined}
			aria-disabled={props.item.disabled || undefined}
			onClick={(e: MouseEvent) => {
				if (props.item.disabled) {
					e.preventDefault();
					return;
				}
				// Let modified clicks open new tabs without closing menus.
				if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
				props.activate();
			}}
		>
			<span class="a-nav-link-label">{props.item.label}</span>
		</a>
	);
}

/** Parent (submenu toggle) or action leaf without `href`. */
function NavTriggerButton(props: TriggerProps) {
	const { slot } = props.ctx;
	const caret = () => (props.ctx.mode === "mobile" || props.depth === 0 ? "▾" : "▸");
	return (
		<button
			ref={props.setTrigger}
			type="button"
			role="menuitem"
			tabindex={navTabIndex(props)}
			data-nav-trigger={props.item.id}
			data-nav-owner={props.ctx.owner}
			class={slot.class("link", "a-nav-link", props.item.active && "a-nav-link-active")}
			disabled={props.item.disabled}
			aria-current={!props.hasKids && props.item.active ? "page" : undefined}
			aria-haspopup={props.hasKids ? "menu" : undefined}
			aria-expanded={props.hasKids ? props.open() : undefined}
			onClick={(e: MouseEvent) => {
				e.stopPropagation();
				if (props.item.disabled) return;
				if (props.hasKids) props.ctx.ctrl.toggle(props.path);
				else props.activate();
			}}
		>
			<span class="a-nav-link-label">{props.item.label}</span>
			<Show when={props.hasKids}>
				<span class="a-nav-caret" aria-hidden="true">
					{caret()}
				</span>
			</Show>
		</button>
	);
}

function NavItem(props: ItemProps) {
	const { ctrl, slot } = props.ctx;
	const kids = props.item.children ?? [];
	const hasKids = kids.length > 0;
	const path = [...props.ancestors, props.item.id];
	const open = () => ctrl.isOpen(props.item.id);
	const hover = () => props.ctx.mode === "desktop" && props.ctx.trigger === "hover";
	let triggerEl: HTMLElement | undefined;
	const useFlyout = () =>
		props.ctx.mode === "desktop" && props.depth === 0 && hasKids && !ctrl.mobileOpen();

	const trigger: TriggerProps = {
		...props,
		hasKids,
		open,
		path,
		setTrigger: (el) => {
			triggerEl = el;
		},
		activate: () => {
			if (props.item.disabled) return;
			props.item.onSelect?.();
			ctrl.closeAll();
			props.ctx.onNavigate?.();
		},
	};

	return (
		<li
			class={slot.class(
				"item",
				"a-nav-item",
				hasKids && "a-nav-item-parent",
				open() && "a-nav-item-open",
				props.item.active && "a-nav-item-active",
				props.item.disabled && "a-nav-item-disabled",
			)}
			role="none"
			onMouseEnter={() => {
				if (!hover()) return;
				ctrl.cancelClose();
				ctrl.openTo(hasKids ? path : props.ancestors);
			}}
			onMouseLeave={() => {
				if (hover()) ctrl.scheduleClose();
			}}
		>
			{!hasKids && props.item.href ? (
				<NavLeafLink {...trigger} />
			) : (
				<NavTriggerButton {...trigger} />
			)}
			<Show when={hasKids && open()}>
				{useFlyout() ? (
					<NavFlyout anchor={() => triggerEl} items={kids} ancestors={path} ctx={props.ctx} />
				) : (
					<NavBranch items={kids} depth={props.depth + 1} ancestors={path} ctx={props.ctx} />
				)}
			</Show>
		</li>
	);
}

function NavBranch(props: BranchProps) {
	return (
		<ul
			class={props.ctx.slot.class(
				"list",
				"a-nav-list",
				props.depth > 0 && (props.flyout ? "a-nav-flyout-menu" : "a-nav-sub"),
				props.depth > 1 && "a-nav-sub-nested",
				props.ctx.mode === "mobile" && "a-nav-list-mobile",
			)}
			role={props.depth === 0 ? "menubar" : "menu"}
			data-nav-owner={props.ctx.owner}
			data-nav-menu={props.depth > 0 ? props.ancestors[props.ancestors.length - 1] : undefined}
			onKeyDown={(e: KeyboardEvent) => onNavKeyDown(e, props)}
		>
			<For each={props.items}>
				{(item, index) => (
					<NavItem
						item={item}
						index={index()}
						depth={props.depth}
						ancestors={props.ancestors}
						ctx={props.ctx}
					/>
				)}
			</For>
		</ul>
	);
}

export type NavbarPlacement = "static" | "sticky" | "fixed";

export type NavbarProps = SlotProps<NavbarSlot> & {
	/** Logo or name at the start of the bar. */
	brand?: unknown;
	/** Top-level items; items with `children` open submenus. */
	items: NavMenuItem[];
	/** Content at the end of the bar, e.g. buttons. */
	end?: unknown;
	/** Desktop submenu open mode. Mobile always uses click. Default: hover */
	trigger?: NavMenuTrigger | undefined;
	/** Pin the bar to the top of the scrollport / viewport. Default: static */
	placement?: NavbarPlacement | undefined;
	/** Pass a stable controller from `createNavbarController()` (required for multiple navbars). */
	ctrl: NavbarController;
	/** Accessible name for the desktop `<nav>` (default "Primary"). */
	label?: string | undefined;
};

/**
 * Responsive navbar with nested menus (hover or click), overflow scrolling and
 * a mobile drawer (focus trap, scroll lock). Nested lists take the `list` /
 * `item` / `link` slots.
 * Slots: `root` `brand` `desktop` `shell` `scroll` `viewport` `track` `list` `item` `link`
 * `end` `burger` `mobile` `backdrop` `panel` `header` `title` `close`.
 */
export function Navbar(input: NavbarProps) {
	const [props, rest, slot] = setup(
		"Navbar",
		input,
		{ placement: "static", trigger: "hover" },
		["brand", "items", "end", "trigger", "placement", "ctrl", "label"],
		"root" as NavbarSlot,
	);
	const trackId = createId("navbar-track");
	const scroll = createScrollOverflow();
	let mobilePanel: HTMLElement | undefined;
	watchScrollOverflow(
		scroll,
		() => trackId,
		() => {
			props.items;
		},
	);

	effect(() => {
		if (!props.ctrl.mobileOpen()) return;
		const unlock = lockBodyScroll();
		const release = whenConnected(() => mobilePanel, trapFocus);
		return () => {
			release();
			unlock();
		};
	});

	const owner = createId("navbar");
	const desktopCtx = (): NavContext => ({
		ctrl: props.ctrl,
		trigger: props.trigger ?? "hover",
		mode: "desktop",
		slot,
		owner,
	});
	const mobileCtx = (): NavContext => ({
		ctrl: props.ctrl,
		trigger: "click",
		mode: "mobile",
		slot,
		owner: `${owner}-mobile`,
		onNavigate: () => props.ctrl.setMobileOpen(false),
	});

	return (
		<header
			{...rest}
			class={slot.class(
				"root",
				"a-navbar",
				props.placement === "sticky" && "a-navbar-sticky",
				props.placement === "fixed" && "a-navbar-fixed",
				scroll.overflowing() && "a-navbar-overflow",
			)}
			style={slot.style("root")}
			data-placement={props.placement}
		>
			<div class={slot.class("brand", "a-navbar-brand")} style={slot.style("brand")}>
				{props.brand}
			</div>

			<nav
				class={slot.class("desktop", "a-navbar-desktop")}
				style={slot.style("desktop")}
				aria-label={props.label ?? "Primary"}
			>
				<div
					class={slot.class(
						"shell",
						"a-navbar-shell",
						scroll.overflowing() && "a-navbar-shell-overflow",
					)}
					style={slot.style("shell")}
				>
					<Show when={scroll.overflowing()} fallback={null}>
						<button
							type="button"
							class={slot.class("scroll", "a-navbar-scroll")}
							aria-label="Scroll navigation left"
							disabled={!scroll.canLeft()}
							onClick={() => scroll.scrollBy(-160)}
						>
							‹
						</button>
					</Show>
					<div
						class={slot.class(
							"viewport",
							"a-navbar-viewport",
							scroll.canLeft() && "a-navbar-fade-left",
							scroll.canRight() && "a-navbar-fade-right",
						)}
						style={slot.style("viewport")}
					>
						<div
							id={trackId}
							class={slot.class("track", "a-navbar-track")}
							style={slot.style("track")}
						>
							<NavBranch items={props.items} depth={0} ancestors={[]} ctx={desktopCtx()} />
						</div>
					</div>
					<Show when={scroll.overflowing()} fallback={null}>
						<button
							type="button"
							class={slot.class("scroll", "a-navbar-scroll")}
							aria-label="Scroll navigation right"
							disabled={!scroll.canRight()}
							onClick={() => scroll.scrollBy(160)}
						>
							›
						</button>
					</Show>
				</div>
			</nav>

			<div class={slot.class("end", "a-navbar-end")} style={slot.style("end")}>
				{props.end}
				<button
					type="button"
					class={slot.class("burger", "a-navbar-burger")}
					style={slot.style("burger")}
					aria-label={props.ctrl.mobileOpen() ? "Close menu" : "Open menu"}
					aria-expanded={props.ctrl.mobileOpen()}
					onClick={(e: MouseEvent) => {
						e.stopPropagation();
						props.ctrl.toggleMobile();
					}}
				>
					<span />
					<span />
					<span />
				</button>
			</div>

			<Show when={props.ctrl.mobileOpen()}>
				<Portal>
					<div
						class={slot.class("mobile", "a-navbar-mobile")}
						style={slot.style("mobile")}
						role="dialog"
						aria-modal="true"
						aria-label="Mobile menu"
					>
						<button
							type="button"
							class={slot.class("backdrop", "a-navbar-mobile-backdrop")}
							tabindex="-1"
							aria-label="Close menu"
							onClick={() => props.ctrl.setMobileOpen(false)}
						/>
						<div
							ref={(el: HTMLElement) => {
								mobilePanel = el;
							}}
							class={slot.class("panel", "a-navbar-mobile-panel")}
							style={slot.style("panel")}
						>
							<div
								class={slot.class("header", "a-navbar-mobile-header")}
								style={slot.style("header")}
							>
								<span class={slot.class("title", "a-navbar-mobile-title")}>Menu</span>
								<button
									type="button"
									class={slot.class("close", "a-navbar-mobile-close")}
									onClick={() => props.ctrl.setMobileOpen(false)}
								>
									Close
								</button>
							</div>
							<NavBranch items={props.items} depth={0} ancestors={[]} ctx={mobileCtx()} />
						</div>
					</div>
				</Portal>
			</Show>
		</header>
	);
}

/** Simple flat link for custom navbar layouts; renders `<a>` when `href` is set. */
export type NavbarLinkProps = BaseProps & {
	/** Marks the current page (`aria-current`). */
	active?: boolean | undefined;
	/** Link target. */
	href?: string | undefined;
	/** Click handler (renders a button when there is no `href`). */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Link text. */
	children?: unknown;
};

/** Standalone navbar link (renders `<a>` when `href` is set). */
export function NavbarLink(input: NavbarLinkProps) {
	const [props, rest, slot] = setup("NavbarLink", input, {}, [
		"active",
		"href",
		"onClick",
		"children",
	]);
	const className = () =>
		slot.class("root", "a-navbar-link", props.active && "a-navbar-link-active");
	if (props.href !== undefined) {
		return (
			<a
				{...rest}
				class={className()}
				style={slot.style("root")}
				href={props.href}
				aria-current={props.active ? "page" : undefined}
				onClick={(e: MouseEvent) => props.onClick?.(e)}
			>
				{props.children}
			</a>
		);
	}
	return (
		<button
			{...rest}
			type="button"
			class={className()}
			style={slot.style("root")}
			aria-current={props.active ? "page" : undefined}
			onClick={(e: MouseEvent) => props.onClick?.(e)}
		>
			{props.children}
		</button>
	);
}
