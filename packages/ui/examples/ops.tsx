import { Button } from "../src/button.tsx";
import { FileInput, InputAddon, InputGroup, Skeleton, Tag, Tags } from "../src/extras.tsx";
import { TextInput } from "../src/input.tsx";
import {
	AngleSlider,
	BackLink,
	Bleed,
	Checklist,
	CookieConsent,
	CopyField,
	DotPagination,
	FeatureList,
	FileCard,
	Heatmap,
	Hotkey,
	InlineEdit,
	Inset,
	KanbanBoard,
	KanbanCard,
	KanbanColumn,
	NextPrev,
	OfflineNotice,
	PricingCard,
	Prose,
	StatGroup,
	SteppedProgress,
	VideoFrame,
} from "../src/kit-more.tsx";
import {
	AutosaveIndicator,
	BranchBadge,
	BuildStatus,
	Callout,
	ChangelogItem,
	CommitChip,
	CreditCardPreview,
	DensityToggle,
	EndpointRow,
	ErrorState,
	FileTree,
	type FileTreeNode,
	FloatingToolbar,
	Gauge,
	HttpMethodBadge,
	InviteCard,
	InvoiceRow,
	type JsonNode,
	JsonTree,
	LastSaved,
	LogViewer,
	MemberRow,
	NoResults,
	Pipeline,
	PriorityBadge,
	ProfileHeader,
	RoleBadge,
	ServiceStatus,
	SeverityBadge,
	StorageBar,
	SyncStatus,
	UpgradeBanner,
	UptimeBar,
	UsageMeter,
	VersionTag,
} from "../src/kit-ops.tsx";
import { Text } from "../src/layout.tsx";
import { CopyButton, DescriptionList, Stat } from "../src/meta.tsx";
import { Group } from "../src/widgets.tsx";
import type { Example } from "./types.ts";

const noop = () => {};

const configJson: JsonNode = {
	kind: "object",
	entries: [
		{ key: "name", value: { kind: "primitive", value: "arachne" } },
		{ key: "private", value: { kind: "primitive", value: true } },
		{
			key: "workspaces",
			value: {
				kind: "array",
				items: [
					{ kind: "primitive", value: "packages/*" },
					{ kind: "primitive", value: "apps/*" },
				],
			},
		},
	],
};

