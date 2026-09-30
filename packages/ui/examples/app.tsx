import { For, Show } from "@arachnejs/render";
import { effect, signal } from "@arachnejs/signals";
import {
	Alert,
	AnnouncementBar,
	Avatar,
	BrowserFrame,
	BulkBar,
	Button,
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
	Group,
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
	ScrollArea,
	SecretField,
	SettingsRow,
	ShareButton,
	SiteFooter,
	SkeletonCard,
	SkeletonText,
	SocialLinks,
	SparkBar,
	Stack,
	StatCard,
	StickyBar,
	TableOfContents,
	Terminal,
	Testimonial,
	Text,
	ToggleRow,
	Trend,
	Truncate,
	UnreadBadge,
	UploadItem,
	ViewToggle,
	WizardNav,
} from "../src/index.ts";
import { action } from "./actions.ts";
import { swatch } from "./placeholder.ts";
import type { Example, ExampleProps } from "./types.ts";

function AnnouncementBarExample(p: ExampleProps) {
	const visible = signal(true);
	return (
		<Show
			when={visible()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => visible.set(true)}>
					Show announcement again
				</Button>
			}
		>
			<AnnouncementBar {...p} tone="accent" dismissible onDismiss={() => visible.set(false)}>
				Arachne 2.4 is out — dark theme and a new component reference.
			</AnnouncementBar>
		</Show>
	);
}

function QuantityInputExample(p: ExampleProps) {
	const quantity = signal(2);
	return <QuantityInput {...p} min={1} max={10} value={quantity()} onChange={quantity.set} />;
}

function ProductCardExample(p: ExampleProps) {
	const inCart = signal(0);
	return (
		<Stack gap="0.5rem">
			<ProductCard
				{...p}
				title="Stoneware mug"
				order={3}
				price={24}
				strike={32}
				badge="Sale"
				image={swatch(28, "Mug", 480, 360)}
				imageAlt="Terracotta stoneware mug"
				onAdd={() => inCart.set(inCart() + 1)}
			/>
			<Text muted>In cart: {inCart()}</Text>
		</Stack>
	);
}

function CartLineExample(p: ExampleProps) {
	const quantity = signal(2);
	const removed = signal(false);
	return (
		<Show
			when={!removed()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => removed.set(false)}>
					Undo remove
				</Button>
			}
		>
			<CartLine
				{...p}
				title="Stoneware mug"
				price={24}
				quantity={quantity()}
				image={swatch(28, "Mug", 160, 160)}
				onQuantityChange={quantity.set}
				onRemove={() => removed.set(true)}
			/>
		</Show>
	);
}

function LocaleSwitcherExample(p: ExampleProps) {
	const locale = signal("en");
	return (
		<LocaleSwitcher
			{...p}
			label="Language"
			value={locale()}
			options={[
				{ value: "en", label: "English" },
				{ value: "de", label: "Deutsch" },
				{ value: "ja", label: "日本語" },
			]}
			onChange={locale.set}
		/>
	);
}

function ReactionBarExample(p: ExampleProps) {
	const reactions = signal([
		{ emoji: "👍", count: 12, active: true },
		{ emoji: "🎉", count: 4, active: false },
		{ emoji: "👀", count: 2, active: false },
	]);
	const toggle = (emoji: string) =>
		reactions.set(
			reactions().map((r) =>
				r.emoji === emoji ? { ...r, active: !r.active, count: r.count + (r.active ? -1 : 1) } : r,
			),
		);
	return <ReactionBar {...p} reactions={reactions()} onToggle={toggle} />;
}

function ViewToggleExample(p: ExampleProps) {
	const view = signal<"list" | "grid">("list");
	return (
		<Group gap="0.75rem">
			<ViewToggle {...p} value={view()} onChange={view.set} />
			<Text muted>Showing a {view()}</Text>
		</Group>
	);
}

function FilterChipExample(p: ExampleProps) {
	const filters = signal(["Status: failed", "Branch: main", "Author: ada"]);
	return (
		<Group gap="0.5rem">
			<For each={filters()}>
				{(filter) => (
					<FilterChip
						{...p}
						label={filter}
						onRemove={() => filters.set(filters().filter((f) => f !== filter))}
					/>
				)}
			</For>
			<Show when={filters().length < 3}>
				<Button
					size="sm"
					variant="ghost"
					onClick={() => filters.set(["Status: failed", "Branch: main", "Author: ada"])}
				>
					Reset filters
				</Button>
			</Show>
		</Group>
	);
}

