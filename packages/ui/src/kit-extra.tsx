import { For, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { Switch } from "./controls.tsx";
import { Icon, type IconName } from "./icons.tsx";
import { StatusDot } from "./patterns.tsx";
import { Avatar } from "./presence.tsx";
import { type BaseProps, createId, type SlotProps, setup } from "./system.ts";
import { DynamicHeading, type HeadingLevel } from "./widgets.tsx";

export type PresenceAvatarSlot = "root" | "avatar" | "dot";

export type PresenceAvatarProps = SlotProps<PresenceAvatarSlot> & {
	name: string;
	src?: string | undefined;
	size?: "sm" | "md" | "lg" | undefined;
	status?: "neutral" | "accent" | "success" | "warning" | "danger" | undefined;
};

/** Avatar with a presence dot. Slots: `root` `avatar` `dot`. State: `data-status`. */
export function PresenceAvatar(input: PresenceAvatarProps) {
	const [props, rest, slot] = setup(
		"PresenceAvatar",
		input,
		{ status: "success" },
		["name", "src", "size", "status"],
		"root" as PresenceAvatarSlot,
	);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-presence-avatar")}
			style={slot.style("root")}
			data-status={props.status}
		>
			<Avatar
				name={props.name}
				src={props.src}
				size={props.size}
				class={slot.class("avatar")}
				style={slot.style("avatar")}
			/>
			<StatusDot
				tone={props.status ?? "success"}
				class={slot.class("dot", "a-presence-avatar-dot")}
			/>
		</span>
	);
}

export type TruncateProps = BaseProps & {
	lines?: number | undefined;
	children?: unknown;
};

/** Ellipsis after `lines` lines. Slots: `root`. */
export function Truncate(input: TruncateProps) {
	const [props, rest, slot] = setup("Truncate", input, { lines: 1 }, ["lines", "children"]);
	const lines = () => props.lines ?? 1;
	return (
		<span
			{...rest}
			class={slot.class("root", "a-truncate", lines() > 1 && "a-truncate-multi")}
			style={slot.style(
				"root",
				lines() > 1
					? { "-webkit-line-clamp": String(lines()), "line-clamp": String(lines()) }
					: undefined,
			)}
		>
			{props.children}
		</span>
	);
}

export type TerminalSlot = "root" | "bar" | "title" | "body";

export type TerminalProps = SlotProps<TerminalSlot> & {
	title?: unknown;
	children?: unknown;
};

/** Terminal window mock-up. Slots: `root` `bar` `title` `body`. */
export function Terminal(input: TerminalProps) {
	const [props, rest, slot] = setup(
		"Terminal",
		input,
		{},
		["title", "children"],
		"root" as TerminalSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-terminal")} style={slot.style("root")}>
			<div class={slot.class("bar", "a-terminal-bar")} style={slot.style("bar")}>
				<span class="a-terminal-dots" aria-hidden="true">
					<span />
					<span />
					<span />
				</span>
				<span class={slot.class("title", "a-terminal-title")} style={slot.style("title")}>
					{props.title ?? "Terminal"}
				</span>
			</div>
			<pre class={slot.class("body", "a-terminal-body")} style={slot.style("body")}>
				<code>{props.children}</code>
			</pre>
		</div>
	);
}

export type DiffLine = { type: "add" | "del" | "ctx"; text: string };

export type DiffSlot = "root" | "line" | "prefix";

export type DiffProps = SlotProps<DiffSlot> & {
	lines: DiffLine[];
};

