/**
 * App-shell / commerce / content widgets.
 */
import { For, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { focusableIn, rovingToolbarKey, setToolbarStop, whenConnected } from "./focus.ts";
import { Icon, type IconName } from "./icons.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";
import { ActionIcon, DynamicHeading, type HeadingLevel } from "./widgets.tsx";

const COPIED_RESET_MS = 1200;

/** `copied` flag that resets after a delay; the timer dies with the component. */
function createCopied(): { copied: () => boolean; copy: (text: string) => Promise<void> } {
	const copied = signal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	effect(() => () => clearTimeout(timer));
	return {
		copied: () => copied(),
		async copy(text) {
			try {
				await navigator.clipboard.writeText(text);
				copied.set(true);
				clearTimeout(timer);
				timer = setTimeout(() => copied.set(false), COPIED_RESET_MS);
			} catch {
				// Clipboard can be unavailable (permissions / insecure context); stay silent.
			}
		},
	};
}

export type AnnouncementBarSlot = "root" | "body" | "close";

export type AnnouncementBarProps = SlotProps<AnnouncementBarSlot> & {
	/** Bar colour. */
	tone?: "info" | "accent" | "warning" | "danger" | undefined;
	/** Show a dismiss (×) button. */
	dismissible?: boolean | undefined;
	/** Called when the dismiss button is pressed; hide the bar here. */
	onDismiss?: (() => void) | undefined;
	/** Announcement text or content. */
	children?: unknown;
};

/** Site-wide notice strip. Slots: `root` `body` `close`. State: `data-tone`. */
export function AnnouncementBar(input: AnnouncementBarProps) {
	const [props, rest, slot] = setup(
		"AnnouncementBar",
		input,
		{ tone: "info" },
		["tone", "dismissible", "onDismiss", "children"],
		"root" as AnnouncementBarSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-announce", `a-announce-${props.tone}`)}
			style={slot.style("root")}
			role="status"
			data-tone={props.tone}
		>
			<div class={slot.class("body", "a-announce-body")} style={slot.style("body")}>
				{props.children}
			</div>
			<Show when={props.dismissible}>
				<button
					type="button"
					class={slot.class("close", "a-announce-close")}
					style={slot.style("close")}
					aria-label="Dismiss"
					onClick={() => props.onDismiss?.()}
				>
					<Icon name="close" size="sm" />
				</button>
			</Show>
		</div>
	);
}

export type CommandBarProps = BaseProps & {
	/** Accessible name for the toolbar. */
	label?: string | undefined;
	/** Layout, and which arrow keys move between buttons. */
	orientation?: "horizontal" | "vertical" | undefined;
	/** Toolbar buttons (one Tab stop; arrows move between them). */
	children?: unknown;
};

/**
 * WAI-ARIA toolbar for page-level actions: one Tab stop, arrow keys (and
 * Home / End) move focus between its controls. Slots: `root`.
 */
export function CommandBar(input: CommandBarProps) {
	const [props, rest, slot] = setup("CommandBar", input, { orientation: "horizontal" }, [
		"label",
		"orientation",
		"children",
	]);
	let root: HTMLElement | undefined;
	const view = (
		<div
			aria-label={props.label}
			{...rest}
			ref={(el: HTMLElement) => {
				root = el;
			}}
			role="toolbar"
			aria-orientation={props.orientation}
			class={slot.class("root", "a-command-bar")}
			style={slot.style("root")}
			onKeyDown={(e: KeyboardEvent) => {
				if (root) rovingToolbarKey(e, root, props.orientation ?? "horizontal");
			}}
			onFocusIn={(e: FocusEvent) => {
				if (root) setToolbarStop(root, e.target as HTMLElement);
			}}
		>
			{props.children}
		</div>
	);
	effect(() => {
		props.children;
		return whenConnected(
			() => root,
			(el) => {
				setToolbarStop(el, focusableIn(el)[0]);
			},
		);
	});
	return view;
}

export type TocItem = {
	/** Id of the section on the page. */
	id: string;
	/** Link text. */
	label: string;
	/** Marks the current section. */
	active?: boolean | undefined;
	/** Called when the link is chosen (e.g. to scroll there). */
	onSelect?: (() => void) | undefined;
};

export type TableOfContentsSlot = "root" | "title" | "list" | "link";

export type TableOfContentsProps = SlotProps<TableOfContentsSlot> & {
	/** Sections, in page order. */
	items: TocItem[];
	/** Small heading above the list. */
	title?: string | undefined;
};

/** "On this page" navigation. Slots: `root` `title` `list` `link`. */
export function TableOfContents(input: TableOfContentsProps) {
	const [props, rest, slot] = setup(
		"TableOfContents",
		input,
		{},
		["items", "title"],
		"root" as TableOfContentsSlot,
	);
	return (
		<nav
			aria-label={props.title ?? "On this page"}
			{...rest}
			class={slot.class("root", "a-toc")}
			style={slot.style("root")}
		>
			<Show when={props.title}>
				<p class={slot.class("title", "a-toc-title")} style={slot.style("title")}>
					{props.title}
				</p>
			</Show>
			<ul class={slot.class("list", "a-toc-list")} style={slot.style("list")}>
				<For each={props.items}>
					{(item) => (
						<li>
							<button
								type="button"
								class={slot.class("link", "a-toc-link", item.active && "a-toc-link-active")}
								style={slot.style("link")}
								aria-current={item.active ? "location" : undefined}
								data-state={item.active ? "active" : "inactive"}
								onClick={() => item.onSelect?.()}
							>
								{item.label}
							</button>
						</li>
					)}
				</For>
			</ul>
		</nav>
	);
}

export type PropertyItem = {
	/** Property name. */
	label: string;
	/** Property value (text or content). */
	value: unknown;
};

export type PropertyListSlot = "root" | "row" | "label" | "value";

export type PropertyListProps = SlotProps<PropertyListSlot> & {
	/** Properties, in order. */
	items: PropertyItem[];
};

/** Label / value pairs. Slots: `root` `row` `label` `value`. */
export function PropertyList(input: PropertyListProps) {
	const [props, rest, slot] = setup(
		"PropertyList",
		input,
		{},
		["items"],
		"root" as PropertyListSlot,
	);
	return (
		<dl {...rest} class={slot.class("root", "a-props")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) => (
					<div class={slot.class("row", "a-props-row")} style={slot.style("row")}>
						<dt class={slot.class("label", "a-props-label")} style={slot.style("label")}>
							{item.label}
						</dt>
						<dd class={slot.class("value", "a-props-value")} style={slot.style("value")}>
							{item.value}
						</dd>
					</div>
				)}
			</For>
		</dl>
	);
}