const repoTree: FileTreeNode[] = [
	{
		id: "src",
		name: "src",
		kind: "folder",
		children: [
			{ id: "src/index.ts", name: "index.ts", kind: "file" },
			{ id: "src/button.tsx", name: "button.tsx", kind: "file" },
		],
	},
	{ id: "package.json", name: "package.json", kind: "file" },
];

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	// kit-ops
	{
		name: "Callout",
		render: (p) => (
			<Callout {...p} tone="warning" title="Breaking change">
				<code>size</code> no longer sets the heading level — use <code>order</code>.
			</Callout>
		),
	},
	{
		name: "ChangelogItem",
		render: (p) => (
			<ChangelogItem {...p} version="2.4.0" date="Sep 12, 2026">
				Tables gain sticky headers and keyboard row selection.
			</ChangelogItem>
		),
	},
	{ name: "VersionTag", render: (p) => <VersionTag {...p} version="2.4.0" /> },
	{ name: "HttpMethodBadge", render: (p) => <HttpMethodBadge {...p} method="DELETE" /> },
	{
		name: "EndpointRow",
		render: (p) => (
			<EndpointRow {...p} method="POST" path="/v1/projects/{id}/deploys" summary="Start a deploy" />
		),
	},
	{ name: "JsonTree", render: (p) => <JsonTree {...p} data={configJson} /> },
	{
		name: "LogViewer",
		render: (p) => (
			<LogViewer
				{...p}
				lines={[
					{ time: "12:04:01", level: "info", message: "Listening on :3000" },
					{ time: "12:04:07", level: "warn", message: "Slow query (812 ms): SELECT * FROM runs" },
					{ time: "12:04:09", level: "error", message: "ECONNRESET redis://cache:6379" },
				]}
			/>
		),
	},
	{
		name: "ServiceStatus",
		render: (p) => <ServiceStatus {...p} name="Build workers" status="degraded" />,
	},
	{
		name: "UptimeBar",
		render: (p) => (
			<UptimeBar
				{...p}
				label="API — last 14 days"
				days={[1, 1, 1, 0.998, 1, 1, 0.97, 1, 1, 1, 0.9, 1, 1, 1]}
			/>
		),
	},
	{
		name: "UsageMeter",
		render: (p) => <UsageMeter {...p} label="Build minutes" used={1840} limit={2000} unit="min" />,
	},
	{
		name: "UpgradeBanner",
		render: (p) => (
			<UpgradeBanner
				{...p}
				title="You're at 92% of your build minutes"
				action={<Button>Upgrade</Button>}
			>
				Pro includes 10,000 minutes and concurrent builds.
			</UpgradeBanner>
		),
	},
	{
		name: "ProfileHeader",
		render: (p) => (
			<ProfileHeader
				{...p}
				name="Ada Lovelace"
				handle="@ada"
				bio="Analyst of engines. Writes the first programs."
				actions={<Button variant="outline">Follow</Button>}
			/>
		),
	},
	{
		name: "MemberRow",
		render: (p) => <MemberRow {...p} name="Grace Hopper" email="grace@navy.mil" onRemove={noop} />,
	},
	// biome-ignore lint/a11y/useValidAriaRole: RoleBadge `role` is the member role label, not an ARIA role
	{ name: "RoleBadge", render: (p) => <RoleBadge {...p} role="Admin" /> },
	{ name: "PriorityBadge", render: (p) => <PriorityBadge {...p} priority="urgent" /> },
	{ name: "SeverityBadge", render: (p) => <SeverityBadge {...p} severity="critical" /> },
	{ name: "CommitChip", render: (p) => <CommitChip {...p} sha="3f9c2e7a41d0b8" /> },
	{ name: "BranchBadge", render: (p) => <BranchBadge {...p} name="feat/ui-kit" /> },
	{ name: "BuildStatus", render: (p) => <BuildStatus {...p} status="running" /> },
	{
		name: "Pipeline",
		render: (p) => (
			<Pipeline
				{...p}
				steps={[
					{ id: "install", label: "Install", status: "success" },
					{ id: "test", label: "Test", status: "success" },
					{ id: "build", label: "Build", status: "running" },
					{ id: "deploy", label: "Deploy", status: "queued" },
				]}
			/>
		),
	},
	{ name: "SyncStatus", render: (p) => <SyncStatus {...p} state="syncing" /> },
	{ name: "AutosaveIndicator", render: (p) => <AutosaveIndicator {...p} state="saved" /> },
	{ name: "LastSaved", render: (p) => <LastSaved {...p} at="2 minutes ago" /> },
	{
		name: "FloatingToolbar",
		render: (p) => (
			<FloatingToolbar {...p} label="Text formatting">
				<Button size="sm" variant="ghost">
					Bold
				</Button>
				<Button size="sm" variant="ghost">
					Italic
				</Button>
				<Button size="sm" variant="ghost">
					Link
				</Button>
			</FloatingToolbar>
		),
	},
	{
		name: "DensityToggle",
		render: (p) => <DensityToggle {...p} value="compact" onChange={noop} />,
	},
	{
		name: "NoResults",
		render: (p) => (
			<NoResults {...p} query="kubernetes">
				Try a shorter query or clear the filters.
			</NoResults>
		),
	},
	{
		name: "ErrorState",
		render: (p) => (
			<ErrorState
				{...p}
				description="We couldn't load your deploys. Check your connection and try again."
				action={<Button variant="outline">Retry</Button>}
			/>
		),
	},
	{
		name: "CreditCardPreview",
		render: (p) => (
			<CreditCardPreview {...p} brand="Visa" last4="4242" exp="08/29" name="Ada Lovelace" />
		),
	},
	{
		name: "InvoiceRow",
		render: (p) => (
			<InvoiceRow id="INV-2026-014" {...p} date="Sep 1, 2026" amount="$49.00" status="paid" />
		),
	},
	{
		name: "StorageBar",
		render: (p) => <StorageBar {...p} label="Storage" usedGb={38.2} totalGb={50} />,
	},
	{
		name: "FileTree",
		render: (p) => (
			<FileTree {...p} label="Repository" nodes={repoTree} selected="src/button.tsx" />
		),
	},
	{ name: "Gauge", render: (p) => <Gauge {...p} label="CPU" value={72} /> },
	{
		name: "InviteCard",
		render: (p) => <InviteCard {...p} email="linus@example.com" onResend={noop} onRevoke={noop} />,
	},
	// kit-more
	{
		name: "CookieConsent",
		render: (p) => (
			<CookieConsent
				{...p}
				open
				message="We use cookies to keep you signed in and to measure usage."
				onAccept={noop}
				onDecline={noop}
			/>
		),
	},
	{ name: "OfflineNotice", render: (p) => <OfflineNotice {...p} offline /> },
	{ name: "Hotkey", render: (p) => <Hotkey {...p} keys={["⌘", "K"]} /> },
	{
		name: "InlineEdit",
		render: (p) => (
			<InlineEdit {...p} label="Project name" value="Marketing site" onChange={noop} />
		),
	},
	{
		name: "CopyField",
		render: (p) => <CopyField {...p} label="API key" value="sk_live_51Hx…9fQ2" />,
	},
	{
		name: "Checklist",
		render: (p) => (
			<Checklist
				{...p}
				items={[
					{ id: "domain", label: "Connect a domain", done: true },
					{ id: "invite", label: "Invite your team", done: true },
					{ id: "deploy", label: "Ship your first deploy" },
				]}
				onChange={noop}
			/>
		),
	},
	{
		name: "FeatureList",
		render: (p) => (
			<FeatureList {...p} items={["Unlimited projects", "Preview deploys", "SSO & audit log"]} />
		),
	},
	{
		name: "PricingCard",
		render: (p) => (
			<PricingCard
				{...p}
				name="Pro"
				price="$20"
				period="per seat / month"
				description="For growing teams."
				features={["Unlimited projects", "10,000 build minutes", "Email support"]}
				highlighted
				action={<Button>Start trial</Button>}
			/>
		),
	},
	{
		name: "StatGroup",
		render: (p) => (
			<StatGroup {...p}>
				<Stat label="Deploys" value={128} hint="this week" />
				<Stat label="Success rate" value="99.2%" />
				<Stat label="Median build" value="1m 42s" />
			</StatGroup>
		),
	},
	{
		name: "DotPagination",
		render: (p) => <DotPagination {...p} count={5} value={1} onChange={noop} />,
	},
	{
		name: "BackLink",
		render: (p) => (
			<BackLink {...p} href="#projects">
				All projects
			</BackLink>
		),
	},
	{
		name: "NextPrev",
		render: (p) => (
			<NextPrev {...p} prevLabel="Installation" nextLabel="Theming" onPrev={noop} onNext={noop} />
		),
	},
	{
		name: "FileCard",
		render: (p) => <FileCard {...p} name="Q3-report.pdf" meta="2.4 MB · PDF" onRemove={noop} />,
	},
	{
		name: "VideoFrame",
		render: (p) => <VideoFrame {...p} title="Product tour" src="about:blank" ratio={16 / 9} />,
	},
	{
		name: "SteppedProgress",
		render: (p) => <SteppedProgress {...p} label="Onboarding" steps={4} value={2} />,
	},
	{
		name: "Heatmap",
		render: (p) => (
			<Heatmap
				{...p}
				label="Commits per day"
				columns={14}
				values={[
					0, 2, 5, 1, 0, 3, 8, 4, 2, 0, 6, 9, 3, 1, 1, 4, 7, 2, 0, 0, 5, 3, 6, 8, 2, 1, 0, 4,
				]}
			/>
		),
	},
	{ name: "AngleSlider", render: (p) => <AngleSlider {...p} value={135} onChange={noop} /> },
	{
		name: "Prose",
		render: (p) => (
			<Prose {...p}>
				<h3>Release notes</h3>
				<p>
					This release focuses on <a href="#a11y">accessibility</a>: every overlay now traps focus
					and restores it on close.
				</p>
				<ul>
					<li>Keyboard support for menus and trees</li>
					<li>Reduced-motion aware transitions</li>
				</ul>
			</Prose>
		),
	},
	{
		name: "Bleed",
		render: (p) => (
			<Bleed {...p} x="1rem">
				<Text>Full-width strip that ignores its container's padding.</Text>
			</Bleed>
		),
	},
	{
		name: "Inset",
		render: (p) => (
			<Inset {...p}>
				<Text muted>Recessed area for secondary content, like a settings preview.</Text>
			</Inset>
		),
	},
	{
		name: "KanbanColumn",
		render: (p) => (
			<KanbanBoard label="Review board">
				<KanbanColumn {...p} title="In review" columnId="review" count={1}>
					<KanbanCard cardId="c-7" title="Dark theme for charts" meta="#412 · Ada" />
				</KanbanColumn>
			</KanbanBoard>
		),
	},
	{
		name: "KanbanCard",
		render: (p) => (
			<KanbanBoard label="Backlog board">
				<KanbanColumn title="Backlog" columnId="backlog">
					<KanbanCard {...p} cardId="c-9" title="Audit form labels" meta="#418 · Grace" />
				</KanbanColumn>
			</KanbanBoard>
		),
	},
	{
		name: "KanbanBoard",
		render: (p) => (
			<KanbanBoard {...p} label="Sprint 14" onMove={noop}>
				<KanbanColumn title="Todo" columnId="todo" count={2}>
					<KanbanCard cardId="c-1" title="Audit form labels" meta="#418" />
					<KanbanCard cardId="c-2" title="Toast pause on hover" meta="#421" />
				</KanbanColumn>
				<KanbanColumn title="In progress" columnId="doing" count={1}>
					<KanbanCard cardId="c-3" title="Kanban keyboard moves" meta="#402" />
				</KanbanColumn>
				<KanbanColumn title="Done" columnId="done" count={1}>
					<KanbanCard cardId="c-4" title="Dark theme tokens" meta="#389" />
				</KanbanColumn>
			</KanbanBoard>
		),
	},
	// extras
	{
		name: "Tag",
		render: (p) => (
			<Tag {...p} color="success">
				Deployed
			</Tag>
		),
	},
	{
		name: "Tags",
		render: (p) => (
			<Tags {...p}>
				<Tag>typescript</Tag>
				<Tag>ssr</Tag>
				<Tag color="info">signals</Tag>
			</Tags>
		),
	},
	{ name: "Skeleton", render: (p) => <Skeleton {...p} width="16rem" height="1.25rem" /> },
	{ name: "FileInput", render: (p) => <FileInput aria-label="Attachment" {...p} /> },
	{
		name: "InputGroup",
		render: (p) => (
			<InputGroup {...p}>
				<InputAddon>https://</InputAddon>
				<TextInput aria-label="Subdomain" value="acme" />
				<InputAddon>.arachne.app</InputAddon>
			</InputGroup>
		),
	},
	{
		name: "InputAddon",
		render: (p) => (
			<InputGroup>
				<InputAddon {...p}>$</InputAddon>
				<TextInput aria-label="Amount" value="49.00" />
			</InputGroup>
		),
	},
	// meta
	{
		name: "DescriptionList",
		render: (p) => (
			<DescriptionList
				{...p}
				items={[
					{ label: "Region", value: "eu-central-1" },
					{ label: "Runtime", value: "Bun 1.3" },
					{ label: "Created", value: "Sep 3, 2026" },
				]}
			/>
		),
	},
	{
		name: "Stat",
		render: (p) => <Stat {...p} label="Active users" value="12,480" hint="+8% this week" />,
	},
	{
		name: "CopyButton",
		render: (p) => (
			<Group gap="0.5rem">
				<code>bun add @arachne/ui</code>
				<CopyButton {...p} value="bun add @arachne/ui" />
			</Group>
		),
	},
];
