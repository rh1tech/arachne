import { FileInput, InputAddon, InputGroup, Skeleton, Tag, Tags } from "../extras.tsx";
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
} from "../kit-more.tsx";
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
	FloatingToolbar,
	Gauge,
	HttpMethodBadge,
	InviteCard,
	InvoiceRow,
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
} from "../kit-ops.tsx";
import { CopyButton, DescriptionList, Stat } from "../meta.tsx";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const noop = () => {};

/** Register every exported component of this group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	// kit-ops
	{
		name: "Callout",
		render: (p) => (
			<Callout {...p} title="T">
				Body
			</Callout>
		),
	},
	{ name: "ChangelogItem", render: (p) => <ChangelogItem {...p} version="1.0.0" /> },
	{ name: "VersionTag", render: (p) => <VersionTag {...p} version="1.0.0" /> },
	{ name: "HttpMethodBadge", render: (p) => <HttpMethodBadge {...p} method="GET" /> },
	{ name: "EndpointRow", render: (p) => <EndpointRow {...p} method="POST" path="/x" /> },
	{
		name: "JsonTree",
		render: (p) => <JsonTree {...p} data={{ kind: "primitive", value: 1 }} />,
	},
	{
		name: "LogViewer",
		render: (p) => <LogViewer {...p} lines={[{ level: "info", message: "hi" }]} />,
	},
	{
		name: "ServiceStatus",
		render: (p) => <ServiceStatus {...p} name="API" status="operational" />,
	},
	{ name: "UptimeBar", render: (p) => <UptimeBar {...p} days={[1, 0.9]} /> },
	{ name: "UsageMeter", render: (p) => <UsageMeter {...p} label="Seats" used={3} limit={5} /> },
	{
		name: "UpgradeBanner",
		render: (p) => (
			<UpgradeBanner {...p} title="Pro">
				Upgrade
			</UpgradeBanner>
		),
	},
	{ name: "ProfileHeader", render: (p) => <ProfileHeader {...p} name="Ada Lovelace" /> },
	{ name: "MemberRow", render: (p) => <MemberRow {...p} name="Ada" /> },
	// biome-ignore lint/a11y/useValidAriaRole: RoleBadge `role` is the member role label, not an ARIA role
	{ name: "RoleBadge", render: (p) => <RoleBadge {...p} role="Admin" /> },
	{ name: "PriorityBadge", render: (p) => <PriorityBadge {...p} priority="high" /> },
	{ name: "SeverityBadge", render: (p) => <SeverityBadge {...p} severity="low" /> },
	{ name: "CommitChip", render: (p) => <CommitChip {...p} sha="abcdef1234" /> },
	{ name: "BranchBadge", render: (p) => <BranchBadge {...p} name="main" /> },
	{ name: "BuildStatus", render: (p) => <BuildStatus {...p} status="success" /> },
	{
		name: "Pipeline",
		render: (p) => <Pipeline {...p} steps={[{ id: "a", label: "Build", status: "running" }]} />,
	},
	{ name: "SyncStatus", render: (p) => <SyncStatus {...p} state="synced" /> },
	{ name: "AutosaveIndicator", render: (p) => <AutosaveIndicator {...p} state="saved" /> },
	{ name: "LastSaved", render: (p) => <LastSaved {...p} at="now" /> },
	{ name: "FloatingToolbar", render: (p) => <FloatingToolbar {...p}>x</FloatingToolbar> },
	{
		name: "DensityToggle",
		render: (p) => <DensityToggle {...p} value="compact" onChange={noop} />,
	},
	{ name: "NoResults", render: (p) => <NoResults {...p} query="x" /> },
	{ name: "ErrorState", render: (p) => <ErrorState {...p} /> },
	{ name: "CreditCardPreview", render: (p) => <CreditCardPreview {...p} last4="4242" /> },
	{
		name: "InvoiceRow",
		render: (p) => <InvoiceRow {...p} date="today" amount="$1" status="paid" />,
	},
	{ name: "StorageBar", render: (p) => <StorageBar {...p} usedGb={1} totalGb={2} /> },
	{
		name: "FileTree",
		render: (p) => <FileTree {...p} nodes={[{ id: "a", name: "a.ts", kind: "file" }]} />,
	},
	{ name: "Gauge", render: (p) => <Gauge {...p} value={40} /> },
	{ name: "InviteCard", render: (p) => <InviteCard {...p} email="a@b.c" /> },
	// kit-more
	{ name: "CookieConsent", render: (p) => <CookieConsent {...p} open onAccept={noop} /> },
	{ name: "OfflineNotice", render: (p) => <OfflineNotice {...p} offline /> },
	{ name: "Hotkey", render: (p) => <Hotkey {...p} keys={["⌘", "K"]} /> },
	{ name: "InlineEdit", render: (p) => <InlineEdit {...p} value="x" onChange={noop} /> },
	{ name: "CopyField", render: (p) => <CopyField {...p} value="x" /> },
	{
		name: "Checklist",
		render: (p) => <Checklist {...p} items={[{ id: "a", label: "A" }]} onChange={noop} />,
	},
	{ name: "FeatureList", render: (p) => <FeatureList {...p} items={["a"]} /> },
	{ name: "PricingCard", render: (p) => <PricingCard {...p} name="Pro" price="$9" /> },
	{ name: "StatGroup", render: (p) => <StatGroup {...p}>x</StatGroup> },
	{
		name: "DotPagination",
		render: (p) => <DotPagination {...p} count={3} value={0} onChange={noop} />,
	},
	{ name: "BackLink", render: (p) => <BackLink {...p} /> },
	{ name: "NextPrev", render: (p) => <NextPrev {...p} onNext={noop} /> },
	{ name: "FileCard", render: (p) => <FileCard {...p} name="a.pdf" /> },
	{ name: "VideoFrame", render: (p) => <VideoFrame {...p} src="about:blank" /> },
	{ name: "SteppedProgress", render: (p) => <SteppedProgress {...p} steps={3} value={1} /> },
	{ name: "Heatmap", render: (p) => <Heatmap {...p} values={[1, 2, 3]} /> },
	{ name: "AngleSlider", render: (p) => <AngleSlider {...p} value={90} onChange={noop} /> },
	{ name: "Prose", render: (p) => <Prose {...p}>x</Prose> },
	{ name: "Bleed", render: (p) => <Bleed {...p}>x</Bleed> },
	{ name: "Inset", render: (p) => <Inset {...p}>x</Inset> },
	{ name: "KanbanColumn", render: (p) => <KanbanColumn {...p} title="Todo" /> },
	{ name: "KanbanCard", render: (p) => <KanbanCard {...p} title="Task" /> },
	{ name: "KanbanBoard", render: (p) => <KanbanBoard {...p}>x</KanbanBoard> },
	// extras
	{ name: "Tag", render: (p) => <Tag {...p}>x</Tag> },
	{ name: "Tags", render: (p) => <Tags {...p}>x</Tags> },
	{ name: "Skeleton", render: (p) => <Skeleton {...p} /> },
	{ name: "FileInput", render: (p) => <FileInput {...p} /> },
	{ name: "InputGroup", render: (p) => <InputGroup {...p}>x</InputGroup> },
	{ name: "InputAddon", render: (p) => <InputAddon {...p}>x</InputAddon> },
	// meta
	{
		name: "DescriptionList",
		render: (p) => <DescriptionList {...p} items={[{ label: "A", value: "1" }]} />,
	},
	{ name: "Stat", render: (p) => <Stat {...p} label="Users" value={3} /> },
	{ name: "CopyButton", render: (p) => <CopyButton {...p} value="x" /> },
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