function BulkBarExample(p: ExampleProps) {
	const selected = signal(3);
	return (
		<Show
			when={selected() > 0}
			fallback={
				<Button size="sm" variant="outline" onClick={() => selected.set(3)}>
					Select 3 deploys
				</Button>
			}
		>
			<BulkBar {...p} count={selected()} onClear={() => selected.set(0)}>
				<Button size="sm" variant="outline" onClick={() => selected.set(0)}>
					Archive
				</Button>
			</BulkBar>
		</Show>
	);
}

function InfiniteScrollExample(p: ExampleProps) {
	const deploys = signal(Array.from({ length: 6 }, (_, i) => 128 - i));
	const loading = signal(false);
	const hasMore = () => deploys().length < 30;
	const loadMore = () => {
		if (loading() || !hasMore()) return;
		loading.set(true);
		setTimeout(() => {
			const last = deploys()[deploys().length - 1] ?? 128;
			deploys.set([...deploys(), ...Array.from({ length: 6 }, (_, i) => last - 1 - i)]);
			loading.set(false);
		}, 600);
	};
	return (
		<ScrollArea maxHeight="12rem">
			<InfiniteScroll {...p} onLoadMore={loadMore} hasMore={hasMore()} loading={loading()}>
				<Stack gap="0.5rem">
					<For each={deploys()}>{(n) => <Text>Deploy #{n}</Text>}</For>
				</Stack>
			</InfiniteScroll>
		</ScrollArea>
	);
}

function ToggleRowExample(p: ExampleProps) {
	const previews = signal(true);
	return (
		<ToggleRow
			{...p}
			label="Preview deploys"
			description="Deploy every pull request to a unique URL."
			checked={previews()}
			onChange={previews.set}
		/>
	);
}

function UploadItemExample(p: ExampleProps) {
	const progress = signal(12);
	const cancelled = signal(false);
	// Simulated upload; effects run only in the browser.
	effect(() => {
		const timer = setInterval(() => {
			if (!cancelled() && progress() < 100) progress.set(Math.min(100, progress() + 8));
		}, 400);
		return () => clearInterval(timer);
	});
	return (
		<Show
			when={!cancelled()}
			fallback={
				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						progress.set(0);
						cancelled.set(false);
					}}
				>
					Upload again
				</Button>
			}
		>
			<UploadItem
				{...p}
				name="hero@2x.png"
				progress={progress()}
				onCancel={() => cancelled.set(true)}
			/>
		</Show>
	);
}

function WizardNavExample(p: ExampleProps) {
	const steps = ["Account", "Team", "Billing", "Done"];
	const step = signal(0);
	return (
		<Stack gap="0.75rem">
			<Text>
				Step {step() + 1} of {steps.length}: <strong>{steps[step()]}</strong>
			</Text>
			<WizardNav
				{...p}
				canBack={step() > 0}
				canNext={step() < steps.length - 1}
				nextLabel={step() === steps.length - 2 ? "Finish" : "Continue"}
				onBack={() => step.set(step() - 1)}
				onNext={() => step.set(step() + 1)}
			/>
		</Stack>
	);
}