/** Unified diff lines. Slots: `root` `line` `prefix`. Lines carry `data-type`. */
export function Diff(input: DiffProps) {
	const [props, rest, slot] = setup("Diff", input, {}, ["lines"], "root" as DiffSlot);
	return (
		<pre {...rest} class={slot.class("root", "a-diff")} style={slot.style("root")}>
			<For each={props.lines}>
				{(line) => (
					<span
						class={slot.class("line", "a-diff-line", `a-diff-${line.type}`)}
						style={slot.style("line")}
						data-type={line.type}
					>
						<span class={slot.class("prefix", "a-diff-prefix")} aria-hidden="true">
							{line.type === "add" ? "+" : line.type === "del" ? "-" : " "}
						</span>
						{line.text}
					</span>
				)}
			</For>
		</pre>
	);
}

export type TrendSlot = "root" | "arrow";

export type TrendProps = SlotProps<TrendSlot> & {
	value: number;
	label?: unknown;
};

/** `+2%` / `-3%` — sign derived from the value, never doubled. */
export function formatTrend(value: number): string {
	if (!Number.isFinite(value)) return "—";
	return `${value > 0 ? "+" : ""}${value}%`;
}

/** ▲/▼ delta. Slots: `root` `arrow`. State: `data-direction="up|down"`. */
export function Trend(input: TrendProps) {
	const [props, rest, slot] = setup("Trend", input, {}, ["value", "label"], "root" as TrendSlot);
	const up = () => props.value >= 0;
	return (
		<span
			{...rest}
			class={slot.class("root", "a-trend", up() ? "a-trend-up" : "a-trend-down")}
			style={slot.style("root")}
			data-direction={up() ? "up" : "down"}
		>
			<span class={slot.class("arrow")} aria-hidden="true">
				{up() ? "▲" : "▼"}
			</span>
			{props.label ?? formatTrend(props.value)}
		</span>
	);
}

/** Clamp to [0, 100]; non-finite → 0. */
function clampPercent(value: number): number {
	return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

export type DonutChartSlot = "root" | "track" | "bar" | "label";

export type DonutChartProps = SlotProps<DonutChartSlot> & {
	value: number;
	size?: number | undefined;
	thickness?: number | undefined;
	label?: unknown;
};

/** Percentage ring. Slots: `root` `track` `bar` `label`. */
export function DonutChart(input: DonutChartProps) {
	const [props, rest, slot] = setup(
		"DonutChart",
		input,
		{ size: 96, thickness: 10 },
		["value", "size", "thickness", "label"],
		"root" as DonutChartSlot,
	);
	const size = () => props.size ?? 96;
	const thickness = () => props.thickness ?? 10;
	const r = () => Math.max(0, (size() - thickness()) / 2);
	const c = () => 2 * Math.PI * r();
	const pct = () => clampPercent(props.value);
	const offset = () => c() - (pct() / 100) * c();
	const mid = () => size() / 2;
	return (
		// biome-ignore lint/a11y/useSemanticElements: <meter> cannot host the SVG ring visual
		<div
			aria-label={typeof props.label === "string" ? props.label : "Progress"}
			{...rest}
			class={slot.class("root", "a-donut")}
			style={slot.style("root", { width: `${size()}px`, height: `${size()}px` })}
			role="meter"
			aria-valuenow={pct()}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<svg width={size()} height={size()} viewBox={`0 0 ${size()} ${size()}`} aria-hidden="true">
				<circle
					class={slot.class("track", "a-donut-track")}
					cx={mid()}
					cy={mid()}
					r={r()}
					fill="none"
					stroke-width={thickness()}
				/>
				<circle
					class={slot.class("bar", "a-donut-bar")}
					cx={mid()}
					cy={mid()}
					r={r()}
					fill="none"
					stroke-width={thickness()}
					stroke-dasharray={String(c())}
					stroke-dashoffset={String(offset())}
					transform={`rotate(-90 ${mid()} ${mid()})`}
				/>
			</svg>
			<Show when={props.label}>
				<div class={slot.class("label", "a-donut-label")} style={slot.style("label")}>
					{props.label}
				</div>
			</Show>
		</div>
	);
}

export type SparkBarSlot = "root" | "bar";

export type SparkBarProps = SlotProps<SparkBarSlot> & {
	data: number[];
	/** Accessible description (default "Bar sparkline"). */
	label?: string | undefined;
};

/** Tiny bar chart. Slots: `root` `bar`. */
export function SparkBar(input: SparkBarProps) {
	const [props, rest, slot] = setup(
		"SparkBar",
		input,
		{},
		["data", "label"],
		"root" as SparkBarSlot,
	);
	const safe = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0);
	const max = () => props.data.reduce((m, v) => Math.max(m, safe(v)), 1);
	return (
		<div
			aria-label={props.label ?? "Bar sparkline"}
			{...rest}
			class={slot.class("root", "a-sparkbar")}
			style={slot.style("root")}
			role="img"
		>
			<For each={props.data}>
				{(v) => (
					<span
						class={slot.class("bar", "a-sparkbar-col")}
						style={slot.style("bar", { height: `${(safe(v) / max()) * 100}%` })}
					/>
				)}
			</For>
		</div>
	);
}