export type StatCardSlot = "root" | "label" | "value" | "trend" | "hint";

export type StatCardProps = SlotProps<StatCardSlot> & {
	/** What the number measures. */
	label: unknown;
	/** The featured number or content. */
	value: unknown;
	/** Context line, e.g. "vs. last month". */
	hint?: unknown;
	/** Change in percent (arrow and colour by sign). */
	trend?: number | undefined;
};

/**
 * KPI tile with optional trend.
 * Slots: `root` `label` `value` `trend` `hint`. State: `data-trend="up|down"`.
 */
export function StatCard(input: StatCardProps) {
	const [props, rest, slot] = setup(
		"StatCard",
		input,
		{},
		["label", "value", "hint", "trend"],
		"root" as StatCardSlot,
	);
	const hasTrend = () => props.trend != null && Number.isFinite(props.trend);
	const up = () => hasTrend() && (props.trend as number) >= 0;
	return (
		<div
			{...rest}
			class={slot.class("root", "a-stat-card")}
			style={slot.style("root")}
			data-trend={hasTrend() ? (up() ? "up" : "down") : undefined}
		>
			<p class={slot.class("label", "a-stat-card-label")} style={slot.style("label")}>
				{props.label}
			</p>
			<p class={slot.class("value", "a-stat-card-value")} style={slot.style("value")}>
				{props.value}
			</p>
			<Show
				when={hasTrend()}
				fallback={
					<Show when={props.hint}>
						<p class={slot.class("hint", "a-stat-card-hint")} style={slot.style("hint")}>
							{props.hint}
						</p>
					</Show>
				}
			>
				<p
					class={slot.class(
						"trend",
						"a-stat-card-trend",
						up() ? "a-stat-card-up" : "a-stat-card-down",
					)}
					style={slot.style("trend")}
				>
					{up() ? "+" : ""}
					{props.trend}%
				</p>
			</Show>
		</div>
	);
}

export type QuantityInputSlot = "root" | "button" | "value";

export type QuantityInputProps = SlotProps<QuantityInputSlot> & {
	/** Current quantity (controlled). */
	value: number;
	/** Lowest quantity (the − button disables there). */
	min?: number | undefined;
	/** Highest quantity (the + button disables there). */
	max?: number | undefined;
	/** Disables both buttons. */
	disabled?: boolean | undefined;
	/** Accessible name for the stepper group (default "Quantity"). */
	label?: string | undefined;
	/** Called with the new quantity. */
	onChange: (value: number) => void;
};

/** − value + stepper. Slots: `root` `button` `value`. */
export function QuantityInput(input: QuantityInputProps) {
	const [props, rest, slot] = setup(
		"QuantityInput",
		input,
		{ min: 1, max: 99 },
		["value", "min", "max", "disabled", "label", "onChange"],
		"root" as QuantityInputSlot,
	);
	const min = () => props.min ?? 1;
	const max = () => props.max ?? 99;
	const clamp = (n: number) => Math.max(min(), Math.min(max(), n));
	return (
		// biome-ignore lint/a11y/useSemanticElements: role=group labels a two-button stepper; a fieldset would add form chrome
		<div
			aria-label={props.label ?? "Quantity"}
			{...rest}
			class={slot.class("root", "a-qty")}
			style={slot.style("root")}
			role="group"
			data-disabled={props.disabled ? "" : undefined}
		>
			<button
				type="button"
				class={slot.class("button", "a-qty-btn")}
				style={slot.style("button")}
				disabled={props.disabled || props.value <= min()}
				aria-label="Decrease"
				onClick={() => props.onChange(clamp(props.value - 1))}
			>
				−
			</button>
			<span
				class={slot.class("value", "a-qty-value")}
				style={slot.style("value")}
				aria-live="polite"
			>
				{props.value}
			</span>
			<button
				type="button"
				class={slot.class("button", "a-qty-btn")}
				style={slot.style("button")}
				disabled={props.disabled || props.value >= max()}
				aria-label="Increase"
				onClick={() => props.onChange(clamp(props.value + 1))}
			>
				+
			</button>
		</div>
	);
}

export type PriceSlot = "root" | "strike" | "amount" | "period";

export type PriceProps = SlotProps<PriceSlot> & {
	/** Price as a number. */
	amount: number;
	/** ISO currency code for formatting, e.g. `USD`. */
	currency?: string | undefined;
	/** Billing period after the price, e.g. `month`. */
	period?: string | undefined;
	/** Previous price, shown struck through. */
	strike?: number | undefined;
};

/** Currency formatting that never throws (invalid codes fall back to `CODE 1.00`). */
export function formatMoney(n: number, currency: string): string {
	if (!Number.isFinite(n)) return "—";
	try {
		return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
	} catch {
		return `${currency.toUpperCase()} ${n.toFixed(2)}`;
	}
}

