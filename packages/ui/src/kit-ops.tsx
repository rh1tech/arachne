/**
 * Ops / docs / team / billing widgets.
 */
import { For, Show } from "@arachne/render";
import { signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { cx } from "./cx.ts";
import { Icon, type IconName } from "./icons.tsx";
import { StatusDot } from "./patterns.tsx";
import { Avatar } from "./presence.tsx";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type CalloutTone = "info" | "tip" | "warning" | "danger" | "note";

export type CalloutSlot = "root" | "icon" | "body" | "title" | "content";

export type CalloutProps = SlotProps<CalloutSlot> & {
	tone?: CalloutTone | undefined;
	title?: string | undefined;
	/** Replace the tone icon (`null` hides it). */
	icon?: unknown;
	children?: unknown;
};

const CALLOUT_ICONS: Record<CalloutTone, IconName> = {
	info: "info",
	tip: "zap",
	warning: "warning",
	danger: "error",
	note: "file",
};

/** Fraction `value / max` clamped to [0, 1]; 0 for non-finite input or `max <= 0`. */
function fraction(value: number, max: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
	return Math.min(1, Math.max(0, value / max));
}

/** Slots: `root` `icon` `body` `title` `content`. */
export function Callout(input: CalloutProps) {
	const [props, rest, slot] = setup(
		"Callout",
		input,
		{ tone: "info" },
		["tone", "title", "icon", "children"],
		"root" as CalloutSlot,
	);
	const tone = () => props.tone ?? "info";
	return (
		<aside
			{...rest}
			class={slot.class("root", "a-callout", `a-callout-${tone()}`)}
			style={slot.style("root")}
			role="note"
			data-tone={tone()}
		>
			<Show when={props.icon !== null}>
				<span
					class={slot.class("icon", "a-callout-icon")}
					style={slot.style("icon")}
					aria-hidden="true"
				>
					{props.icon ?? <Icon name={CALLOUT_ICONS[tone()]} size="sm" />}
				</span>
			</Show>
			<div class={slot.class("body", "a-callout-body")} style={slot.style("body")}>
				<Show when={props.title}>
					<strong class={slot.class("title", "a-callout-title")} style={slot.style("title")}>
						{props.title}
					</strong>
				</Show>
				<div class={slot.class("content", "a-callout-content")} style={slot.style("content")}>
					{props.children}
				</div>
			</div>
		</aside>
	);
}

export type ChangelogItemSlot = "root" | "header" | "date" | "title" | "body";

export type ChangelogItemProps = SlotProps<ChangelogItemSlot> & {
	version: string;
	date?: string | undefined;
	title?: string | undefined;
	children?: unknown;
};

/** Slots: `root` `header` `date` `title` `body`. */
export function ChangelogItem(input: ChangelogItemProps) {
	const [props, rest, slot] = setup(
		"ChangelogItem",
		input,
		{},
		["version", "date", "title", "children"],
		"root" as ChangelogItemSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-changelog")} style={slot.style("root")}>
			<header class={slot.class("header", "a-changelog-head")} style={slot.style("header")}>
				<VersionTag version={props.version} />
				<Show when={props.date}>
					<time class={slot.class("date", "a-changelog-date")} style={slot.style("date")}>
						{props.date}
					</time>
				</Show>
			</header>
			<Show when={props.title}>
				<h4 class={slot.class("title", "a-changelog-title")} style={slot.style("title")}>
					{props.title}
				</h4>
			</Show>
			<Show when={props.children}>
				<div class={slot.class("body", "a-changelog-body")} style={slot.style("body")}>
					{props.children}
				</div>
			</Show>
		</article>
	);
}

export type VersionTagProps = BaseProps & {
	version: string;
};

/** Slots: `root`. */
export function VersionTag(input: VersionTagProps) {
	const [props, rest, slot] = setup("VersionTag", input, {}, ["version"]);
	return (
		<span {...rest} class={slot.class("root", "a-version-tag")} style={slot.style("root")}>
			v{props.version.replace(/^v/, "")}
		</span>
	);
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export type HttpMethodBadgeProps = BaseProps & {
	method: HttpMethod;
};

/** Slots: `root`. State: `data-method`. */
export function HttpMethodBadge(input: HttpMethodBadgeProps) {
	const [props, rest, slot] = setup("HttpMethodBadge", input, {}, ["method"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-http", `a-http-${props.method.toLowerCase()}`)}
			style={slot.style("root")}
			data-method={props.method}
		>
			{props.method}
		</span>
	);
}

export type EndpointRowSlot = "root" | "path" | "summary";

export type EndpointRowProps = SlotProps<EndpointRowSlot> & {
	method: HttpMethod;
	path: string;
	summary?: string | undefined;
	onClick?: (() => void) | undefined;
};

/** Slots: `root` `path` `summary`. */
export function EndpointRow(input: EndpointRowProps) {
	const [props, rest, slot] = setup(
		"EndpointRow",
		input,
		{},
		["method", "path", "summary", "onClick"],
		"root" as EndpointRowSlot,
	);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-endpoint")}
			style={slot.style("root")}
			data-method={props.method}
			onClick={() => props.onClick?.()}
		>
			<HttpMethodBadge method={props.method} />
			<code class={slot.class("path", "a-endpoint-path")} style={slot.style("path")}>
				{props.path}
			</code>
			<Show when={props.summary}>
				<span class={slot.class("summary", "a-endpoint-summary")} style={slot.style("summary")}>
					{props.summary}
				</span>
			</Show>
		</button>
	);
}

export type JsonNode =
	| { kind: "primitive"; value: string | number | boolean | null }
	| { kind: "object"; entries: Array<{ key: string; value: JsonNode }> }
	| { kind: "array"; items: JsonNode[] };

export type JsonTreeProps = BaseProps & {
	data: JsonNode;
};

const INDENT_REM = 0.85;

function primitiveClass(v: string | number | boolean | null): string {
	if (v === null) return "a-json-null";
	if (typeof v === "string") return "a-json-str";
	if (typeof v === "boolean") return "a-json-bool";
	return "a-json-num";
}

type JsonChild = { label: string; node: JsonNode };

function jsonChildren(node: JsonNode): JsonChild[] {
	if (node.kind === "array") return node.items.map((item, i) => ({ label: String(i), node: item }));
	if (node.kind === "object") return node.entries.map((e) => ({ label: e.key, node: e.value }));
	return [];
}

function JsonKey(props: { label?: string | undefined }) {
	return (
		<Show when={props.label != null}>
			<span class="a-json-key">{props.label}: </span>
		</Show>
	);
}

function JsonTreeNode(props: { node: JsonNode; label?: string | undefined; depth?: number }) {
	const open = signal(true);
	const depth = () => props.depth ?? 0;
	const indent = () => ({ "padding-left": `${depth() * INDENT_REM}rem` });
	const node = props.node;
	if (node.kind === "primitive") {
		const v = node.value;
		return (
			<div class="a-json-row" style={indent()}>
				<JsonKey label={props.label} />
				<span class={primitiveClass(v)}>{v === null ? "null" : JSON.stringify(v)}</span>
			</div>
		);
	}
	const children = jsonChildren(node);
	const meta = node.kind === "array" ? `[${children.length}]` : `{${children.length}}`;
	return (
		<div class="a-json-branch">
			<button
				type="button"
				class="a-json-toggle"
				style={indent()}
				aria-expanded={open()}
				onClick={() => open.set(!open())}
			>
				<Icon name={open() ? "chevron-down" : "chevron-right"} size="sm" />
				<JsonKey label={props.label} />
				<span class="a-json-meta">{meta}</span>
			</button>
			<Show when={open()}>
				<For each={children}>
					{(child) => <JsonTreeNode node={child.node} label={child.label} depth={depth() + 1} />}
				</For>
			</Show>
		</div>
	);
}

/** Collapsible JSON tree. Slots: `root`. */
export function JsonTree(input: JsonTreeProps) {
	const [props, rest, slot] = setup("JsonTree", input, {}, ["data"]);
	return (
		<div {...rest} class={slot.class("root", "a-json-tree")} style={slot.style("root")}>
			<JsonTreeNode node={props.data} />
		</div>
	);
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogLineData = {
	time?: string | undefined;
	level: LogLevel;
	message: string;
};

export type LogViewerSlot = "root" | "line" | "time" | "level" | "message";

export type LogViewerProps = SlotProps<LogViewerSlot> & {
	lines: LogLineData[];
};

/** Slots: `root` `line` `time` `level` `message`. Lines expose `data-level`. */
export function LogViewer(input: LogViewerProps) {
	const [props, rest, slot] = setup("LogViewer", input, {}, ["lines"], "root" as LogViewerSlot);
	return (
		<pre {...rest} class={slot.class("root", "a-log")} style={slot.style("root")}>
			<For each={props.lines}>
				{(line) => (
					<span
						class={slot.class("line", "a-log-line", `a-log-${line.level}`)}
						style={slot.style("line")}
						data-level={line.level}
					>
						<Show when={line.time}>
							<span class={slot.class("time", "a-log-time")}>{line.time}</span>
						</Show>
						<span class={slot.class("level", "a-log-level")}>{line.level.toUpperCase()}</span>
						<span class={slot.class("message", "a-log-msg")}>{line.message}</span>
					</span>
				)}
			</For>
		</pre>
	);
}

export type ServiceStatusKind = "operational" | "degraded" | "outage" | "maintenance";

export type ServiceStatusSlot = "root" | "name" | "status";

export type ServiceStatusProps = SlotProps<ServiceStatusSlot> & {
	name: string;
	status: ServiceStatusKind;
};

const SERVICE_TONES: Record<ServiceStatusKind, "success" | "warning" | "accent" | "danger"> = {
	operational: "success",
	degraded: "warning",
	maintenance: "accent",
	outage: "danger",
};

/** Slots: `root` `name` `status`. State: `data-status`. */
export function ServiceStatus(input: ServiceStatusProps) {
	const [props, rest, slot] = setup(
		"ServiceStatus",
		input,
		{},
		["name", "status"],
		"root" as ServiceStatusSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-service")}
			style={slot.style("root")}
			data-status={props.status}
		>
			<span class={slot.class("name", "a-service-name")} style={slot.style("name")}>
				{props.name}
			</span>
			<span
				class={slot.class("status", "a-service-status", `a-service-${props.status}`)}
				style={slot.style("status")}
			>
				<StatusDot tone={SERVICE_TONES[props.status] ?? "danger"} />
				{props.status}
			</span>
		</div>
	);
}

export type UptimeBarSlot = "root" | "day";

export type UptimeBarProps = SlotProps<UptimeBarSlot> & {
	/** 0–1 values, oldest → newest */
	days: number[];
	/** Accessible summary (default "Uptime history"). */
	label?: string | undefined;
};

function uptimeTone(d: number): "ok" | "warn" | "bad" {
	if (d >= 0.99) return "ok";
	if (d >= 0.95) return "warn";
	return "bad";
}

/** Slots: `root` `day`. Days expose `data-tone` (`ok` / `warn` / `bad`). */
export function UptimeBar(input: UptimeBarProps) {
	const [props, rest, slot] = setup(
		"UptimeBar",
		input,
		{},
		["days", "label"],
		"root" as UptimeBarSlot,
	);
	return (
		<div
			aria-label={props.label ?? "Uptime history"}
			{...rest}
			class={slot.class("root", "a-uptime")}
			style={slot.style("root")}
			role="img"
		>
			<For each={props.days}>
				{(d) => (
					<span
						class={slot.class("day", "a-uptime-day", `a-uptime-${uptimeTone(d)}`)}
						style={slot.style("day")}
						data-tone={uptimeTone(d)}
						title={`${Math.round(d * 1000) / 10}%`}
					/>
				)}
			</For>
		</div>
	);
}

export type UsageMeterSlot = "root" | "header" | "label" | "meta" | "track" | "fill";

export type UsageMeterProps = SlotProps<UsageMeterSlot> & {
	label: string;
	used: number;
	limit: number;
	unit?: string | undefined;
};

/** Slots: `root` `header` `label` `meta` `track` `fill`. State: `data-over` at/over the limit. */
export function UsageMeter(input: UsageMeterProps) {
	const [props, rest, slot] = setup(
		"UsageMeter",
		input,
		{},
		["label", "used", "limit", "unit"],
		"root" as UsageMeterSlot,
	);
	const pct = () => Math.round(fraction(props.used, props.limit) * 100);
	const over = () => props.limit > 0 && props.used >= props.limit;
	const unit = () => (props.unit ? ` ${props.unit}` : "");
	return (
		<div
			{...rest}
			class={slot.class("root", "a-usage")}
			style={slot.style("root")}
			data-over={over() ? "" : undefined}
		>
			<div class={slot.class("header", "a-usage-head")} style={slot.style("header")}>
				<span class={slot.class("label", "a-usage-label")}>{props.label}</span>
				<span class={slot.class("meta", "a-usage-meta")}>
					{props.used}
					{unit()} / {props.limit}
					{unit()}
				</span>
			</div>
			<div
				class={slot.class("track", "a-usage-track")}
				style={slot.style("track")}
				role="progressbar"
				aria-label={props.label}
				aria-valuenow={pct()}
				aria-valuemin={0}
				aria-valuemax={100}
			>
				<div
					class={slot.class("fill", "a-usage-fill", over() && "a-usage-over")}
					style={slot.style("fill", { width: `${pct()}%` })}
				/>
			</div>
		</div>
	);
}

export type UpgradeBannerSlot = "root" | "body" | "title" | "content" | "action";

export type UpgradeBannerProps = SlotProps<UpgradeBannerSlot> & {
	title?: string | undefined;
	children?: unknown;
	action?: unknown;
};

/** Slots: `root` `body` `title` `content` `action`. */
export function UpgradeBanner(input: UpgradeBannerProps) {
	const [props, rest, slot] = setup(
		"UpgradeBanner",
		input,
		{},
		["title", "children", "action"],
		"root" as UpgradeBannerSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-upgrade")} style={slot.style("root")}>
			<div class={slot.class("body", "a-upgrade-body")} style={slot.style("body")}>
				<Show when={props.title}>
					<strong class={slot.class("title", "a-upgrade-title")}>{props.title}</strong>
				</Show>
				<div class={slot.class("content")} style={slot.style("content")}>
					{props.children}
				</div>
			</div>
			<Show when={props.action}>
				<div class={slot.class("action", "a-upgrade-action")} style={slot.style("action")}>
					{props.action}
				</div>
			</Show>
		</div>
	);
}

export type ProfileHeaderSlot =
	| "root"
	| "cover"
	| "main"
	| "avatar"
	| "meta"
	| "name"
	| "handle"
	| "bio"
	| "actions";

export type ProfileHeaderProps = SlotProps<ProfileHeaderSlot> & {
	name: string;
	handle?: string | undefined;
	bio?: string | undefined;
	src?: string | undefined;
	cover?: string | undefined;
	actions?: unknown;
};

/** Slots: `root` `cover` `main` `avatar` `meta` `name` `handle` `bio` `actions`. */
export function ProfileHeader(input: ProfileHeaderProps) {
	const [props, rest, slot] = setup(
		"ProfileHeader",
		input,
		{},
		["name", "handle", "bio", "src", "cover", "actions"],
		"root" as ProfileHeaderSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-profile")} style={slot.style("root")}>
			<div
				class={slot.class("cover", "a-profile-cover")}
				style={slot.style(
					"cover",
					props.cover ? { "background-image": `url(${JSON.stringify(props.cover)})` } : undefined,
				)}
			/>
			<div class={slot.class("main", "a-profile-main")} style={slot.style("main")}>
				<Avatar
					name={props.name}
					src={props.src}
					size="lg"
					class={slot.class("avatar", "a-profile-avatar")}
				/>
				<div class={slot.class("meta", "a-profile-meta")} style={slot.style("meta")}>
					<h3 class={slot.class("name", "a-profile-name")}>{props.name}</h3>
					<Show when={props.handle}>
						<p class={slot.class("handle", "a-profile-handle")}>@{props.handle}</p>
					</Show>
					<Show when={props.bio}>
						<p class={slot.class("bio", "a-profile-bio")}>{props.bio}</p>
					</Show>
				</div>
				<Show when={props.actions}>
					<div class={slot.class("actions", "a-profile-actions")} style={slot.style("actions")}>
						{props.actions}
					</div>
				</Show>
			</div>
		</div>
	);
}

export type MemberRowSlot = "root" | "avatar" | "meta" | "name" | "email" | "remove";

export type MemberRowProps = SlotProps<MemberRowSlot> & {
	name: string;
	email?: string | undefined;
	/** Team role shown as a {@link RoleBadge} (not the ARIA role). */
	role?: string | undefined;
	src?: string | undefined;
	onRemove?: (() => void) | undefined;
};

/** Slots: `root` `avatar` `meta` `name` `email` `remove`. */
export function MemberRow(input: MemberRowProps) {
	const [props, rest, slot] = setup(
		"MemberRow",
		input,
		{},
		["name", "email", "role", "src", "onRemove"],
		"root" as MemberRowSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-member")} style={slot.style("root")}>
			<Avatar name={props.name} src={props.src} size="sm" class={slot.class("avatar")} />
			<div class={slot.class("meta", "a-member-meta")} style={slot.style("meta")}>
				<span class={slot.class("name", "a-member-name")}>{props.name}</span>
				<Show when={props.email}>
					<span class={slot.class("email", "a-member-email")}>{props.email}</span>
				</Show>
			</div>
			<Show when={props.role}>
				<RoleBadge role={props.role as string} />
			</Show>
			<Show when={props.onRemove}>
				<button
					type="button"
					class={slot.class("remove", "a-member-remove")}
					style={slot.style("remove")}
					aria-label={`Remove ${props.name}`}
					onClick={() => props.onRemove?.()}
				>
					<Icon name="trash" size="sm" />
				</button>
			</Show>
		</div>
	);
}

export type RoleBadgeProps = BaseProps & {
	/** Team role label (not the ARIA role). */
	role: string;
};

/** Slots: `root`. State: `data-role`. */
export function RoleBadge(input: RoleBadgeProps) {
	const [props, rest, slot] = setup("RoleBadge", input, {}, ["role"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-role-badge")}
			style={slot.style("root")}
			data-role={props.role}
		>
			{props.role}
		</span>
	);
}

export type Priority = "low" | "medium" | "high" | "urgent";

export type PriorityBadgeProps = BaseProps & {
	priority: Priority;
};

/** Slots: `root`. State: `data-priority`. */
export function PriorityBadge(input: PriorityBadgeProps) {
	const [props, rest, slot] = setup("PriorityBadge", input, {}, ["priority"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-priority", `a-priority-${props.priority}`)}
			style={slot.style("root")}
			data-priority={props.priority}
		>
			{props.priority}
		</span>
	);
}

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type SeverityBadgeProps = BaseProps & {
	severity: Severity;
};

/** Slots: `root`. State: `data-severity`. */
export function SeverityBadge(input: SeverityBadgeProps) {
	const [props, rest, slot] = setup("SeverityBadge", input, {}, ["severity"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-severity", `a-severity-${props.severity}`)}
			style={slot.style("root")}
			data-severity={props.severity}
		>
			{props.severity}
		</span>
	);
}

export type CommitChipSlot = "root" | "sha" | "message";

export type CommitChipProps = SlotProps<CommitChipSlot> & {
	sha: string;
	message?: string | undefined;
	onClick?: (() => void) | undefined;
};

/** Slots: `root` `sha` `message`. */
export function CommitChip(input: CommitChipProps) {
	const [props, rest, slot] = setup(
		"CommitChip",
		input,
		{},
		["sha", "message", "onClick"],
		"root" as CommitChipSlot,
	);
	return (
		<button
			{...rest}
			type="button"
			class={slot.class("root", "a-commit")}
			style={slot.style("root")}
			onClick={() => props.onClick?.()}
		>
			<code class={slot.class("sha", "a-commit-sha")}>{props.sha.slice(0, 7)}</code>
			<Show when={props.message}>
				<span class={slot.class("message", "a-commit-msg")}>{props.message}</span>
			</Show>
		</button>
	);
}

export type BranchBadgeProps = BaseProps & {
	name: string;
};

/** Slots: `root`. */
export function BranchBadge(input: BranchBadgeProps) {
	const [props, rest, slot] = setup("BranchBadge", input, {}, ["name"]);
	return (
		<span {...rest} class={slot.class("root", "a-branch")} style={slot.style("root")}>
			<Icon name="git" size="sm" />
			{props.name}
		</span>
	);
}

export type BuildStatusKind = "success" | "failed" | "running" | "queued" | "cancelled";

export type BuildStatusProps = BaseProps & {
	status: BuildStatusKind;
	label?: string | undefined;
};

const BUILD_ICONS: Record<BuildStatusKind, IconName> = {
	success: "check",
	failed: "x",
	running: "spinner",
	cancelled: "close",
	queued: "clock",
};

/** Slots: `root`. State: `data-status`. */
export function BuildStatus(input: BuildStatusProps) {
	const [props, rest, slot] = setup("BuildStatus", input, {}, ["status", "label"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-build", `a-build-${props.status}`)}
			style={slot.style("root")}
			data-status={props.status}
		>
			<Icon
				name={BUILD_ICONS[props.status] ?? "clock"}
				size="sm"
				class={props.status === "running" ? "a-build-spin" : undefined}
			/>
			{props.label ?? props.status}
		</span>
	);
}

export type PipelineStep = {
	id: string;
	label: string;
	status: BuildStatusKind;
};

export type PipelineSlot = "root" | "step" | "line";

export type PipelineProps = SlotProps<PipelineSlot> & {
	steps: PipelineStep[];
};

/** Slots: `root` `step` `line`. Steps expose `data-status`. */
export function Pipeline(input: PipelineProps) {
	const [props, rest, slot] = setup("Pipeline", input, {}, ["steps"], "root" as PipelineSlot);
	return (
		<ol {...rest} class={slot.class("root", "a-pipeline")} style={slot.style("root")}>
			<For each={props.steps}>
				{(step, i) => (
					<li
						class={slot.class("step", "a-pipeline-step", `a-pipeline-${step.status}`)}
						style={slot.style("step")}
						data-status={step.status}
					>
						<Show when={i() > 0}>
							<span class={slot.class("line", "a-pipeline-line")} aria-hidden="true" />
						</Show>
						<BuildStatus status={step.status} label={step.label} />
					</li>
				)}
			</For>
		</ol>
	);
}

export type SyncState = "synced" | "syncing" | "error" | "offline";

export type SyncStatusProps = BaseProps & {
	state: SyncState;
	label?: string | undefined;
};

const SYNC_ICONS: Record<SyncState, IconName> = {
	synced: "check",
	syncing: "refresh",
	offline: "warning",
	error: "error",
};

/** Slots: `root`. State: `data-state`. */
export function SyncStatus(input: SyncStatusProps) {
	const [props, rest, slot] = setup("SyncStatus", input, {}, ["state", "label"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-sync", `a-sync-${props.state}`)}
			style={slot.style("root")}
			data-state={props.state}
		>
			<Icon
				name={SYNC_ICONS[props.state] ?? "error"}
				size="sm"
				class={props.state === "syncing" ? "a-build-spin" : undefined}
			/>
			{props.label ?? props.state}
		</span>
	);
}

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export type AutosaveIndicatorProps = BaseProps & {
	state: AutosaveState;
	/** Override the text per state. */
	labels?: Partial<Record<AutosaveState, string>> | undefined;
};

const AUTOSAVE_TEXT: Record<AutosaveState, string> = {
	idle: "All changes saved",
	saving: "Saving…",
	saved: "Saved",
	error: "Save failed",
};

/** Slots: `root`. State: `data-state`. */
export function AutosaveIndicator(input: AutosaveIndicatorProps) {
	const [props, rest, slot] = setup("AutosaveIndicator", input, {}, ["state", "labels"]);
	return (
		<span
			{...rest}
			class={slot.class("root", "a-autosave", `a-autosave-${props.state}`)}
			style={slot.style("root")}
			role="status"
			data-state={props.state}
		>
			{props.labels?.[props.state] ?? AUTOSAVE_TEXT[props.state] ?? AUTOSAVE_TEXT.idle}
		</span>
	);
}

export type LastSavedProps = BaseProps & {
	at: string;
	/** Prefix text (default "Last saved"). */
	label?: string | undefined;
};

/** Slots: `root`. */
export function LastSaved(input: LastSavedProps) {
	const [props, rest, slot] = setup("LastSaved", input, {}, ["at", "label"]);
	return (
		<span {...rest} class={slot.class("root", "a-last-saved")} style={slot.style("root")}>
			{props.label ?? "Last saved"} <time>{props.at}</time>
		</span>
	);
}

export type FloatingToolbarProps = BaseProps & {
	children?: unknown;
};

/** Slots: `root`. */
export function FloatingToolbar(input: FloatingToolbarProps) {
	const [props, rest, slot] = setup("FloatingToolbar", input, {}, ["children"]);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-float-toolbar")}
			style={slot.style("root")}
			role="toolbar"
		>
			{props.children}
		</div>
	);
}

export type Density = "comfortable" | "compact";

export type DensityToggleSlot = "root" | "option";

export type DensityToggleProps = SlotProps<DensityToggleSlot> & {
	value: Density;
	onChange: (value: Density) => void;
	/** Accessible name (default "Density"). */
	label?: string | undefined;
};

const DENSITIES: Array<{ value: Density; label: string }> = [
	{ value: "comfortable", label: "Comfortable" },
	{ value: "compact", label: "Compact" },
];

/** Slots: `root` `option`. Options expose `aria-pressed` + `data-state`. */
export function DensityToggle(input: DensityToggleProps) {
	const [props, rest, slot] = setup(
		"DensityToggle",
		input,
		{},
		["value", "onChange", "label"],
		"root" as DensityToggleSlot,
	);
	return (
		// biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings UA border/padding and legend layout; this is a two-button toggle group
		<div
			aria-label={props.label ?? "Density"}
			{...rest}
			class={slot.class("root", "a-density")}
			style={slot.style("root")}
			role="group"
		>
			<For each={DENSITIES}>
				{(option) => {
					const active = () => props.value === option.value;
					return (
						<button
							type="button"
							class={slot.class("option", "a-density-btn", active() && "a-density-btn-active")}
							style={slot.style("option")}
							aria-pressed={active()}
							data-state={active() ? "active" : "inactive"}
							onClick={() => props.onChange(option.value)}
						>
							{option.label}
						</button>
					);
				}}
			</For>
		</div>
	);
}

export type NoResultsSlot = "root" | "icon" | "title";

export type NoResultsProps = SlotProps<NoResultsSlot> & {
	query?: string | undefined;
	/** Override the title text. */
	title?: string | undefined;
	children?: unknown;
};

/** Slots: `root` `icon` `title`. */
export function NoResults(input: NoResultsProps) {
	const [props, rest, slot] = setup(
		"NoResults",
		input,
		{},
		["query", "title", "children"],
		"root" as NoResultsSlot,
	);
	const title = () =>
		props.title ?? (props.query ? `No results for “${props.query}”` : "No results");
	return (
		<div
			{...rest}
			class={slot.class("root", "a-no-results")}
			style={slot.style("root")}
			role="status"
		>
			<span class={slot.class("icon")} aria-hidden="true">
				<Icon name="search" size="lg" />
			</span>
			<p class={slot.class("title", "a-no-results-title")}>{title()}</p>
			{props.children}
		</div>
	);
}

export type ErrorStateSlot = "root" | "icon" | "title" | "description" | "action";

export type ErrorStateProps = SlotProps<ErrorStateSlot> & {
	title?: string | undefined;
	description?: string | undefined;
	action?: unknown;
};

/** Slots: `root` `icon` `title` `description` `action`. */
export function ErrorState(input: ErrorStateProps) {
	const [props, rest, slot] = setup(
		"ErrorState",
		input,
		{},
		["title", "description", "action"],
		"root" as ErrorStateSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-error-state")}
			style={slot.style("root")}
			role="alert"
		>
			<span class={slot.class("icon")} aria-hidden="true">
				<Icon name="error" size="lg" />
			</span>
			<p class={slot.class("title", "a-error-state-title")}>
				{props.title ?? "Something went wrong"}
			</p>
			<Show when={props.description}>
				<p class={slot.class("description", "a-error-state-desc")}>{props.description}</p>
			</Show>
			<Show when={props.action}>
				<div class={slot.class("action", "a-error-state-action")}>{props.action}</div>
			</Show>
		</div>
	);
}

export type CreditCardPreviewSlot = "root" | "top" | "brand" | "number" | "bottom";

export type CreditCardPreviewProps = SlotProps<CreditCardPreviewSlot> & {
	brand?: string | undefined;
	last4: string;
	exp?: string | undefined;
	name?: string | undefined;
};

/** Slots: `root` `top` `brand` `number` `bottom`. State: `data-brand`. */
export function CreditCardPreview(input: CreditCardPreviewProps) {
	const [props, rest, slot] = setup(
		"CreditCardPreview",
		input,
		{},
		["brand", "last4", "exp", "name"],
		"root" as CreditCardPreviewSlot,
	);
	return (
		<div
			{...rest}
			class={slot.class("root", "a-cc")}
			style={slot.style("root")}
			data-brand={props.brand?.toLowerCase()}
		>
			<div class={slot.class("top", "a-cc-top")}>
				<span class={slot.class("brand", "a-cc-brand")}>{props.brand ?? "Card"}</span>
				<Icon name="lock" size="sm" />
			</div>
			<p class={slot.class("number", "a-cc-number")}>•••• •••• •••• {props.last4}</p>
			<div class={slot.class("bottom", "a-cc-bottom")}>
				<span>{props.name ?? "Cardholder"}</span>
				<Show when={props.exp}>
					<span>{props.exp}</span>
				</Show>
			</div>
		</div>
	);
}

export type InvoiceStatus = "paid" | "open" | "void" | "past_due";

export type InvoiceRowSlot = "root" | "number" | "date" | "status" | "amount";

export type InvoiceRowProps = SlotProps<InvoiceRowSlot> & {
	/** Invoice number shown in the row. Also forwarded as the element `id`. */
	id: string;
	date: string;
	amount: string;
	status: InvoiceStatus;
	onClick?: (() => void) | undefined;
};

/** Slots: `root` `number` `date` `status` `amount`. State: `data-status`. */
export function InvoiceRow(input: InvoiceRowProps) {
	const [props, rest, slot] = setup(
		"InvoiceRow",
		input,
		{},
		["id", "date", "amount", "status", "onClick"],
		"root" as InvoiceRowSlot,
	);
	return (
		<button
			{...rest}
			id={props.id}
			type="button"
			class={slot.class("root", "a-invoice")}
			style={slot.style("root")}
			data-status={props.status}
			onClick={() => props.onClick?.()}
		>
			<span class={slot.class("number", "a-invoice-id")}>{props.id}</span>
			<span class={slot.class("date", "a-invoice-date")}>{props.date}</span>
			<span class={slot.class("status", "a-invoice-status", `a-invoice-${props.status}`)}>
				{props.status}
			</span>
			<strong class={slot.class("amount", "a-invoice-amount")}>{props.amount}</strong>
		</button>
	);
}

export type StorageBarProps = SlotProps<"root"> & {
	usedGb: number;
	totalGb: number;
	/** Label text (default "Storage"). */
	label?: string | undefined;
};

/** {@link UsageMeter} preset in GB. Slots: `root` (inner parts via `UsageMeter` theme). */
export function StorageBar(input: StorageBarProps) {
	const [props, rest, slot] = setup("StorageBar", input, {}, ["usedGb", "totalGb", "label"]);
	return (
		<UsageMeter
			{...rest}
			label={props.label ?? "Storage"}
			used={props.usedGb}
			limit={props.totalGb}
			unit="GB"
			unstyled={props.unstyled}
			class={slot.class("root", "a-storage")}
			style={slot.style("root")}
		/>
	);
}

export type FileTreeNode = {
	id: string;
	name: string;
	kind: "file" | "folder";
	children?: FileTreeNode[] | undefined;
};

export type FileTreeProps = BaseProps & {
	nodes: FileTreeNode[];
	selected?: string | undefined;
	onSelect?: ((id: string) => void) | undefined;
	/** Accessible name for the tree. */
	label?: string | undefined;
};

function FileTreeItem(props: {
	node: FileTreeNode;
	depth: number;
	selected?: string | undefined;
	onSelect?: ((id: string) => void) | undefined;
}) {
	const open = signal(true);
	const isFolder = () => props.node.kind === "folder";
	const active = () => props.selected === props.node.id;
	return (
		<div class="a-ftree-item" role="none">
			<button
				type="button"
				role="treeitem"
				class={cx("a-ftree-row", active() && "a-ftree-row-active")}
				style={{ "padding-left": `${0.35 + props.depth * INDENT_REM}rem` }}
				aria-selected={active()}
				aria-expanded={isFolder() ? open() : undefined}
				data-kind={props.node.kind}
				onClick={() => {
					if (isFolder()) open.set(!open());
					props.onSelect?.(props.node.id);
				}}
			>
				{isFolder() ? (
					<Icon name={open() ? "chevron-down" : "chevron-right"} size="sm" />
				) : (
					<span class="a-ftree-spacer" />
				)}
				<Icon name={isFolder() ? "folder" : "file"} size="sm" />
				<span class="a-ftree-name">{props.node.name}</span>
			</button>
			<Show when={isFolder() && open() && props.node.children}>
				<For each={props.node.children ?? []}>
					{(child) => (
						<FileTreeItem
							node={child}
							depth={props.depth + 1}
							selected={props.selected}
							onSelect={props.onSelect}
						/>
					)}
				</For>
			</Show>
		</div>
	);
}

/** File / folder tree. Rows expose `data-kind`. Slots: `root`. */
export function FileTree(input: FileTreeProps) {
	const [props, rest, slot] = setup("FileTree", input, {}, [
		"nodes",
		"selected",
		"onSelect",
		"label",
	]);
	return (
		<div
			aria-label={props.label ?? "Files"}
			{...rest}
			class={slot.class("root", "a-ftree")}
			style={slot.style("root")}
			role="tree"
		>
			<For each={props.nodes}>
				{(node) => (
					<FileTreeItem node={node} depth={0} selected={props.selected} onSelect={props.onSelect} />
				)}
			</For>
		</div>
	);
}

export type GaugeSlot = "root" | "svg" | "track" | "bar" | "label";

export type GaugeProps = SlotProps<GaugeSlot> & {
	value: number;
	max?: number | undefined;
	label?: string | undefined;
	size?: number | undefined;
};

const GAUGE_R = 36;
const GAUGE_C = 2 * Math.PI * GAUGE_R;
const GAUGE_DASH = GAUGE_C * 0.75;
const GAUGE_ARC = "M14 64 A36 36 0 1 1 86 64";

/** Slots: `root` `svg` `track` `bar` `label`. Size via `size` or CSS `width`/`height`. */
export function Gauge(input: GaugeProps) {
	const [props, rest, slot] = setup(
		"Gauge",
		input,
		{ max: 100, size: 96 },
		["value", "max", "label", "size"],
		"root" as GaugeSlot,
	);
	const pct = () => fraction(props.value, props.max ?? 100);
	const size = () => props.size ?? 96;
	const offset = () => GAUGE_DASH * (1 - pct());
	return (
		// biome-ignore lint/a11y/useSemanticElements: <meter> cannot host the SVG ring visual
		<div
			aria-label={props.label ?? "Gauge"}
			{...rest}
			class={slot.class("root", "a-gauge")}
			style={slot.style("root", { width: `${size()}px`, height: `${size()}px` })}
			role="meter"
			aria-valuenow={Math.round(pct() * 100)}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<svg viewBox="0 0 100 80" class={slot.class("svg", "a-gauge-svg")} aria-hidden="true">
				<path
					class={slot.class("track", "a-gauge-track")}
					d={GAUGE_ARC}
					fill="none"
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray={`${GAUGE_DASH} ${GAUGE_C}`}
				/>
				<path
					class={slot.class("bar", "a-gauge-bar")}
					d={GAUGE_ARC}
					fill="none"
					stroke-width="8"
					stroke-linecap="round"
					stroke-dasharray={`${GAUGE_DASH} ${GAUGE_C}`}
					stroke-dashoffset={offset()}
				/>
			</svg>
			<div class={slot.class("label", "a-gauge-label")}>
				<strong>{Math.round(pct() * 100)}%</strong>
				<Show when={props.label}>
					<span>{props.label}</span>
				</Show>
			</div>
		</div>
	);
}

export type InviteCardSlot = "root" | "meta" | "email" | "actions";

export type InviteCardProps = SlotProps<InviteCardSlot> & {
	email: string;
	/** Team role shown as a {@link RoleBadge} (not the ARIA role). */
	role?: string | undefined;
	onResend?: (() => void) | undefined;
	onRevoke?: (() => void) | undefined;
	resendLabel?: string | undefined;
	revokeLabel?: string | undefined;
};

/** Slots: `root` `meta` `email` `actions`. */
export function InviteCard(input: InviteCardProps) {
	const [props, rest, slot] = setup(
		"InviteCard",
		input,
		{},
		["email", "role", "onResend", "onRevoke", "resendLabel", "revokeLabel"],
		"root" as InviteCardSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-invite")} style={slot.style("root")}>
			<div class={slot.class("meta", "a-invite-meta")}>
				<span class={slot.class("email", "a-invite-email")}>{props.email}</span>
				<Show when={props.role}>
					<RoleBadge role={props.role as string} />
				</Show>
			</div>
			<div class={slot.class("actions", "a-invite-actions")}>
				<Show when={props.onResend}>
					<Button size="sm" variant="ghost" onClick={() => props.onResend?.()}>
						{props.resendLabel ?? "Resend"}
					</Button>
				</Show>
				<Show when={props.onRevoke}>
					<Button size="sm" variant="danger" onClick={() => props.onRevoke?.()}>
						{props.revokeLabel ?? "Revoke"}
					</Button>
				</Show>
			</div>
		</div>
	);
}