export type SkeletonTextSlot = "root" | "line";

export type SkeletonTextProps = SlotProps<SkeletonTextSlot> & {
	lines?: number | undefined;
};

/** Placeholder text lines. Slots: `root` `line`. */
export function SkeletonText(input: SkeletonTextProps) {
	const [props, rest, slot] = setup(
		"SkeletonText",
		input,
		{ lines: 3 },
		["lines"],
		"root" as SkeletonTextSlot,
	);
	const count = () => Math.max(0, Math.floor(props.lines ?? 3));
	return (
		<div
			{...rest}
			class={slot.class("root", "a-skel-text")}
			style={slot.style("root")}
			aria-hidden="true"
		>
			{Array.from({ length: count() }, (_, i) => (
				<span
					class={slot.class("line", "a-skel-line")}
					style={slot.style("line", { width: i === count() - 1 ? "62%" : "100%" })}
				/>
			))}
		</div>
	);
}

export type SkeletonCardSlot = "root" | "block" | "text";

export type SkeletonCardProps = SlotProps<SkeletonCardSlot>;

/** Placeholder card. Slots: `root` `block` `text`. */
export function SkeletonCard(input: SkeletonCardProps) {
	const [, rest, slot] = setup("SkeletonCard", input, {}, [], "root" as SkeletonCardSlot);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-skel-card")}
			style={slot.style("root")}
			aria-hidden="true"
		>
			<span
				class={slot.class("block", "a-skel-block", "a-skel-block-lg")}
				style={slot.style("block")}
			/>
			<SkeletonText lines={2} class={slot.class("text")} style={slot.style("text")} />
		</div>
	);
}