/** Formatted price with optional strike-through and period. Slots: `root` `strike` `amount` `period`. */
export function Price(input: PriceProps) {
	const [props, rest, slot] = setup(
		"Price",
		input,
		{ currency: "USD" },
		["amount", "currency", "period", "strike"],
		"root" as PriceSlot,
	);
	const fmt = (n: number) => formatMoney(n, props.currency ?? "USD");
	return (
		<span {...rest} class={slot.class("root", "a-price")} style={slot.style("root")}>
			<Show when={props.strike != null}>
				<span class={slot.class("strike", "a-price-strike")} style={slot.style("strike")}>
					{fmt(props.strike as number)}
				</span>
			</Show>
			<strong class={slot.class("amount", "a-price-amount")} style={slot.style("amount")}>
				{fmt(props.amount)}
			</strong>
			<Show when={props.period}>
				<span class={slot.class("period", "a-price-period")} style={slot.style("period")}>
					/{props.period}
				</span>
			</Show>
		</span>
	);
}

export type ProductCardSlot = "root" | "media" | "image" | "badge" | "body" | "title" | "footer";

export type ProductCardProps = SlotProps<ProductCardSlot> & {
	/** Product name. */
	title: unknown;
	/** Heading level of the title, to fit the page outline. Default 4. */
	order?: HeadingLevel | undefined;
	/** Product image URL. */
	image?: string | undefined;
	/** Alt text for the product image (default: decorative). */
	imageAlt?: string | undefined;
	/** Price as a number. */
	price: number;
	/** Previous price, shown struck through. */
	strike?: number | undefined;
	/** ISO currency code for formatting. */
	currency?: string | undefined;
	/** Badge over the image, e.g. "Sale". */
	badge?: unknown;
	/** Shows an add-to-cart button; called when it is pressed. */
	onAdd?: (() => void) | undefined;
	/** Label for the add button (default "Add"). */
	addLabel?: unknown;
};

/** Product tile. Slots: `root` `media` `image` `badge` `body` `title` `footer`. */
export function ProductCard(input: ProductCardProps) {
	const [props, rest, slot] = setup(
		"ProductCard",
		input,
		{},
		[
			"title",
			"order",
			"image",
			"imageAlt",
			"price",
			"strike",
			"currency",
			"badge",
			"onAdd",
			"addLabel",
		],
		"root" as ProductCardSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-product")} style={slot.style("root")}>
			<Show when={props.image}>
				<div class={slot.class("media", "a-product-media")} style={slot.style("media")}>
					<img
						src={props.image}
						alt={props.imageAlt ?? ""}
						class={slot.class("image", "a-product-img")}
						style={slot.style("image")}
					/>
					<Show when={props.badge}>
						<span class={slot.class("badge", "a-product-badge")} style={slot.style("badge")}>
							{props.badge}
						</span>
					</Show>
				</div>
			</Show>
			<div class={slot.class("body", "a-product-body")} style={slot.style("body")}>
				<DynamicHeading
					level={props.order ?? 4}
					class={slot.class("title", "a-product-title")}
					style={slot.style("title")}
				>
					{props.title}
				</DynamicHeading>
				<div class={slot.class("footer", "a-product-row")} style={slot.style("footer")}>
					<Price amount={props.price} currency={props.currency} strike={props.strike} />
					<Show when={props.onAdd}>
						<Button size="sm" onClick={() => props.onAdd?.()}>
							{props.addLabel ?? "Add"}
						</Button>
					</Show>
				</div>
			</div>
		</article>
	);
}

export type CartLineSlot = "root" | "image" | "body" | "title" | "quantity" | "remove";

export type CartLineProps = SlotProps<CartLineSlot> & {
	/** Product name. */
	title: unknown;
	/** Unit price as a number. */
	price: number;
	/** Quantity in the cart. */
	quantity: number;
	/** Product thumbnail URL. */
	image?: string | undefined;
	/** ISO currency code for formatting. */
	currency?: string | undefined;
	/** Shows quantity buttons; called with the new quantity. */
	onQuantityChange?: ((value: number) => void) | undefined;
	/** Shows a remove button; called when it is pressed. */
	onRemove?: (() => void) | undefined;
};

/** Cart row. Slots: `root` `image` `body` `title` `quantity` `remove`. */
export function CartLine(input: CartLineProps) {
	const [props, rest, slot] = setup(
		"CartLine",
		input,
		{},
		["title", "price", "quantity", "image", "currency", "onQuantityChange", "onRemove"],
		"root" as CartLineSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-cart-line")} style={slot.style("root")}>
			<Show when={props.image}>
				<img
					src={props.image}
					alt=""
					class={slot.class("image", "a-cart-line-img")}
					style={slot.style("image")}
				/>
			</Show>
			<div class={slot.class("body", "a-cart-line-body")} style={slot.style("body")}>
				<p class={slot.class("title", "a-cart-line-title")} style={slot.style("title")}>
					{props.title}
				</p>
				<Price amount={props.price} currency={props.currency} />
			</div>
			<Show
				when={props.onQuantityChange}
				fallback={
					<span class={slot.class("quantity", "a-cart-line-qty")} style={slot.style("quantity")}>
						×{props.quantity}
					</span>
				}
			>
				<QuantityInput
					value={props.quantity}
					class={slot.class("quantity")}
					onChange={(v) => props.onQuantityChange?.(v)}
				/>
			</Show>
			<Show when={props.onRemove}>
				<button
					type="button"
					class={slot.class("remove", "a-cart-line-remove")}
					style={slot.style("remove")}
					aria-label="Remove"
					onClick={() => props.onRemove?.()}
				>
					<Icon name="trash" size="sm" />
				</button>
			</Show>
		</div>
	);
}