function TableOfContentsExample(p: ExampleProps) {
	const current = signal("install");
	const sections = [
		{ id: "install", label: "Installation" },
		{ id: "usage", label: "Usage" },
		{ id: "theming", label: "Theming" },
	];
	return (
		<TableOfContents
			{...p}
			title="On this page"
			items={sections.map((s) => ({
				...s,
				active: current() === s.id,
				onSelect: () => current.set(s.id),
			}))}
		/>
	);
}

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	// feedback.tsx
	{
		name: "Alert",
		render: (p) => (
			<Alert {...p} tone="success" title="Deploy finished">
				marketing-site is live on production.
			</Alert>
		),
	},
	{
		name: "Divider",
		render: (p) => (
			<Stack gap="0.75rem">
				<Text>Account</Text>
				<Divider {...p} />
				<Text>Billing</Text>
			</Stack>
		),
	},
	{
		name: "Heading",
		render: (p) => (
			<Heading {...p} level={3}>
				Team members
			</Heading>
		),
	},
	// presence.tsx
	{ name: "Avatar", render: (p) => <Avatar {...p} name="Ada Lovelace" /> },
	{
		name: "EmptyState",
		render: (p) => (
			<EmptyState
				{...p}
				title="No projects yet"
				description="Create a project to start deploying."
				action={<Button onClick={action("New project")}>New project</Button>}
			/>
		),
	},
	{
		name: "Kbd",
		render: (p) => (
			<Text>
				Press <Kbd {...p}>Esc</Kbd> to close.
			</Text>
		),
	},
	{
		name: "Code",
		render: (p) => (
			<Text>
				Run <Code {...p}>bun run ui:docs</Code> after changing an example.
			</Text>
		),
	},
	// icons.tsx
	{ name: "Icon", render: (p) => <Icon {...p} name="bell" /> },
	{ name: "IconBadge", render: (p) => <IconBadge {...p} name="zap" tone="accent" /> },
	{ name: "CloseButton", render: (p) => <CloseButton {...p} onClick={action("close")} /> },
	// kit-app.tsx
	{ name: "AnnouncementBar", render: (p) => <AnnouncementBarExample {...p} /> },
	{
		name: "CommandBar",
		render: (p) => (
			<CommandBar {...p} label="Selection actions">
				<Button size="sm" variant="ghost" onClick={action("Archive")}>
					Archive
				</Button>
				<Button size="sm" variant="ghost" onClick={action("Move")}>
					Move
				</Button>
				<Button size="sm" variant="ghost" onClick={action("Delete")}>
					Delete
				</Button>
			</CommandBar>
		),
	},
	{ name: "TableOfContents", render: (p) => <TableOfContentsExample {...p} /> },
	{
		name: "PropertyList",
		render: (p) => (
			<PropertyList
				{...p}
				items={[
					{ label: "Status", value: "Active" },
					{ label: "Owner", value: "Ada Lovelace" },
					{ label: "Region", value: "eu-central-1" },
				]}
			/>
		),
	},
	{
		name: "StatCard",
		render: (p) => <StatCard {...p} label="MRR" value="$48.2k" hint="vs. last month" trend={6.4} />,
	},
	{ name: "QuantityInput", render: (p) => <QuantityInputExample {...p} /> },
	{ name: "Price", render: (p) => <Price {...p} amount={24} strike={32} period="month" /> },
	{ name: "ProductCard", render: (p) => <ProductCardExample {...p} /> },
	{ name: "CartLine", render: (p) => <CartLineExample {...p} /> },
	{
		name: "OrderSummary",
		render: (p) => (
			<OrderSummary
				{...p}
				lines={[
					{ label: "Subtotal", value: "$48.00" },
					{ label: "Shipping", value: "Free", muted: true },
					{ label: "Tax", value: "$4.32" },
				]}
				total="$52.32"
			/>
		),
	},
	{
		name: "ShareButton",
		render: (p) => <ShareButton {...p} url="https://arachne.dev/ui" title="Arachne UI" />,
	},
	{ name: "CopyId", render: (p) => <CopyId {...p} value="prj_8f3k29dz" /> },
	{ name: "EnvBadge", render: (p) => <EnvBadge {...p} env="staging" /> },
	{ name: "LocaleSwitcher", render: (p) => <LocaleSwitcherExample {...p} /> },
	{
		name: "OrgSwitcher",
		render: (p) => (
			<OrgSwitcher
				{...p}
				org={{ id: "acme", name: "Acme Inc.", plan: "Pro" }}
				onClick={action("onClick")}
			/>
		),
	},
	{
		name: "InboxItem",
		render: (p) => (
			<InboxItem
				{...p}
				icon="git"
				title="Grace requested your review"
				body="#421 Toast: pause on hover"
				time="5m"
				unread
				onClick={action("onClick")}
			/>
		),
	},
	{ name: "ReactionBar", render: (p) => <ReactionBarExample {...p} /> },
	{
		name: "Mention",
		render: (p) => (
			<Text>
				Thanks <Mention {...p} name="ada" onClick={action("open profile")} />, merging now.
			</Text>
		),
	},
	{
		name: "BrowserFrame",
		render: (p) => (
			<BrowserFrame {...p} url="https://acme.arachne.app">
				<img src={swatch(220, "Preview", 640, 300)} alt="Site preview" width="640" height="300" />
			</BrowserFrame>
		),
	},
	{
		name: "PhoneFrame",
		render: (p) => (
			<PhoneFrame {...p}>
				<img src={swatch(260, "App", 300, 600)} alt="App screen" width="300" height="600" />
			</PhoneFrame>
		),
	},
	{
		name: "FeatureCompare",
		render: (p) => (
			<FeatureCompare
				{...p}
				plans={["Free", "Pro", "Enterprise"]}
				rows={[
					{ feature: "Projects", values: ["3", "Unlimited", "Unlimited"] },
					{ feature: "Preview deploys", values: [true, true, true] },
					{ feature: "SSO", values: [false, false, true] },
				]}
			/>
		),
	},
	{ name: "ViewToggle", render: (p) => <ViewToggleExample {...p} /> },
	{ name: "ResultCount", render: (p) => <ResultCount {...p} count={1284} label="deploys" /> },
	{ name: "FilterChip", render: (p) => <FilterChipExample {...p} /> },
	{ name: "BulkBar", render: (p) => <BulkBarExample {...p} /> },
	{ name: "LiveBadge", render: (p) => <LiveBadge {...p} /> },
	{
		name: "UnreadBadge",
		render: (p) => (
			<Text>
				Inbox <UnreadBadge {...p} count={4} />
			</Text>
		),
	},
	{
		name: "SecretField",
		render: (p) => <SecretField {...p} label="Webhook secret" value="whsec_9f2kQ83m1x" />,
	},
	{ name: "InfiniteScroll", render: (p) => <InfiniteScrollExample {...p} /> },
	// kit-extra.tsx
	{
		name: "PresenceAvatar",
		render: (p) => <PresenceAvatar {...p} name="Ada Lovelace" status="success" />,
	},
	{
		name: "Truncate",
		render: (p) => (
			<Truncate style={{ "max-width": "22rem" }} {...p} lines={2}>
				The customization system covers every component: attributes are forwarded to the host
				element, classes and styles target named slots, unstyled drops the built-in look, and
				configureUI sets app-wide defaults. Text past the second line is cut with an ellipsis.
			</Truncate>
		),
	},
	{
		name: "Terminal",
		render: (p) => (
			<Terminal {...p} title="zsh">
				{"$ bun add @arachnejs/ui\ninstalled @arachnejs/ui@2.4.0"}
			</Terminal>
		),
	},
	{
		name: "Diff",
		render: (p) => (
			<Diff
				{...p}
				lines={[
					{ type: "ctx", text: "<Title" },
					{ type: "del", text: "  size={5}" },
					{ type: "add", text: "  order={3} size={5}" },
					{ type: "ctx", text: ">Settings</Title>" },
				]}
			/>
		),
	},
	{ name: "Trend", render: (p) => <Trend {...p} value={-2.3} label="vs. last week" /> },
	{ name: "DonutChart", render: (p) => <DonutChart {...p} value={68} label="Tests passing" /> },
	{
		name: "SparkBar",
		render: (p) => <SparkBar {...p} label="Requests per hour" data={[4, 7, 5, 9, 12, 8, 6, 10]} />,
	},
	{ name: "SkeletonText", render: (p) => <SkeletonText {...p} lines={3} /> },
	{ name: "SkeletonCard", render: (p) => <SkeletonCard {...p} /> },
	{
		name: "LoadingButton",
		render: (p) => (
			<LoadingButton {...p} loading>
				Saving…
			</LoadingButton>
		),
	},
	{
		name: "ConfirmButton",
		render: (p) => <ConfirmButton {...p} label="Delete project" onConfirm={action("onConfirm")} />,
	},
	{
		name: "SettingsRow",
		render: (p) => (
			<SettingsRow
				{...p}
				label="Default branch"
				description="Pushes to this branch deploy to production."
				control={<Code>main</Code>}
			/>
		),
	},
	{ name: "ToggleRow", render: (p) => <ToggleRowExample {...p} /> },
	{
		name: "DangerZone",
		render: (p) => (
			<DangerZone
				{...p}
				title="Delete project"
				description="This permanently removes all deploys and domains."
			>
				<Button variant="danger" onClick={action("delete project")}>
					Delete marketing-site
				</Button>
			</DangerZone>
		),
	},
	{
		name: "StickyBar",
		render: (p) => (
			<StickyBar {...p} position="bottom">
				<Text>You have unsaved changes.</Text>
				<Button size="sm" onClick={action("Save")}>
					Save
				</Button>
			</StickyBar>
		),
	},
	{
		name: "SiteFooter",
		render: (p) => (
			<SiteFooter
				{...p}
				brand="Arachne"
				columns={[
					{
						title: "Product",
						links: [
							{ label: "Pricing", href: "#pricing" },
							{ label: "Changelog", href: "#changelog" },
						],
					},
					{
						title: "Company",
						links: [
							{ label: "About", href: "#about" },
							{ label: "Careers", href: "#careers" },
						],
					},
				]}
				meta="© 2026 Arachne"
			/>
		),
	},
	{
		name: "SocialLinks",
		render: (p) => (
			<SocialLinks
				{...p}
				items={[
					{ icon: "git", label: "GitHub", href: "https://github.com" },
					{ icon: "mail", label: "Email", href: "mailto:hello@example.com" },
				]}
			/>
		),
	},
	{
		name: "Reel",
		render: (p) => (
			<Reel {...p}>
				<img src={swatch(200, "1", 240, 160)} alt="Slide 1" width="240" height="160" />
				<img src={swatch(160, "2", 240, 160)} alt="Slide 2" width="240" height="160" />
				<img src={swatch(30, "3", 240, 160)} alt="Slide 3" width="240" height="160" />
				<img src={swatch(300, "4", 240, 160)} alt="Slide 4" width="240" height="160" />
			</Reel>
		),
	},
	{
		name: "GalleryGrid",
		render: (p) => (
			<GalleryGrid {...p} columns={3}>
				<img src={swatch(200, "A", 320, 240)} alt="Gallery A" width="320" height="240" />
				<img src={swatch(160, "B", 320, 240)} alt="Gallery B" width="320" height="240" />
				<img src={swatch(30, "C", 320, 240)} alt="Gallery C" width="320" height="240" />
			</GalleryGrid>
		),
	},
	{
		name: "Testimonial",
		render: (p) => (
			// biome-ignore lint/a11y/useValidAriaRole: Testimonial `role` is the author's job title, not an ARIA role
			<Testimonial
				{...p}
				quote="We replaced three component libraries with one and our bundle got smaller."
				author="Grace Hopper"
				role="Staff engineer, Navy Labs"
			/>
		),
	},
	{
		name: "ReviewCard",
		render: (p) => (
			<ReviewCard {...p} order={3} rating={4} title="Solid mug" author="Linus T.">
				Keeps coffee warm, survives the dishwasher.
			</ReviewCard>
		),
	},
	{
		name: "LogoCloud",
		render: (p) => <LogoCloud {...p} items={["Acme", "Globex", "Initech", "Umbrella"]} />,
	},
	{ name: "UploadItem", render: (p) => <UploadItemExample {...p} /> },
	{ name: "WizardNav", render: (p) => <WizardNavExample {...p} /> },
	{
		name: "FormFooter",
		render: (p) => (
			<form
				onSubmit={(e: SubmitEvent) => {
					e.preventDefault();
					action("submit")();
				}}
			>
				<FormFooter {...p}>
					<Button variant="ghost" onClick={action("Cancel")}>
						Cancel
					</Button>
					<Button type="submit">Save changes</Button>
				</FormFooter>
			</form>
		),
	},
	{
		name: "Details",
		render: (p) => (
			<Details {...p} summary="Why is my deploy queued?">
				Free plans run one build at a time; later builds wait for the current one.
			</Details>
		),
	},
	{
		name: "Metric",
		render: (p) => <Metric {...p} label="p95 latency" value="182 ms" trend={-4} />,
	},
];
