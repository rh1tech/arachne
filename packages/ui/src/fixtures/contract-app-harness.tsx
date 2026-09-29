import {
	Alert,
	AnnouncementBar,
	Avatar,
	BrowserFrame,
	BulkBar,
	CartLine,
	CloseButton,
	Code,
	CommandBar,
	ConfirmButton,
	CopyId,
	DangerZone,
	Details,
	Diff,
	Divider,
	DonutChart,
	EmptyState,
	EnvBadge,
	FeatureCompare,
	FilterChip,
	FormFooter,
	GalleryGrid,
	Heading,
	Icon,
	IconBadge,
	InboxItem,
	InfiniteScroll,
	Kbd,
	LiveBadge,
	LoadingButton,
	LocaleSwitcher,
	LogoCloud,
	Mention,
	Metric,
	OrderSummary,
	OrgSwitcher,
	PhoneFrame,
	PresenceAvatar,
	Price,
	ProductCard,
	PropertyList,
	QuantityInput,
	ReactionBar,
	Reel,
	ResultCount,
	ReviewCard,
	SecretField,
	SettingsRow,
	ShareButton,
	SiteFooter,
	SkeletonCard,
	SkeletonText,
	SocialLinks,
	SparkBar,
	StatCard,
	StickyBar,
	TableOfContents,
	Terminal,
	Testimonial,
	ToggleRow,
	Trend,
	Truncate,
	UnreadBadge,
	UploadItem,
	ViewToggle,
	WizardNav,
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const noop = () => {};

/** Register every exported component of this group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	// feedback.tsx
	{
		name: "Alert",
		render: (p) => (
			<Alert {...p} title="T">
				Body
			</Alert>
		),
	},
	{ name: "Divider", render: (p) => <Divider {...p} /> },
	{ name: "Heading", render: (p) => <Heading {...p}>Title</Heading> },
	// presence.tsx
	{ name: "Avatar", render: (p) => <Avatar {...p} name="Ada Lovelace" /> },
	{ name: "EmptyState", render: (p) => <EmptyState {...p} title="Nothing" /> },
	{ name: "Kbd", render: (p) => <Kbd {...p}>K</Kbd> },
	{ name: "Code", render: (p) => <Code {...p}>x</Code> },
	// icons.tsx
	{ name: "Icon", render: (p) => <Icon {...p} name="check" /> },
	{ name: "IconBadge", render: (p) => <IconBadge {...p} name="check" /> },
	{ name: "CloseButton", render: (p) => <CloseButton {...p} /> },
	// kit-app.tsx
	{ name: "AnnouncementBar", render: (p) => <AnnouncementBar {...p}>News</AnnouncementBar> },
	{ name: "CommandBar", render: (p) => <CommandBar {...p}>x</CommandBar> },
	{
		name: "TableOfContents",
		render: (p) => <TableOfContents {...p} items={[{ id: "a", label: "A" }]} />,
	},
	{
		name: "PropertyList",
		render: (p) => <PropertyList {...p} items={[{ label: "A", value: 1 }]} />,
	},
	{ name: "StatCard", render: (p) => <StatCard {...p} label="MRR" value="$1k" trend={3} /> },
	{ name: "QuantityInput", render: (p) => <QuantityInput {...p} value={2} onChange={noop} /> },
	{ name: "Price", render: (p) => <Price {...p} amount={9} /> },
	{ name: "ProductCard", render: (p) => <ProductCard {...p} title="Mug" price={9} /> },
	{ name: "CartLine", render: (p) => <CartLine {...p} title="Mug" price={9} quantity={1} /> },
	{ name: "OrderSummary", render: (p) => <OrderSummary {...p} lines={[]} total="$9" /> },
	{ name: "ShareButton", render: (p) => <ShareButton {...p} /> },
	{ name: "CopyId", render: (p) => <CopyId {...p} value="id_1" /> },
	{ name: "EnvBadge", render: (p) => <EnvBadge {...p} env="staging" /> },
	{
		name: "LocaleSwitcher",
		render: (p) => (
			<LocaleSwitcher {...p} value="en" options={[{ value: "en", label: "EN" }]} onChange={noop} />
		),
	},
	{ name: "OrgSwitcher", render: (p) => <OrgSwitcher {...p} org={{ id: "o", name: "Acme" }} /> },
	{ name: "InboxItem", render: (p) => <InboxItem {...p} title="Hi" /> },
	{
		name: "ReactionBar",
		render: (p) => <ReactionBar {...p} reactions={[{ emoji: "👍", count: 1 }]} />,
	},
	{ name: "Mention", render: (p) => <Mention {...p} name="ada" /> },
	{ name: "BrowserFrame", render: (p) => <BrowserFrame {...p}>x</BrowserFrame> },
	{ name: "PhoneFrame", render: (p) => <PhoneFrame {...p}>x</PhoneFrame> },
	{
		name: "FeatureCompare",
		render: (p) => (
			<FeatureCompare {...p} plans={["Free"]} rows={[{ feature: "SSO", values: [false] }]} />
		),
	},
	{ name: "ViewToggle", render: (p) => <ViewToggle {...p} value="list" onChange={noop} /> },
	{ name: "ResultCount", render: (p) => <ResultCount {...p} count={3} /> },
	{ name: "FilterChip", render: (p) => <FilterChip {...p} label="Open" onRemove={noop} /> },
	{ name: "BulkBar", render: (p) => <BulkBar {...p} count={2} /> },
	{ name: "LiveBadge", render: (p) => <LiveBadge {...p} /> },
	{ name: "UnreadBadge", render: (p) => <UnreadBadge {...p} count={4} /> },
	{ name: "SecretField", render: (p) => <SecretField {...p} value="sk_123" /> },
	{ name: "InfiniteScroll", render: (p) => <InfiniteScroll {...p} onLoadMore={noop} /> },
	// kit-extra.tsx
	{ name: "PresenceAvatar", render: (p) => <PresenceAvatar {...p} name="Ada" /> },
	{
		name: "Truncate",
		render: (p) => (
			<Truncate {...p} lines={2}>
				Long
			</Truncate>
		),
	},
	{ name: "Terminal", render: (p) => <Terminal {...p}>$ ls</Terminal> },
	{ name: "Diff", render: (p) => <Diff {...p} lines={[{ type: "add", text: "a" }]} /> },
	{ name: "Trend", render: (p) => <Trend {...p} value={-2} /> },
	{ name: "DonutChart", render: (p) => <DonutChart {...p} value={40} /> },
	{ name: "SparkBar", render: (p) => <SparkBar {...p} data={[1, 2]} /> },
	{ name: "SkeletonText", render: (p) => <SkeletonText {...p} /> },
	{ name: "SkeletonCard", render: (p) => <SkeletonCard {...p} /> },
	{ name: "LoadingButton", render: (p) => <LoadingButton {...p}>Save</LoadingButton> },
	{
		name: "ConfirmButton",
		render: (p) => <ConfirmButton {...p} label="Delete" onConfirm={noop} />,
	},
	{ name: "SettingsRow", render: (p) => <SettingsRow {...p} label="Theme" /> },
	{
		name: "ToggleRow",
		render: (p) => <ToggleRow {...p} label="Beta" checked={false} onChange={noop} />,
	},
	{ name: "DangerZone", render: (p) => <DangerZone {...p}>x</DangerZone> },
	{ name: "StickyBar", render: (p) => <StickyBar {...p}>x</StickyBar> },
	{ name: "SiteFooter", render: (p) => <SiteFooter {...p} /> },
	{
		name: "SocialLinks",
		render: (p) => <SocialLinks {...p} items={[{ icon: "git", label: "Git" }]} />,
	},
	{ name: "Reel", render: (p) => <Reel {...p}>x</Reel> },
	{ name: "GalleryGrid", render: (p) => <GalleryGrid {...p}>x</GalleryGrid> },
	{ name: "Testimonial", render: (p) => <Testimonial {...p} quote="Great" author="Ada" /> },
	{ name: "ReviewCard", render: (p) => <ReviewCard {...p} rating={4} /> },
	{ name: "LogoCloud", render: (p) => <LogoCloud {...p} items={["Acme"]} /> },
	{ name: "UploadItem", render: (p) => <UploadItem {...p} name="a.png" progress={40} /> },
	{ name: "WizardNav", render: (p) => <WizardNav {...p} /> },
	{ name: "FormFooter", render: (p) => <FormFooter {...p}>x</FormFooter> },
	{
		name: "Details",
		render: (p) => (
			<Details {...p} summary="More">
				x
			</Details>
		),
	},
	{ name: "Metric", render: (p) => <Metric {...p} label="Users" value={3} trend={1} /> },
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