export type OrderSummaryLine = {
	/** Line label, e.g. "Shipping". */
	label: string;
	/** Line amount text. */
	value: string;
	/** De-emphasise the line. */
	muted?: boolean | undefined;
};

export type OrderSummarySlot = "root" | "row" | "total";

export type OrderSummaryProps = SlotProps<OrderSummarySlot> & {
	/** Summary lines above the total. */
	lines: OrderSummaryLine[];
	/** Total amount. */
	total: unknown;
	/** Label for the total row (default "Total"). */
	totalLabel?: unknown;
	/** Content below the total, e.g. a checkout button. */
	children?: unknown;
};

/** Subtotal / tax / total block. Slots: `root` `row` `total`. */
export function OrderSummary(input: OrderSummaryProps) {
	const [props, rest, slot] = setup(
		"OrderSummary",
		input,
		{},
		["lines", "total", "totalLabel", "children"],
		"root" as OrderSummarySlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-order")} style={slot.style("root")}>
			<For each={props.lines}>
				{(line) => (
					<div
						class={slot.class("row", "a-order-row", line.muted && "a-order-muted")}
						style={slot.style("row")}
					>
						<span>{line.label}</span>
						<span>{line.value}</span>
					</div>
				)}
			</For>
			<div class={slot.class("total", "a-order-total")} style={slot.style("total")}>
				<span>{props.totalLabel ?? "Total"}</span>
				<strong>{props.total}</strong>
			</div>
			{props.children}
		</div>
	);
}

export type ShareButtonProps = BaseProps & {
	/** Link to share (default: the current page URL). */
	url?: string | undefined;
	/** Title passed to the share sheet. */
	title?: string | undefined;
	/** Text passed to the share sheet. */
	text?: string | undefined;
	/** Button label. */
	label?: unknown;
	/** Label shown after the link was copied (fallback path). Default "Link copied". */
	copiedLabel?: unknown;
	/** Button size. */
	size?: "sm" | "md" | undefined;
	/** Called after sharing or copying; return `false` from `onClick` to handle sharing yourself. */
	onClick?: (() => boolean | undefined | void) | undefined;
	/** Called after sharing, with how: the native sheet or a copied link. */
	onShared?: ((method: "share" | "copy") => void) | undefined;
};

/**
 * Shares a link with the Web Share API, falling back to copying it to the
 * clipboard (with confirmation). Slots: `root`.
 */
/** Open the native share sheet when there is one. */
async function nativeShare(data: ShareData): Promise<"shared" | "dismissed" | "unavailable"> {
	if (typeof navigator === "undefined" || typeof navigator.share !== "function")
		return "unavailable";
	try {
		await navigator.share(data);
		return "shared";
	} catch (error) {
		// The user dismissed the sheet (AbortError); other failures fall back to copying.
		return (error as DOMException)?.name === "AbortError" ? "dismissed" : "unavailable";
	}
}

export function ShareButton(input: ShareButtonProps) {
	const [props, rest, slot] = setup("ShareButton", input, {}, [
		"url",
		"title",
		"text",
		"label",
		"copiedLabel",
		"size",
		"onClick",
		"onShared",
	]);
	const { copied, copy } = createCopied();
	const share = async () => {
		if (props.onClick?.() === false) return;
		const url = props.url ?? (typeof location !== "undefined" ? location.href : "");
		const result = await nativeShare({
			url,
			...(props.title ? { title: props.title } : {}),
			...(props.text ? { text: props.text } : {}),
		});
		if (result === "shared") props.onShared?.("share");
		if (result !== "unavailable") return;
		await copy(url);
		if (copied()) props.onShared?.("copy");
	};
	return (
		<Button
			{...rest}
			variant="ghost"
			size={props.size}
			unstyled={props.unstyled}
			class={slot.class("root", "a-share-btn")}
			style={slot.style("root")}
			data-copied={copied() ? "" : undefined}
			start={<Icon name={copied() ? "check" : "share"} size="sm" />}
			onClick={() => void share()}
		>
			{copied() ? (props.copiedLabel ?? "Link copied") : (props.label ?? "Share")}
		</Button>
	);
}

export type CopyIdSlot = "root" | "label" | "value" | "button";

export type CopyIdProps = SlotProps<CopyIdSlot> & {
	/** Id shown and copied. */
	value: string;
	/** Label before the id. */
	label?: unknown;
};

/** Monospace id with a copy button. Slots: `root` `label` `value` `button`. State: `data-copied`. */
export function CopyId(input: CopyIdProps) {
	const [props, rest, slot] = setup("CopyId", input, {}, ["value", "label"], "root" as CopyIdSlot);
	const { copied, copy } = createCopied();
	return (
		<span
			{...rest}
			class={slot.class("root", "a-copy-id")}
			style={slot.style("root")}
			data-copied={copied() ? "" : undefined}
		>
			<Show when={props.label}>
				<span class={slot.class("label", "a-copy-id-label")} style={slot.style("label")}>
					{props.label}
				</span>
			</Show>
			<code class={slot.class("value", "a-copy-id-value")} style={slot.style("value")}>
				{props.value}
			</code>
			<button
				type="button"
				class={slot.class("button", "a-copy-id-btn")}
				style={slot.style("button")}
				aria-label={copied() ? "Copied" : "Copy"}
				onClick={() => copy(props.value)}
			>
				<Icon name={copied() ? "check" : "copy"} size="sm" />
			</button>
		</span>
	);
}

export type EnvBadgeProps = BaseProps & {
	/** Environment name; `production`, `staging` and `development` have their own colours. */
	env: "production" | "staging" | "development" | string;
};

