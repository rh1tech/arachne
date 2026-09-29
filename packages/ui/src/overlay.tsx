import { For, omitProps, Show } from "@arachne/render";
import { Button } from "./button.tsx";
import { createSlots, type SlotProps, withDefaults } from "./system.ts";

export { Modal, type ModalProps } from "./dialog.tsx";
export {
	Menu,
	type MenuAction,
	type MenuItem,
	type MenuPlacement,
	type MenuProps,
} from "./menu.tsx";
export { type TabItem, Tabs, type TabsProps } from "./tabs.tsx";

export type BreadcrumbItem = {
	/** Crumb text or content. */
	label: unknown;
	/** Link target; without `href` or `onClick` the crumb is plain text (the current page). */
	href?: string | undefined;
	/** Click handler (renders a button when there is no `href`). */
	onClick?: ((e: MouseEvent) => void) | undefined;
	/** Leading icon or content. */
	icon?: unknown;
};

export type BreadcrumbSlot = "root" | "list" | "item" | "link" | "current" | "separator";

export type BreadcrumbProps = SlotProps<BreadcrumbSlot> & {
	/** Crumbs from the root to the current page (last item). */
	items: BreadcrumbItem[];
	/** Separator node (default `/`). */
	separator?: unknown;
};

const BREADCRUMB_KEYS = [
	"items",
	"separator",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/** Trail of links; the last item is the current page. Links render as `<a>` when `href` is set. */
export function Breadcrumb(input: BreadcrumbProps) {
	const props = withDefaults("Breadcrumb", {}, input);
	const rest = omitProps(props, BREADCRUMB_KEYS);
	const slot = createSlots<BreadcrumbSlot>("Breadcrumb", props);
	const isLast = (index: number) => index === props.items.length - 1;

	return (
		<nav
			aria-label="Breadcrumb"
			{...rest}
			class={slot.class("root", "a-breadcrumb")}
			style={slot.style("root")}
		>
			<ol class={slot.class("list", "a-breadcrumb-list")}>
				<For each={props.items}>
					{(item, index) => (
						<li class={slot.class("item", "a-breadcrumb-item")}>
							<Show when={index() > 0}>
								<span class={slot.class("separator", "a-breadcrumb-sep")} aria-hidden="true">
									{props.separator ?? "/"}
								</span>
							</Show>
							{isLast(index()) ? (
								<span class={slot.class("current", "a-breadcrumb-current")} aria-current="page">
									{item.icon}
									{item.label}
								</span>
							) : item.href ? (
								<a
									class={slot.class("link", "a-breadcrumb-link")}
									href={item.href}
									onClick={item.onClick}
								>
									{item.icon}
									{item.label}
								</a>
							) : (
								<button
									type="button"
									class={slot.class("link", "a-breadcrumb-link")}
									onClick={(e: MouseEvent) => item.onClick?.(e)}
								>
									{item.icon}
									{item.label}
								</button>
							)}
						</li>
					)}
				</For>
			</ol>
		</nav>
	);
}

export type PaginationSlot = "root" | "control" | "pages" | "page" | "ellipsis" | "status";

export type PaginationProps = SlotProps<PaginationSlot> & {
	/** Current page, starting at 1. */
	page: number;
	/** Total number of pages. */
	pageCount: number;
	/** Called with the page the user picks. */
	onChange: (page: number) => void;
	/** `simple` = prev/next + status; `pages` = numbered buttons (default). */
	variant?: "simple" | "pages" | undefined;
	/** Pages shown on each side of the current page (default 1). */
	siblings?: number | undefined;
	/** Content of the previous-page button (default: an arrow with an accessible "Previous page" label). */
	previousLabel?: unknown;
	/** Content of the next-page button (default: an arrow with an accessible "Next page" label). */
	nextLabel?: unknown;
};

const PAGINATION_KEYS = [
	"page",
	"pageCount",
	"onChange",
	"variant",
	"siblings",
	"previousLabel",
	"nextLabel",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

export function pageList(current: number, total: number, siblings = 1): Array<number | "…"> {
	if (total <= 0) return [];
	if (total <= 5 + siblings * 2) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: Array<number | "…"> = [1];
	const start = Math.max(2, current - siblings);
	const end = Math.min(total - 1, current + siblings);
	if (start > 2) pages.push("…");
	for (let i = start; i <= end; i += 1) pages.push(i);
	if (end < total - 1) pages.push("…");
	pages.push(total);
	return pages;
}

/** Page navigation with previous/next controls and numbered pages (`variant="simple"` shows a status instead). Collapses to arrows on narrow screens. */
export function Pagination(input: PaginationProps) {
	const props = withDefaults("Pagination", { variant: "pages", siblings: 1 }, input);
	const rest = omitProps(props, PAGINATION_KEYS);
	const slot = createSlots<PaginationSlot>("Pagination", props);
	const total = () => Math.max(0, Math.floor(props.pageCount || 0));
	const current = () => Math.min(Math.max(1, props.page), Math.max(1, total()));
	const go = (page: number) => {
		const next = Math.min(Math.max(1, page), Math.max(1, total()));
		if (next !== current()) props.onChange(next);
	};

	return (
		<nav
			aria-label="Pagination"
			{...rest}
			class={slot.class("root", "a-pagination")}
			style={slot.style("root")}
		>
			<Button
				variant="ghost"
				size="sm"
				class={slot.class("control", "a-pagination-control")}
				disabled={current() <= 1}
				aria-label={props.previousLabel === undefined ? "Previous page" : undefined}
				onClick={() => go(current() - 1)}
			>
				{props.previousLabel ?? (
					<>
						<span class="a-pagination-arrow" aria-hidden="true">
							‹
						</span>
						<span class="a-pagination-control-text">Previous</span>
					</>
				)}
			</Button>
			<Show when={props.variant === "simple"}>
				<span class={slot.class("status", "a-pagination-status")} aria-live="polite">
					{total() === 0 ? 0 : current()} / {total()}
				</span>
			</Show>
			<Show when={props.variant !== "simple"}>
				<span class={slot.class("pages", "a-pagination-pages")}>
					<For each={pageList(current(), total(), props.siblings)}>
						{(p) =>
							p === "…" ? (
								<span class={slot.class("ellipsis", "a-pagination-ellipsis")} aria-hidden="true">
									…
								</span>
							) : (
								<button
									type="button"
									class={slot.class(
										"page",
										"a-pagination-page",
										current() === p && "a-pagination-page-active",
									)}
									aria-current={current() === p ? "page" : undefined}
									aria-label={`Page ${p}`}
									data-state={current() === p ? "active" : "inactive"}
									onClick={() => go(p)}
								>
									{p}
								</button>
							)
						}
					</For>
				</span>
			</Show>
			<Button
				variant="ghost"
				size="sm"
				class={slot.class("control", "a-pagination-control")}
				disabled={current() >= total()}
				aria-label={props.nextLabel === undefined ? "Next page" : undefined}
				onClick={() => go(current() + 1)}
			>
				{props.nextLabel ?? (
					<>
						<span class="a-pagination-control-text">Next</span>
						<span class="a-pagination-arrow" aria-hidden="true">
							›
						</span>
					</>
				)}
			</Button>
		</nav>
	);
}