export type LoadingButtonProps = BaseProps & {
	loading?: boolean | undefined;
	disabled?: boolean | undefined;
	variant?: "solid" | "ghost" | "danger" | undefined;
	size?: "sm" | "md" | undefined;
	type?: "button" | "submit" | "reset" | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

/** Button that shows a spinner next to its label while busy. Slots: `root` (the Button). */
export function LoadingButton(input: LoadingButtonProps) {
	const [props, rest, slot] = setup("LoadingButton", input, {}, [
		"loading",
		"disabled",
		"variant",
		"size",
		"type",
		"onClick",
		"children",
	]);
	return (
		<Button
			{...rest}
			variant={props.variant}
			size={props.size}
			type={props.type}
			unstyled={props.unstyled}
			disabled={props.disabled || props.loading}
			aria-busy={props.loading || undefined}
			onClick={props.onClick}
			class={slot.class("root", "a-loading-btn", props.loading && "a-loading-btn-busy")}
			style={slot.style("root")}
			start={props.loading ? <Icon name="spinner" size={14} /> : undefined}
		>
			{props.children}
		</Button>
	);
}

export type ConfirmButtonProps = BaseProps & {
	label: unknown;
	confirmLabel?: unknown;
	variant?: "solid" | "ghost" | "danger" | undefined;
	size?: "sm" | "md" | undefined;
	onConfirm: () => void;
};

const CONFIRM_WINDOW_MS = 2500;

/** Two-step confirm control (click → confirm). Slots: `root` (the Button). State: `data-armed`. */
export function ConfirmButton(input: ConfirmButtonProps) {
	const [props, rest, slot] = setup("ConfirmButton", input, {}, [
		"label",
		"confirmLabel",
		"variant",
		"size",
		"onConfirm",
	]);
	const armed = signal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	const disarm = () => {
		clearTimeout(timer);
		timer = undefined;
		armed.set(false);
	};
	effect(() => () => clearTimeout(timer));
	return (
		<Button
			{...rest}
			variant={props.variant ?? (armed() ? "danger" : "ghost")}
			size={props.size}
			unstyled={props.unstyled}
			class={slot.class("root", "a-confirm-btn")}
			style={slot.style("root")}
			data-armed={armed() ? "" : undefined}
			onClick={() => {
				if (!armed()) {
					armed.set(true);
					clearTimeout(timer);
					timer = setTimeout(disarm, CONFIRM_WINDOW_MS);
					return;
				}
				disarm();
				props.onConfirm();
			}}
		>
			{armed() ? (props.confirmLabel ?? "Confirm?") : props.label}
		</Button>
	);
}

export type SettingsRowSlot = "root" | "text" | "label" | "description" | "control";

export type SettingsRowProps = SlotProps<SettingsRowSlot> & {
	label: unknown;
	description?: unknown;
	control?: unknown;
	/** Ids for the label / description, so the control can reference them. */
	labelId?: string | undefined;
	descriptionId?: string | undefined;
};

/** Label + description + control row. Slots: `root` `text` `label` `description` `control`. */
export function SettingsRow(input: SettingsRowProps) {
	const [props, rest, slot] = setup(
		"SettingsRow",
		input,
		{},
		["label", "description", "control", "labelId", "descriptionId"],
		"root" as SettingsRowSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-settings-row")} style={slot.style("root")}>
			<div class={slot.class("text", "a-settings-row-text")} style={slot.style("text")}>
				<div
					id={props.labelId}
					class={slot.class("label", "a-settings-row-label")}
					style={slot.style("label")}
				>
					{props.label}
				</div>
				<Show when={props.description}>
					<div
						id={props.descriptionId}
						class={slot.class("description", "a-settings-row-desc")}
						style={slot.style("description")}
					>
						{props.description}
					</div>
				</Show>
			</div>
			<Show when={props.control}>
				<div class={slot.class("control", "a-settings-row-control")} style={slot.style("control")}>
					{props.control}
				</div>
			</Show>
		</div>
	);
}

export type ToggleRowProps = BaseProps & {
	label: unknown;
	description?: unknown;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean | undefined;
};

/** SettingsRow with a Switch. Slots: `root` (the SettingsRow). */
export function ToggleRow(input: ToggleRowProps) {
	const [props, rest, slot] = setup("ToggleRow", input, {}, [
		"label",
		"description",
		"checked",
		"onChange",
		"disabled",
	]);
	const id = createId("toggle-row");
	return (
		<SettingsRow
			{...rest}
			labelId={`${id}-label`}
			descriptionId={props.description ? `${id}-desc` : undefined}
			unstyled={props.unstyled}
			class={slot.class("root")}
			style={slot.style("root")}
			data-state={props.checked ? "on" : "off"}
			label={props.label}
			description={props.description}
			control={
				<Switch
					aria-labelledby={`${id}-label`}
					aria-describedby={props.description ? `${id}-desc` : undefined}
					checked={props.checked}
					disabled={props.disabled}
					onChange={(e: Event) => props.onChange((e.target as HTMLInputElement).checked)}
				/>
			}
		/>
	);
}

export type DangerZoneSlot = "root" | "header" | "title" | "description" | "body";

export type DangerZoneProps = SlotProps<DangerZoneSlot> & {
	title?: unknown;
	description?: unknown;
	children?: unknown;
};

/** Destructive-settings section. Slots: `root` `header` `title` `description` `body`. */
export function DangerZone(input: DangerZoneProps) {
	const [props, rest, slot] = setup(
		"DangerZone",
		input,
		{},
		["title", "description", "children"],
		"root" as DangerZoneSlot,
	);
	return (
		<section {...rest} class={slot.class("root", "a-danger-zone")} style={slot.style("root")}>
			<header class={slot.class("header", "a-danger-zone-head")} style={slot.style("header")}>
				<strong class={slot.class("title")} style={slot.style("title")}>
					{props.title ?? "Danger zone"}
				</strong>
				<Show when={props.description}>
					<p class={slot.class("description")} style={slot.style("description")}>
						{props.description}
					</p>
				</Show>
			</header>
			<div class={slot.class("body", "a-danger-zone-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</section>
	);
}

export type StickyBarProps = BaseProps & {
	position?: "top" | "bottom" | undefined;
	children?: unknown;
};

/** Bar pinned to the top/bottom of its scroll container. Slots: `root`. State: `data-position`. */
export function StickyBar(input: StickyBarProps) {
	const [props, rest, slot] = setup("StickyBar", input, { position: "bottom" }, [
		"position",
		"children",
	]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-sticky-bar", `a-sticky-bar-${props.position}`)}
			style={slot.style("root")}
			data-position={props.position}
		>
			{props.children}
		</div>
	);
}

export type SiteFooterLink = {
	label: string;
	/** Renders a real link when set. */
	href?: string | undefined;
	onClick?: (() => void) | undefined;
};

export type SiteFooterSlot = "root" | "grid" | "brand" | "column" | "columnTitle" | "link" | "meta";

export type SiteFooterProps = SlotProps<SiteFooterSlot> & {
	brand?: unknown;
	columns?: Array<{ title: string; links: SiteFooterLink[] }> | undefined;
	meta?: unknown;
};

/** Marketing footer. Slots: `root` `grid` `brand` `column` `columnTitle` `link` `meta`. */
export function SiteFooter(input: SiteFooterProps) {
	const [props, rest, slot] = setup(
		"SiteFooter",
		input,
		{},
		["brand", "columns", "meta"],
		"root" as SiteFooterSlot,
	);
	const linkClass = () => slot.class("link", "a-site-footer-link");
	return (
		<footer {...rest} class={slot.class("root", "a-site-footer")} style={slot.style("root")}>
			<div class={slot.class("grid", "a-site-footer-grid")} style={slot.style("grid")}>
				<Show when={props.brand}>
					<div class={slot.class("brand", "a-site-footer-brand")} style={slot.style("brand")}>
						{props.brand}
					</div>
				</Show>
				<For each={props.columns ?? []}>
					{(col) => (
						<nav
							class={slot.class("column", "a-site-footer-col")}
							style={slot.style("column")}
							aria-label={col.title}
						>
							<p
								class={slot.class("columnTitle", "a-site-footer-col-title")}
								style={slot.style("columnTitle")}
							>
								{col.title}
							</p>
							<ul>
								<For each={col.links}>
									{(link) => (
										<li>
											{link.href ? (
												<a class={linkClass()} href={link.href} onClick={() => link.onClick?.()}>
													{link.label}
												</a>
											) : (
												<button type="button" class={linkClass()} onClick={() => link.onClick?.()}>
													{link.label}
												</button>
											)}
										</li>
									)}
								</For>
							</ul>
						</nav>
					)}
				</For>
			</div>
			<Show when={props.meta}>
				<div class={slot.class("meta", "a-site-footer-meta")} style={slot.style("meta")}>
					{props.meta}
				</div>
			</Show>
		</footer>
	);
}

export type SocialLink = {
	icon: IconName;
	label: string;
	/** Renders a real link (opens in a new tab) when set. */
	href?: string | undefined;
	onClick?: (() => void) | undefined;
};

export type SocialLinksSlot = "root" | "link";

export type SocialLinksProps = SlotProps<SocialLinksSlot> & {
	items: SocialLink[];
};

/** Row of icon links. Slots: `root` `link`. */
export function SocialLinks(input: SocialLinksProps) {
	const [props, rest, slot] = setup("SocialLinks", input, {}, ["items"], "root" as SocialLinksSlot);
	return (
		<div {...rest} class={slot.class("root", "a-social")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) =>
					item.href ? (
						<a
							class={slot.class("link", "a-social-btn")}
							style={slot.style("link")}
							href={item.href}
							target="_blank"
							rel="noopener noreferrer"
							aria-label={item.label}
							onClick={() => item.onClick?.()}
						>
							<Icon name={item.icon} size={16} />
						</a>
					) : (
						<button
							type="button"
							class={slot.class("link", "a-social-btn")}
							style={slot.style("link")}
							aria-label={item.label}
							onClick={() => item.onClick?.()}
						>
							<Icon name={item.icon} size={16} />
						</button>
					)
				}
			</For>
		</div>
	);
}

export type ReelProps = BaseProps & { children?: unknown };

/** Horizontal scroll reel. Slots: `root`. */
export function Reel(input: ReelProps) {
	const [props, rest, slot] = setup("Reel", input, {}, ["children"]);
	return (
		// Focusable so keyboard users can scroll it; pass tabindex={-1} if the content is focusable.
		<div tabindex="0" {...rest} class={slot.class("root", "a-reel")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type GalleryGridProps = BaseProps & {
	columns?: 2 | 3 | 4 | undefined;
	children?: unknown;
};

/** Image grid. Slots: `root`. State: `data-columns`. */
export function GalleryGrid(input: GalleryGridProps) {
	const [props, rest, slot] = setup("GalleryGrid", input, { columns: 3 }, ["columns", "children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-gallery", `a-gallery-${props.columns}`)}
			style={slot.style("root")}
			data-columns={props.columns}
		>
			{props.children}
		</div>
	);
}

export type TestimonialSlot = "root" | "quote" | "author" | "avatar" | "name" | "role";

export type TestimonialProps = SlotProps<TestimonialSlot> & {
	quote: unknown;
	author: string;
	/** Author's job title (consumed here; not forwarded as an ARIA role). */
	role?: string | undefined;
	avatar?: string | undefined;
};

/** Customer quote. Slots: `root` `quote` `author` `avatar` `name` `role`. */
export function Testimonial(input: TestimonialProps) {
	const [props, rest, slot] = setup(
		"Testimonial",
		input,
		{},
		["quote", "author", "role", "avatar"],
		"root" as TestimonialSlot,
	);
	return (
		<figure {...rest} class={slot.class("root", "a-testimonial")} style={slot.style("root")}>
			<blockquote class={slot.class("quote", "a-testimonial-quote")} style={slot.style("quote")}>
				{props.quote}
			</blockquote>
			<figcaption class={slot.class("author", "a-testimonial-author")} style={slot.style("author")}>
				<Avatar name={props.author} src={props.avatar} size="sm" class={slot.class("avatar")} />
				<span>
					<strong class={slot.class("name")}>{props.author}</strong>
					<Show when={props.role}>
						<span class={slot.class("role", "a-testimonial-role")} style={slot.style("role")}>
							{props.role}
						</span>
					</Show>
				</span>
			</figcaption>
		</figure>
	);
}

export type ReviewCardSlot = "root" | "stars" | "star" | "title" | "body" | "author";

export type ReviewCardProps = SlotProps<ReviewCardSlot> & {
	rating: number;
	title?: unknown;
	/** Heading level of the title, to fit the page outline. Default 4. */
	order?: HeadingLevel | undefined;
	author?: unknown;
	children?: unknown;
};

/** Star-rated review. Slots: `root` `stars` `star` `title` `body` `author`. State: `data-rating`. */
export function ReviewCard(input: ReviewCardProps) {
	const [props, rest, slot] = setup(
		"ReviewCard",
		input,
		{},
		["rating", "title", "order", "author", "children"],
		"root" as ReviewCardSlot,
	);
	const filled = () => Math.round(Number.isFinite(props.rating) ? props.rating : 0);
	return (
		<article
			{...rest}
			class={slot.class("root", "a-review")}
			style={slot.style("root")}
			data-rating={filled()}
		>
			<div
				class={slot.class("stars", "a-review-stars")}
				style={slot.style("stars")}
				role="img"
				aria-label={`${props.rating} out of 5`}
			>
				{Array.from({ length: 5 }, (_, i) => (
					<span
						class={slot.class("star", "a-review-star", i < filled() && "a-review-star-on")}
						aria-hidden="true"
					>
						★
					</span>
				))}
			</div>
			<Show when={props.title}>
				<DynamicHeading
					level={props.order ?? 4}
					class={slot.class("title", "a-review-title")}
					style={slot.style("title")}
				>
					{props.title}
				</DynamicHeading>
			</Show>
			<div class={slot.class("body", "a-review-body")} style={slot.style("body")}>
				{props.children}
			</div>
			<Show when={props.author}>
				<p class={slot.class("author", "a-review-author")} style={slot.style("author")}>
					{props.author}
				</p>
			</Show>
		</article>
	);
}

export type LogoCloudSlot = "root" | "item";

export type LogoCloudProps = SlotProps<LogoCloudSlot> & {
	items: unknown[];
};

/** Row of partner logos / names. Slots: `root` `item`. */
export function LogoCloud(input: LogoCloudProps) {
	const [props, rest, slot] = setup("LogoCloud", input, {}, ["items"], "root" as LogoCloudSlot);
	return (
		<div {...rest} class={slot.class("root", "a-logo-cloud")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) => (
					<span class={slot.class("item", "a-logo-cloud-item")} style={slot.style("item")}>
						{item}
					</span>
				)}
			</For>
		</div>
	);
}

export type UploadItemSlot = "root" | "row" | "name" | "status" | "cancel" | "track" | "bar";

export type UploadItemProps = SlotProps<UploadItemSlot> & {
	name: string;
	progress: number;
	error?: string | undefined;
	onCancel?: (() => void) | undefined;
};

/**
 * File upload row with progress.
 * Slots: `root` `row` `name` `status` `cancel` `track` `bar`. State: `data-state="uploading|done|error"`.
 */
export function UploadItem(input: UploadItemProps) {
	const [props, rest, slot] = setup(
		"UploadItem",
		input,
		{},
		["name", "progress", "error", "onCancel"],
		"root" as UploadItemSlot,
	);
	const pct = () => Math.round(clampPercent(props.progress));
	const state = () => (props.error ? "error" : pct() >= 100 ? "done" : "uploading");
	return (
		<div
			{...rest}
			class={slot.class("root", "a-upload-item", props.error && "a-upload-item-error")}
			style={slot.style("root")}
			data-state={state()}
		>
			<div class={slot.class("row", "a-upload-item-row")} style={slot.style("row")}>
				<span class={slot.class("name", "a-upload-item-name")} style={slot.style("name")}>
					{props.name}
				</span>
				<span class={slot.class("status", "a-upload-item-pct")} style={slot.style("status")}>
					{props.error ?? `${pct()}%`}
				</span>
				<Show when={props.onCancel}>
					<button
						type="button"
						class={slot.class("cancel", "a-upload-item-cancel")}
						style={slot.style("cancel")}
						onClick={() => props.onCancel?.()}
					>
						Cancel
					</button>
				</Show>
			</div>
			<div
				class={slot.class("track", "a-upload-item-track")}
				style={slot.style("track")}
				role="progressbar"
				aria-label={props.name}
				aria-valuenow={pct()}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div
					class={slot.class("bar", "a-upload-item-bar")}
					style={slot.style("bar", { width: `${pct()}%` })}
				/>
			</div>
		</div>
	);
}

export type WizardNavSlot = "root" | "back" | "next";

export type WizardNavProps = SlotProps<WizardNavSlot> & {
	canBack?: boolean | undefined;
	canNext?: boolean | undefined;
	nextLabel?: unknown;
	backLabel?: unknown;
	onBack?: (() => void) | undefined;
	onNext?: (() => void) | undefined;
};

/** Back / Continue footer for multi-step flows. Slots: `root` `back` `next`. */
export function WizardNav(input: WizardNavProps) {
	const [props, rest, slot] = setup(
		"WizardNav",
		input,
		{},
		["canBack", "canNext", "nextLabel", "backLabel", "onBack", "onNext"],
		"root" as WizardNavSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-wizard-nav")} style={slot.style("root")}>
			<Button
				size="sm"
				variant="ghost"
				class={slot.class("back")}
				style={slot.style("back")}
				disabled={props.canBack === false}
				onClick={() => props.onBack?.()}
			>
				{props.backLabel ?? "Back"}
			</Button>
			<Button
				size="sm"
				class={slot.class("next")}
				style={slot.style("next")}
				disabled={props.canNext === false}
				onClick={() => props.onNext?.()}
			>
				{props.nextLabel ?? "Continue"}
			</Button>
		</div>
	);
}

export type FormFooterProps = BaseProps & { children?: unknown };

/** Right-aligned form actions row. Slots: `root`. */
export function FormFooter(input: FormFooterProps) {
	const [props, rest, slot] = setup("FormFooter", input, {}, ["children"]);
	return (
		<div {...rest} class={slot.class("root", "a-form-footer")} style={slot.style("root")}>
			{props.children}
		</div>
	);
}

export type DetailsSlot = "root" | "summary" | "body";

export type DetailsProps = SlotProps<DetailsSlot> & {
	summary: unknown;
	open?: boolean | undefined;
	children?: unknown;
};

/** Native `<details>` disclosure (listen with `onToggle`). Slots: `root` `summary` `body`. */
export function Details(input: DetailsProps) {
	const [props, rest, slot] = setup(
		"Details",
		input,
		{},
		["summary", "open", "children"],
		"root" as DetailsSlot,
	);
	return (
		<details
			{...rest}
			class={slot.class("root", "a-details")}
			style={slot.style("root")}
			open={props.open}
		>
			<summary class={slot.class("summary", "a-details-summary")} style={slot.style("summary")}>
				{props.summary}
			</summary>
			<div class={slot.class("body", "a-details-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</details>
	);
}

export type MetricSlot = "root" | "label" | "row" | "value" | "trend";

export type MetricProps = SlotProps<MetricSlot> & {
	label: unknown;
	value: unknown;
	trend?: number | undefined;
};

/** Compact KPI with optional Trend. Slots: `root` `label` `row` `value` `trend`. */
export function Metric(input: MetricProps) {
	const [props, rest, slot] = setup(
		"Metric",
		input,
		{},
		["label", "value", "trend"],
		"root" as MetricSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-metric")} style={slot.style("root")}>
			<p class={slot.class("label", "a-metric-label")} style={slot.style("label")}>
				{props.label}
			</p>
			<div class={slot.class("row", "a-metric-row")} style={slot.style("row")}>
				<p class={slot.class("value", "a-metric-value")} style={slot.style("value")}>
					{props.value}
				</p>
				<Show when={props.trend != null}>
					<Trend value={props.trend as number} class={slot.class("trend")} />
				</Show>
			</div>
		</div>
	);
}