/** Environment pill (production = danger, staging = warning). Slots: `root`. State: `data-tone`. */
export function EnvBadge(input: EnvBadgeProps) {
	const [props, rest, slot] = setup("EnvBadge", input, {}, ["env"]);
	const tone = () =>
		props.env === "production" ? "danger" : props.env === "staging" ? "warning" : "accent";
	return (
		<span
			{...rest}
			class={slot.class("root", "a-env-badge", `a-env-badge-${tone()}`)}
			style={slot.style("root")}
			data-tone={tone()}
		>
			{props.env}
		</span>
	);
}

export type LocaleOption = {
	/** Locale code, e.g. `de`. */
	value: string;
	/** Language name shown to the user. */
	label: string;
};

export type LocaleSwitcherSlot = "root" | "option";

export type LocaleSwitcherProps = SlotProps<LocaleSwitcherSlot> & {
	/** Current locale code (controlled). */
	value: string;
	/** Available languages. */
	options: LocaleOption[];
	/** Called with the picked locale code. */
	onChange: (value: string) => void;
	/** Accessible name (default "Language"). */
	label?: string | undefined;
};

/** Inline language picker. Slots: `root` `option`. */
export function LocaleSwitcher(input: LocaleSwitcherProps) {
	const [props, rest, slot] = setup(
		"LocaleSwitcher",
		input,
		{},
		["value", "options", "onChange", "label"],
		"root" as LocaleSwitcherSlot,
	);
	return (
		// biome-ignore lint/a11y/useSemanticElements: role=group labels a row of toggle buttons; a fieldset would add form chrome
		<div
			aria-label={props.label ?? "Language"}
			{...rest}
			class={slot.class("root", "a-locale")}
			style={slot.style("root")}
			role="group"
		>
			<For each={props.options}>
				{(opt) => {
					const active = () => opt.value === props.value;
					return (
						<button
							type="button"
							class={slot.class("option", "a-locale-btn", active() && "a-locale-btn-active")}
							style={slot.style("option")}
							aria-pressed={active()}
							data-state={active() ? "active" : "inactive"}
							onClick={() => props.onChange(opt.value)}
						>
							{opt.label}
						</button>
					);
				}}
			</For>
		</div>
	);
}

export type OrgOption = {
	/** Organisation id. */
	id: string;
	/** Organisation name. */
	name: string;
	/** Plan shown under the name. */
	plan?: string | undefined;
};

export type OrgSwitcherSlot = "root" | "avatar" | "meta" | "name" | "plan" | "chevron";

export type OrgSwitcherProps = SlotProps<OrgSwitcherSlot> & {
	/** The current organisation. */
	org: OrgOption;
	/** Called when pressed, e.g. to open an organisation menu. */
	onClick?: (() => void) | undefined;
};

/** Workspace switcher button. Slots: `root` `avatar` `meta` `name` `plan` `chevron`. */
export function OrgSwitcher(input: OrgSwitcherProps) {
	const [props, rest, slot] = setup(
		"OrgSwitcher",
		input,
		{},
		["org", "onClick"],
		"root" as OrgSwitcherSlot,
	);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-org")}
			style={slot.style("root")}
			onClick={() => props.onClick?.()}
		>
			<span
				class={slot.class("avatar", "a-org-avatar")}
				style={slot.style("avatar")}
				aria-hidden="true"
			>
				{props.org.name.slice(0, 1).toUpperCase()}
			</span>
			<span class={slot.class("meta", "a-org-meta")} style={slot.style("meta")}>
				<span class={slot.class("name", "a-org-name")} style={slot.style("name")}>
					{props.org.name}
				</span>
				<Show when={props.org.plan}>
					<span class={slot.class("plan", "a-org-plan")} style={slot.style("plan")}>
						{props.org.plan}
					</span>
				</Show>
			</span>
			<Icon name="chevron-down" size="sm" class={slot.class("chevron")} />
		</button>
	);
}

export type InboxItemSlot = "root" | "icon" | "body" | "title" | "text" | "time";

export type InboxItemProps = SlotProps<InboxItemSlot> & {
	/** What the notification is about. */
	title: unknown;
	/** Secondary text. */
	body?: unknown;
	/** When it arrived. */
	time?: unknown;
	/** Show the unread dot and bold title. */
	unread?: boolean | undefined;
	/** Leading icon. */
	icon?: IconName | undefined;
	/** Makes the item a button, e.g. to open it. */
	onClick?: (() => void) | undefined;
};

/** Notification row. Slots: `root` `icon` `body` `title` `text` `time`. State: `data-unread`. */
export function InboxItem(input: InboxItemProps) {
	const [props, rest, slot] = setup(
		"InboxItem",
		input,
		{ icon: "bell" },
		["title", "body", "time", "unread", "icon", "onClick"],
		"root" as InboxItemSlot,
	);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-inbox-item", props.unread && "a-inbox-item-unread")}
			style={slot.style("root")}
			data-unread={props.unread ? "" : undefined}
			onClick={() => props.onClick?.()}
		>
			<span
				class={slot.class("icon", "a-inbox-icon")}
				style={slot.style("icon")}
				aria-hidden="true"
			>
				<Icon name={props.icon ?? "bell"} size="sm" />
			</span>
			<span class={slot.class("body", "a-inbox-body")} style={slot.style("body")}>
				<span class={slot.class("title", "a-inbox-title")} style={slot.style("title")}>
					{props.title}
				</span>
				<Show when={props.body}>
					<span class={slot.class("text", "a-inbox-text")} style={slot.style("text")}>
						{props.body}
					</span>
				</Show>
			</span>
			<Show when={props.time}>
				<span class={slot.class("time", "a-inbox-time")} style={slot.style("time")}>
					{props.time}
				</span>
			</Show>
		</button>
	);
}

export type Reaction = {
	/** The reaction emoji. */
	emoji: string;
	/** Number of people who reacted. */
	count: number;
	/** Whether the current user reacted (pressed state). */
	active?: boolean | undefined;
};

export type ReactionBarSlot = "root" | "reaction";

export type ReactionBarProps = SlotProps<ReactionBarSlot> & {
	/** Reactions, in order. */
	reactions: Reaction[];
	/** Called with the emoji the user toggles; update counts yourself. */
	onToggle?: ((emoji: string) => void) | undefined;
};

/** Emoji reaction toggles. Slots: `root` `reaction`. */
export function ReactionBar(input: ReactionBarProps) {
	const [props, rest, slot] = setup(
		"ReactionBar",
		input,
		{},
		["reactions", "onToggle"],
		"root" as ReactionBarSlot,
	);
	return (
		// biome-ignore lint/a11y/useSemanticElements: role=group labels a row of toggle buttons; a fieldset would add form chrome
		<div
			aria-label="Reactions"
			{...rest}
			class={slot.class("root", "a-reactions")}
			style={slot.style("root")}
			role="group"
		>
			<For each={props.reactions}>
				{(r) => (
					<button
						type="button"
						class={slot.class("reaction", "a-reaction", r.active && "a-reaction-active")}
						style={slot.style("reaction")}
						aria-pressed={Boolean(r.active)}
						aria-label={`${r.emoji} ${r.count}`}
						onClick={() => props.onToggle?.(r.emoji)}
					>
						<span aria-hidden="true">{r.emoji}</span>
						<span aria-hidden="true">{r.count}</span>
					</button>
				)}
			</For>
		</div>
	);
}

export type MentionProps = BaseProps & {
	/** Username (shown with a leading `@`). */
	name: string;
	/** Makes the mention a button, e.g. to open the profile. */
	onClick?: (() => void) | undefined;
};

/** Inline @mention chip. Slots: `root`. */
export function Mention(input: MentionProps) {
	const [props, rest, slot] = setup("Mention", input, {}, ["name", "onClick"]);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-mention")}
			style={slot.style("root")}
			onClick={() => props.onClick?.()}
		>
			@{props.name}
		</button>
	);
}

export type BrowserFrameSlot = "root" | "bar" | "url" | "body";

export type BrowserFrameProps = SlotProps<BrowserFrameSlot> & {
	/** Address shown in the bar. */
	url?: string | undefined;
	/** Page content (a screenshot fills the frame). */
	children?: unknown;
};

/** Browser chrome mock-up. Slots: `root` `bar` `url` `body`. */
export function BrowserFrame(input: BrowserFrameProps) {
	const [props, rest, slot] = setup(
		"BrowserFrame",
		input,
		{},
		["url", "children"],
		"root" as BrowserFrameSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-browser")} style={slot.style("root")}>
			<div class={slot.class("bar", "a-browser-bar")} style={slot.style("bar")}>
				<span class="a-browser-dots" aria-hidden="true">
					<span />
					<span />
					<span />
				</span>
				<span class={slot.class("url", "a-browser-url")} style={slot.style("url")}>
					{props.url ?? "https://example.com"}
				</span>
			</div>
			<div class={slot.class("body", "a-browser-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</div>
	);
}

export type PhoneFrameSlot = "root" | "notch" | "body";

export type PhoneFrameProps = SlotProps<PhoneFrameSlot> & {
	/** Screen content (a screenshot fills the screen). */
	children?: unknown;
};

/** Phone mock-up. Slots: `root` `notch` `body`. */
export function PhoneFrame(input: PhoneFrameProps) {
	const [props, rest, slot] = setup(
		"PhoneFrame",
		input,
		{},
		["children"],
		"root" as PhoneFrameSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-phone")} style={slot.style("root")}>
			<div
				class={slot.class("notch", "a-phone-notch")}
				style={slot.style("notch")}
				aria-hidden="true"
			/>
			<div class={slot.class("body", "a-phone-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</div>
	);
}

export type FeatureCompareRow = {
	/** Feature name. */
	feature: string;
	/** One cell per plan: `true` / `false` for a check or cross, or text. */
	values: Array<boolean | string>;
};

export type FeatureCompareSlot = "root" | "head" | "row" | "cell";

export type FeatureCompareProps = SlotProps<FeatureCompareSlot> & {
	/** Plan names (the columns). */
	plans: string[];
	/** Features (the rows). */
	rows: FeatureCompareRow[];
	/** Header of the first column (default "Feature"). */
	featureLabel?: unknown;
};

/**
 * Plan comparison grid (ARIA table over CSS grid rows).
 * Slots: `root` `head` `row` `cell`.
 */
export function FeatureCompare(input: FeatureCompareProps) {
	const [props, rest, slot] = setup(
		"FeatureCompare",
		input,
		{},
		["plans", "rows", "featureLabel"],
		"root" as FeatureCompareSlot,
	);
	const cell = (...extra: string[]) => slot.class("cell", "a-compare-cell", ...extra);
	/* biome-ignore-start lint/a11y/useSemanticElements: rows are CSS grid containers, which native <tr> can't be; ARIA table roles keep the semantics */
	/* biome-ignore-start lint/a11y/useFocusableInteractive: static (non-grid) table rows and headers are not interactive */
	return (
		<div
			{...rest}
			class={slot.class("root", "a-feature-compare")}
			style={slot.style("root")}
			role="table"
		>
			<div class={slot.class("head", "a-compare-head")} style={slot.style("head")} role="row">
				<div class={cell("a-compare-feature")} role="columnheader">
					{props.featureLabel ?? "Feature"}
				</div>
				<For each={props.plans}>
					{(plan) => (
						<div class={cell("a-compare-plan")} role="columnheader">
							{plan}
						</div>
					)}
				</For>
			</div>
			<For each={props.rows}>
				{(row) => (
					<div class={slot.class("row", "a-compare-row")} style={slot.style("row")} role="row">
						<div class={cell("a-compare-feature")} role="rowheader">
							{row.feature}
						</div>
						<For each={row.values}>
							{(v) => (
								<div class={cell()} role="cell">
									{typeof v === "boolean" ? (
										v ? (
											<Icon name="check" size="sm" class="a-compare-yes" label="Included" />
										) : (
											<span class="a-compare-no" role="img" aria-label="Not included">
												—
											</span>
										)
									) : (
										v
									)}
								</div>
							)}
						</For>
					</div>
				)}
			</For>
		</div>
	);
	/* biome-ignore-end lint/a11y/useFocusableInteractive: see start */
	/* biome-ignore-end lint/a11y/useSemanticElements: see start */
}

export type ViewToggleSlot = "root" | "option";

export type ViewToggleProps = SlotProps<ViewToggleSlot> & {
	/** Current view. */
	value: "list" | "grid";
	/** Called with the view the user picks. */
	onChange: (value: "list" | "grid") => void;
};

/** List / grid toggle. Slots: `root` `option`. State: `data-value`. */
export function ViewToggle(input: ViewToggleProps) {
	const [props, rest, slot] = setup(
		"ViewToggle",
		input,
		{},
		["value", "onChange"],
		"root" as ViewToggleSlot,
	);
	const option = (value: "list" | "grid", label: string, icon: IconName) => (
		<button
			type="button"
			class={slot.class("option", "a-view-btn", props.value === value && "a-view-btn-active")}
			style={slot.style("option")}
			aria-label={label}
			aria-pressed={props.value === value}
			data-state={props.value === value ? "active" : "inactive"}
			onClick={() => props.onChange(value)}
		>
			<Icon name={icon} size="sm" />
		</button>
	);
	return (
		// biome-ignore lint/a11y/useSemanticElements: role=group labels a pair of toggle buttons; a fieldset would add form chrome
		<div
			aria-label="View"
			{...rest}
			class={slot.class("root", "a-view-toggle")}
			style={slot.style("root")}
			role="group"
			data-value={props.value}
		>
			{option("list", "List view", "menu")}
			{option("grid", "Grid view", "image")}
		</div>
	);
}

export type ResultCountProps = BaseProps & {
	/** Number of results. */
	count: number;
	/** Noun after the count, e.g. "deploys". */
	label?: string | undefined;
};

/** "12 results" line (live region). Slots: `root`. */
export function ResultCount(input: ResultCountProps) {
	const [props, rest, slot] = setup("ResultCount", input, {}, ["count", "label"]);
	return (
		<p
			aria-live="polite"
			{...rest}
			class={slot.class("root", "a-result-count")}
			style={slot.style("root")}
		>
			{props.count} {props.label ?? (props.count === 1 ? "result" : "results")}
		</p>
	);
}

export type FilterChipSlot = "root" | "remove";

export type FilterChipProps = SlotProps<FilterChipSlot> & {
	/** Filter text, e.g. "Status: failed". */
	label: string;
	/** Shows a remove (×) button; called when it is pressed. */
	onRemove?: (() => void) | undefined;
};

/** Active filter with a remove button. Slots: `root` `remove`. */
export function FilterChip(input: FilterChipProps) {
	const [props, rest, slot] = setup(
		"FilterChip",
		input,
		{},
		["label", "onRemove"],
		"root" as FilterChipSlot,
	);
	return (
		<span {...rest} class={slot.class("root", "a-filter-chip")} style={slot.style("root")}>
			{props.label}
			<Show when={props.onRemove}>
				<button
					type="button"
					class={slot.class("remove", "a-filter-chip-x")}
					style={slot.style("remove")}
					aria-label={`Remove ${props.label}`}
					onClick={() => props.onRemove?.()}
				>
					<Icon name="close" size="sm" />
				</button>
			</Show>
		</span>
	);
}

export type BulkBarSlot = "root" | "count" | "actions" | "clear";

export type BulkBarProps = SlotProps<BulkBarSlot> & {
	/** Number of selected items. */
	count: number;
	/** Shows a clear-selection button; called when it is pressed. */
	onClear?: (() => void) | undefined;
	/** Custom count text (default `N selected`). */
	countLabel?: ((count: number) => unknown) | undefined;
	/** Bulk actions for the selection. */
	children?: unknown;
};

/** Selection action bar. Slots: `root` `count` `actions` `clear`. */
export function BulkBar(input: BulkBarProps) {
	const [props, rest, slot] = setup(
		"BulkBar",
		input,
		{},
		["count", "onClear", "countLabel", "children"],
		"root" as BulkBarSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-bulk-bar")}
			style={slot.style("root")}
			role="status"
		>
			<span class={slot.class("count", "a-bulk-count")} style={slot.style("count")}>
				{props.countLabel ? props.countLabel(props.count) : `${props.count} selected`}
			</span>
			<div class={slot.class("actions", "a-bulk-actions")} style={slot.style("actions")}>
				{props.children}
			</div>
			<Show when={props.onClear}>
				<button
					type="button"
					class={slot.class("clear", "a-bulk-clear")}
					style={slot.style("clear")}
					onClick={() => props.onClear?.()}
				>
					Clear
				</button>
			</Show>
		</div>
	);
}

export type LiveBadgeSlot = "root" | "dot";

export type LiveBadgeProps = SlotProps<LiveBadgeSlot> & {
	/** Badge text. */
	label?: unknown;
};

/** Pulsing "Live" pill. Slots: `root` `dot`. */
export function LiveBadge(input: LiveBadgeProps) {
	const [props, rest, slot] = setup("LiveBadge", input, {}, ["label"], "root" as LiveBadgeSlot);
	return (
		<span {...rest} class={slot.class("root", "a-live")} style={slot.style("root")}>
			<span class={slot.class("dot", "a-live-dot")} style={slot.style("dot")} aria-hidden="true" />
			{props.label ?? "Live"}
		</span>
	);
}

export type UnreadBadgeProps = BaseProps & {
	/** Unread count; hidden at 0. */
	count: number;
	/** Counts above this show as `max+`. */
	max?: number | undefined;
};

/** Count bubble; hidden at 0, capped at `max` (`99+`). Slots: `root`. */
export function UnreadBadge(input: UnreadBadgeProps) {
	const [props, rest, slot] = setup("UnreadBadge", input, { max: 99 }, ["count", "max"]);
	const max = () => props.max ?? 99;
	const label = () => (props.count > max() ? `${max()}+` : String(props.count));
	return (
		<Show when={props.count > 0}>
			<span
				aria-label={`${props.count} unread`}
				{...rest}
				class={slot.class("root", "a-unread")}
				style={slot.style("root")}
				role="status"
			>
				{label()}
			</span>
		</Show>
	);
}

export type SecretFieldSlot = "root" | "label" | "value" | "actions";

export type SecretFieldProps = SlotProps<SecretFieldSlot> & {
	/** The secret (masked until revealed). */
	value: string;
	/** Field label. */
	label?: unknown;
};

/** Masked secret with reveal / copy. Slots: `root` `label` `value` `actions`. State: `data-revealed`. */
export function SecretField(input: SecretFieldProps) {
	const [props, rest, slot] = setup(
		"SecretField",
		input,
		{},
		["value", "label"],
		"root" as SecretFieldSlot,
	);
	const revealed = signal(false);
	const { copied, copy } = createCopied();
	const display = () => (revealed() ? props.value : "•".repeat(Math.min(props.value.length, 24)));
	return (
		<div
			{...rest}
			class={slot.class("root", "a-secret")}
			style={slot.style("root")}
			data-revealed={revealed() ? "" : undefined}
		>
			<Show when={props.label}>
				<span class={slot.class("label", "a-secret-label")} style={slot.style("label")}>
					{props.label}
				</span>
			</Show>
			<code class={slot.class("value", "a-secret-value")} style={slot.style("value")}>
				{display()}
			</code>
			<div class={slot.class("actions", "a-secret-actions")} style={slot.style("actions")}>
				<ActionIcon
					label={revealed() ? "Hide" : "Reveal"}
					size="sm"
					onClick={() => revealed.set(!revealed())}
				>
					<Icon name={revealed() ? "eye-off" : "eye"} size={14} />
				</ActionIcon>
				<ActionIcon
					label={copied() ? "Copied" : "Copy"}
					size="sm"
					onClick={() => copy(props.value)}
				>
					<Icon name={copied() ? "check" : "copy"} size={14} />
				</ActionIcon>
			</div>
		</div>
	);
}

export type InfiniteScrollSlot = "root" | "sentinel";

export type InfiniteScrollProps = SlotProps<InfiniteScrollSlot> & {
	/** Currently loading (prevents duplicate requests, shows a spinner). */
	loading?: boolean | undefined;
	/** Whether more items can load. */
	hasMore?: boolean | undefined;
	/** Called when the end of the list scrolls into view (or the button is pressed). */
	onLoadMore: () => void;
	/** Button text (default "Load more" / "Loading…"). */
	loadMoreLabel?: unknown;
	/** How far before the end to start loading (IntersectionObserver `rootMargin`). Default `200px`. */
	rootMargin?: string | undefined;
	/** The list rendered so far. */
	children?: unknown;
};

/** Content followed by a "Load more" control. Slots: `root` `sentinel`. State: `data-loading`. */
export function InfiniteScroll(input: InfiniteScrollProps) {
	const [props, rest, slot] = setup(
		"InfiniteScroll",
		input,
		{ rootMargin: "200px" },
		["loading", "hasMore", "onLoadMore", "loadMoreLabel", "rootMargin", "children"],
		"root" as InfiniteScrollSlot,
	);
	let sentinel: HTMLElement | undefined;
	const canLoad = () => !props.loading && props.hasMore !== false;
	const view = (
		<div
			{...rest}
			class={slot.class("root", "a-infinite")}
			style={slot.style("root")}
			aria-busy={props.loading || undefined}
			data-loading={props.loading ? "" : undefined}
		>
			{props.children}
			<Show when={props.hasMore !== false}>
				<div
					ref={(el: HTMLElement) => {
						sentinel = el;
					}}
					class={slot.class("sentinel", "a-infinite-sentinel")}
					style={slot.style("sentinel")}
				>
					{/* Keyboard / no-IntersectionObserver fallback. */}
					<Button
						variant="ghost"
						size="sm"
						loading={props.loading}
						onClick={() => {
							if (canLoad()) props.onLoadMore();
						}}
					>
						{props.loading ? "Loading…" : (props.loadMoreLabel ?? "Load more")}
					</Button>
				</div>
			</Show>
		</div>
	);
	// Auto-load when the sentinel scrolls into view.
	effect(() => {
		if (props.hasMore === false || typeof IntersectionObserver === "undefined") return;
		return whenConnected(
			() => sentinel,
			(el) => {
				const observer = new IntersectionObserver(
					(entries) => {
						if (entries.some((e) => e.isIntersecting) && canLoad()) props.onLoadMore();
					},
					{ rootMargin: props.rootMargin ?? "200px" },
				);
				observer.observe(el);
				return () => observer.disconnect();
			},
		);
	});
	return view;
}
