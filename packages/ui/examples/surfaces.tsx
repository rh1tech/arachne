import {
	ActivityItem,
	Anchor,
	Article,
	ArticleMeta,
	ArticleTitle,
	Avatar,
	BackgroundImage,
	Banner,
	BeforeAfter,
	Block,
	BottomSheet,
	Box,
	Burger,
	Button,
	Card,
	CardContent,
	CardFooter,
	CardFooterItem,
	CardHeader,
	CardHeaderTitle,
	CardImage,
	ChatBubble,
	ChoiceCard,
	ColorSwatch,
	Column,
	Columns,
	Container,
	CountUp,
	Dropzone,
	Figure,
	FileButton,
	FilterBar,
	Footer,
	Grid,
	GridItem,
	Hero,
	HeroBody,
	HeroFoot,
	HeroHead,
	Highlight,
	HoverCard,
	Iconnav,
	Image,
	JsonViewer,
	Level,
	LevelItem,
	LevelLeft,
	LevelRight,
	LoadMore,
	Masonry,
	Media,
	MediaContent,
	MediaLeft,
	MediaRight,
	Message,
	MessageBody,
	MessageHeader,
	NavigationProgress,
	NumberFormatter,
	PageHeader,
	Panel,
	PanelBlock,
	PanelHeading,
	PanelTab,
	PanelTabs,
	Paper,
	RelativeTime,
	ScrollSpy,
	SearchInput,
	Section,
	Stack,
	StatusDot,
	Sticky,
	Subnav,
	Text,
	ThemeToggle,
	Tile,
	Title,
	TypingIndicator,
	UserButton,
	VisuallyHidden,
} from "../src/index.ts";
import { swatch } from "./placeholder.ts";
import type { Example } from "./types.ts";

const noop = () => {};

/** One example per exported component of this group (showcase, docs and contract tests use these). */
const cardImage = swatch(210, "Cover", 640, 280);

export const examples: Example[] = [
	// surfaces.tsx
	{
		name: "Card",
		render: (p) => (
			<Card style={{ "max-width": "22rem" }} {...p}>
				<CardImage>
					<img src={cardImage} alt="Project cover" width="640" height="280" />
				</CardImage>
				<CardContent>
					<strong>marketing-site</strong>
					<Text muted>Deployed 4 minutes ago from main.</Text>
				</CardContent>
				<CardFooter>
					<CardFooterItem onClick={noop}>Visit</CardFooterItem>
					<CardFooterItem onClick={noop}>Logs</CardFooterItem>
				</CardFooter>
			</Card>
		),
	},
	{
		name: "CardHeader",
		render: (p) => (
			<Card>
				<CardHeader {...p}>
					<CardHeaderTitle>Billing</CardHeaderTitle>
				</CardHeader>
				<CardContent>Pro plan · renews Oct 1</CardContent>
			</Card>
		),
	},
	{
		name: "CardHeaderTitle",
		render: (p) => (
			<Card>
				<CardHeader>
					<CardHeaderTitle {...p}>Billing</CardHeaderTitle>
				</CardHeader>
			</Card>
		),
	},
	{
		name: "CardImage",
		render: (p) => (
			<Card style={{ "max-width": "22rem" }}>
				<CardImage {...p}>
					<img src={cardImage} alt="Project cover" width="640" height="280" />
				</CardImage>
			</Card>
		),
	},
	{
		name: "CardContent",
		render: (p) => (
			<Card>
				<CardContent {...p}>Card content is padded and flows like body text.</CardContent>
			</Card>
		),
	},
	{
		name: "CardFooter",
		render: (p) => (
			<Card>
				<CardContent>Delete this project?</CardContent>
				<CardFooter {...p}>
					<CardFooterItem onClick={noop}>Cancel</CardFooterItem>
					<CardFooterItem onClick={noop}>Delete</CardFooterItem>
				</CardFooter>
			</Card>
		),
	},
	{
		name: "CardFooterItem",
		render: (p) => (
			<Card>
				<CardFooter>
					<CardFooterItem {...p} onClick={noop}>
						Save
					</CardFooterItem>
					<CardFooterItem onClick={noop}>Cancel</CardFooterItem>
				</CardFooter>
			</Card>
		),
	},
	{
		name: "Panel",
		render: (p) => (
			<Panel label="Repositories" style={{ "max-width": "22rem" }} {...p}>
				<PanelHeading>Repositories</PanelHeading>
				<PanelTabs>
					<PanelTab active>All</PanelTab>
					<PanelTab>Public</PanelTab>
					<PanelTab>Private</PanelTab>
				</PanelTabs>
				<PanelBlock active onClick={noop}>
					arachne
				</PanelBlock>
				<PanelBlock onClick={noop}>marketing-site</PanelBlock>
			</Panel>
		),
	},
	{
		name: "PanelHeading",
		render: (p) => (
			<Panel label="Projects">
				<PanelHeading {...p}>Repositories</PanelHeading>
				<PanelBlock>arachne</PanelBlock>
			</Panel>
		),
	},
	{
		name: "PanelTabs",
		render: (p) => (
			<Panel label="Filter tabs">
				<PanelTabs {...p}>
					<PanelTab active>All</PanelTab>
					<PanelTab>Forks</PanelTab>
				</PanelTabs>
			</Panel>
		),
	},
	{
		name: "PanelTab",
		render: (p) => (
			<Panel label="Sources">
				<PanelTabs>
					<PanelTab {...p} active onClick={noop}>
						All
					</PanelTab>
					<PanelTab onClick={noop}>Forks</PanelTab>
				</PanelTabs>
			</Panel>
		),
	},
	{
		name: "PanelBlock",
		render: (p) => (
			<Panel label="Recent projects">
				<PanelBlock {...p} onClick={noop}>
					marketing-site
				</PanelBlock>
			</Panel>
		),
	},
	{
		name: "Tile",
		render: (p) => (
			<Tile {...p} ancestor>
				<Tile parent size={8}>
					<Tile child>
						<Box>Wide tile</Box>
					</Tile>
				</Tile>
				<Tile parent>
					<Tile child>
						<Box>Narrow</Box>
					</Tile>
				</Tile>
			</Tile>
		),
	},
	{
		name: "Message",
		render: (p) => (
			<Message {...p} tone="info">
				<MessageHeader onClose={noop}>Scheduled maintenance</MessageHeader>
				<MessageBody>
					Builds pause on Sunday 02:00–03:00 UTC while we upgrade the runners.
				</MessageBody>
			</Message>
		),
	},
	{
		name: "MessageHeader",
		render: (p) => (
			<Message tone="warning">
				<MessageHeader {...p} onClose={noop}>
					Usage limit
				</MessageHeader>
				<MessageBody>You've used 92% of this month's build minutes.</MessageBody>
			</Message>
		),
	},
	{
		name: "MessageBody",
		render: (p) => (
			<Message tone="success">
				<MessageBody {...p}>Your domain is verified.</MessageBody>
			</Message>
		),
	},
	{
		name: "Block",
		render: (p) => (
			<div>
				<Block {...p}>A block adds the standard bottom margin between siblings.</Block>
				<Block>Like this second one.</Block>
			</div>
		),
	},
	{
		name: "Paper",
		render: (p) => (
			<Paper {...p} padding="lg" shadow withBorder>
				Paper is the plainest surface: padding, radius, optional border and shadow.
			</Paper>
		),
	},
	// chrome.tsx
	{
		name: "Hero",
		render: (p) => (
			<Hero {...p} tone="accent" size="sm">
				<HeroBody>
					<Title order={2} size={3}>
						Ship faster with Arachne
					</Title>
					<Text>Signals, SSR and 330+ accessible components.</Text>
				</HeroBody>
			</Hero>
		),
	},
	{
		name: "HeroHead",
		render: (p) => (
			<Hero tone="dark" size="sm">
				<HeroHead {...p}>
					<strong>Arachne</strong>
				</HeroHead>
				<HeroBody>Hero head sits at the top, for a navbar or brand.</HeroBody>
			</Hero>
		),
	},
	{
		name: "HeroBody",
		render: (p) => (
			<Hero size="sm">
				<HeroBody {...p}>The body grows to fill the hero and centres its content.</HeroBody>
			</Hero>
		),
	},
	{
		name: "HeroFoot",
		render: (p) => (
			<Hero tone="light" size="sm">
				<HeroBody>Hero with a footer row.</HeroBody>
				<HeroFoot {...p}>
					<Text muted>Trusted by 2,000 teams</Text>
				</HeroFoot>
			</Hero>
		),
	},
	{
		name: "Footer",
		render: (p) => (
			<Footer {...p}>
				<Text muted>© 2026 Acme Inc. · Privacy · Terms</Text>
			</Footer>
		),
	},
	{
		name: "Media",
		render: (p) => (
			<Media {...p}>
				<MediaLeft>
					<Avatar name="Ada Lovelace" />
				</MediaLeft>
				<MediaContent>
					<strong>Ada Lovelace</strong> <Text muted>opened #421</Text>
				</MediaContent>
				<MediaRight>
					<Text muted>2h</Text>
				</MediaRight>
			</Media>
		),
	},
	{
		name: "MediaLeft",
		render: (p) => (
			<Media>
				<MediaLeft {...p}>
					<Avatar name="Grace Hopper" />
				</MediaLeft>
				<MediaContent>Left slot holds the avatar or thumbnail.</MediaContent>
			</Media>
		),
	},
	{
		name: "MediaContent",
		render: (p) => (
			<Media>
				<MediaLeft>
					<Avatar name="Grace Hopper" />
				</MediaLeft>
				<MediaContent {...p}>The content column grows to fill the row.</MediaContent>
			</Media>
		),
	},
	{
		name: "MediaRight",
		render: (p) => (
			<Media>
				<MediaContent>Row content</MediaContent>
				<MediaRight {...p}>
					<Button size="sm" variant="ghost">
						Reply
					</Button>
				</MediaRight>
			</Media>
		),
	},
	{
		name: "Article",
		render: (p) => (
			<Article {...p}>
				<ArticleTitle order={3}>Designing a kit-wide customization system</ArticleTitle>
				<ArticleMeta>Ada Lovelace · Sep 12, 2026 · 6 min read</ArticleMeta>
				<p>Every component forwards attributes and exposes named slots…</p>
			</Article>
		),
	},
	{
		name: "ArticleTitle",
		render: (p) => (
			<Article>
				<ArticleTitle {...p} order={3}>
					Designing a kit-wide customization system
				</ArticleTitle>
			</Article>
		),
	},
	{
		name: "ArticleMeta",
		render: (p) => (
			<Article>
				<ArticleTitle order={3}>Release 2.4</ArticleTitle>
				<ArticleMeta {...p}>Grace Hopper · Sep 1, 2026</ArticleMeta>
			</Article>
		),
	},
	{
		name: "Figure",
		render: (p) => (
			<Figure {...p} caption="Build times dropped 40% after caching dependencies.">
				<img src={swatch(160, "Chart", 480, 240)} alt="Build time chart" width="480" height="240" />
			</Figure>
		),
	},
	{
		name: "Image",
		render: (p) => (
			<Image
				{...p}
				src={swatch(30, "Photo", 480, 300)}
				alt="Placeholder photo"
				width={320}
				radius={8}
			/>
		),
	},
	// grid.tsx
	{
		name: "Columns",
		render: (p) => (
			<Columns {...p} gap="1rem">
				<Column>
					<Box>Auto</Box>
				</Column>
				<Column size={6}>
					<Box>Half</Box>
				</Column>
				<Column>
					<Box>Auto</Box>
				</Column>
			</Columns>
		),
	},
	{
		name: "Column",
		render: (p) => (
			<Columns>
				<Column {...p} size={4}>
					<Box>One third</Box>
				</Column>
				<Column>
					<Box>Rest</Box>
				</Column>
			</Columns>
		),
	},
	{
		name: "Grid",
		render: (p) => (
			<Grid {...p} cols={3} gap="0.75rem">
				<Box>1</Box>
				<Box>2</Box>
				<Box>3</Box>
				<Box>4</Box>
				<Box>5</Box>
				<Box>6</Box>
			</Grid>
		),
	},
	{
		name: "GridItem",
		render: (p) => (
			<Grid cols={3} gap="0.75rem">
				<GridItem {...p} span={2}>
					<Box>Spans two columns</Box>
				</GridItem>
				<Box>One</Box>
			</Grid>
		),
	},
	{
		name: "Container",
		render: (p) => (
			<Container {...p} size="sm">
				<Box>Content constrained to the small container width.</Box>
			</Container>
		),
	},
	{
		name: "Section",
		render: (p) => (
			<Section {...p} size="sm">
				<Title order={3}>Pricing</Title>
				<Text>Sections add vertical rhythm between page regions.</Text>
			</Section>
		),
	},
	{
		name: "Level",
		render: (p) => (
			<Level {...p}>
				<LevelLeft>
					<LevelItem>
						<strong>128 deploys</strong>
					</LevelItem>
				</LevelLeft>
				<LevelRight>
					<LevelItem>
						<Button size="sm">New deploy</Button>
					</LevelItem>
				</LevelRight>
			</Level>
		),
	},
	{
		name: "LevelLeft",
		render: (p) => (
			<Level>
				<LevelLeft {...p}>
					<LevelItem>Left side</LevelItem>
				</LevelLeft>
			</Level>
		),
	},
	{
		name: "LevelRight",
		render: (p) => (
			<Level>
				<LevelRight {...p}>
					<LevelItem>Right side</LevelItem>
				</LevelRight>
			</Level>
		),
	},
	{
		name: "LevelItem",
		render: (p) => (
			<Level>
				<LevelItem {...p}>
					<Text>Deploys</Text>
				</LevelItem>
				<LevelItem>
					<strong>128</strong>
				</LevelItem>
			</Level>
		),
	},
	// patterns.tsx
	{
		name: "BottomSheet",
		host: "panel",
		render: (p) => (
			<BottomSheet {...p} open onClose={noop} title="Share project">
				Anyone with the link can view.
			</BottomSheet>
		),
	},
	{
		name: "Banner",
		render: (p) => (
			<Banner
				{...p}
				tone="warning"
				title="Payment failed"
				action={<Button size="sm">Update card</Button>}
				onClose={noop}
			>
				Your card ending in 4242 was declined.
			</Banner>
		),
	},
	{ name: "StatusDot", render: (p) => <StatusDot {...p} label="Online" tone="success" /> },
	{
		name: "PageHeader",
		render: (p) => (
			<PageHeader
				{...p}
				title="Deploys"
				description="Every push to a branch creates a deploy."
				actions={<Button>New deploy</Button>}
			/>
		),
	},
	{
		name: "UserButton",
		render: (p) => <UserButton {...p} name="Ada Lovelace" email="ada@example.com" onClick={noop} />,
	},
	{ name: "ThemeToggle", render: (p) => <ThemeToggle {...p} value="light" onChange={noop} /> },
	{
		name: "ChoiceCard",
		render: (p) => (
			<ChoiceCard
				{...p}
				type="radio"
				name="plan"
				value="pro"
				checked
				label="Pro"
				description="$20 per seat / month"
				onChange={noop}
			/>
		),
	},
	{
		name: "ChatBubble",
		render: (p) => (
			<Stack gap="0.5rem">
				<ChatBubble from="them" author="Grace" meta="09:41">
					Is the deploy done?
				</ChatBubble>
				<ChatBubble {...p} from="me" meta="09:42">
					Yes — live on production.
				</ChatBubble>
			</Stack>
		),
	},
	{ name: "TypingIndicator", render: (p) => <TypingIndicator {...p} label="Grace is typing" /> },
	{
		name: "JsonViewer",
		render: (p) => (
			<JsonViewer {...p} value={{ id: "dep_128", status: "ready", regions: ["fra1", "iad1"] }} />
		),
	},
	{ name: "RelativeTime", render: (p) => <RelativeTime {...p} value={Date.now() - 5 * 60_000} /> },
	{ name: "CountUp", render: (p) => <CountUp {...p} value={12480} duration={0} /> },
	{
		name: "ScrollSpy",
		render: (p) => (
			<ScrollSpy
				{...p}
				label="On this page"
				items={[
					{ id: "intro", label: "Introduction" },
					{ id: "install", label: "Installation" },
					{ id: "usage", label: "Usage" },
				]}
			/>
		),
	},
	{
		name: "BeforeAfter",
		render: (p) => (
			<BeforeAfter
				{...p}
				label="Compare designs"
				before={swatch(20, "Before", 640, 360)}
				beforeAlt="Before redesign"
				after={swatch(260, "After", 640, 360)}
				afterAlt="After redesign"
				initial={50}
			/>
		),
	},
	{
		name: "LoadMore",
		render: (p) => (
			<LoadMore {...p} onLoad={noop} hasMore>
				Load 20 more
			</LoadMore>
		),
	},
	{
		name: "ActivityItem",
		render: (p) => (
			<ActivityItem {...p} icon="git" title="Ada pushed 3 commits to main" meta="12 minutes ago" />
		),
	},
	{
		name: "FilterBar",
		render: (p) => (
			<FilterBar {...p}>
				<SearchInput aria-label="Search deploys" value="" onChange={noop} />
				<Button variant="outline">Status</Button>
				<Button variant="outline">Branch</Button>
			</FilterBar>
		),
	},
	{
		name: "Masonry",
		render: (p) => (
			<Masonry {...p} columns={3}>
				<img src={swatch(200, "1", 240, 320)} alt="Tall" width="240" height="320" />
				<img src={swatch(150, "2", 240, 160)} alt="Short" width="240" height="160" />
				<img src={swatch(30, "3", 240, 240)} alt="Square" width="240" height="240" />
				<img src={swatch(300, "4", 240, 180)} alt="Wide" width="240" height="180" />
			</Masonry>
		),
	},
	// overlays-extra.tsx
	{
		name: "HoverCard",
		render: (p) => (
			<HoverCard {...p} dropdown={<Text>Ada Lovelace · Analyst of engines</Text>}>
				<Anchor href="#ada">@ada</Anchor>
			</HoverCard>
		),
	},
	{ name: "Burger", render: (p) => <Burger {...p} label="Open navigation" onClick={noop} /> },
	{ name: "ColorSwatch", render: (p) => <ColorSwatch {...p} color="#fca311" /> },
	{
		name: "VisuallyHidden",
		render: (p) => (
			<Button variant="ghost">
				★<VisuallyHidden {...p}>Add to favourites</VisuallyHidden>
			</Button>
		),
	},
	{
		name: "Highlight",
		render: (p) => (
			<Highlight {...p} text="Deploy marketing-site to production" highlight="deploy" />
		),
	},
	{
		name: "BackgroundImage",
		render: (p) => (
			<BackgroundImage {...p} src={swatch(260, "", 800, 300)} radius>
				<Box style={{ margin: "2rem", "max-width": "18rem" }}>Content over a background image.</Box>
			</BackgroundImage>
		),
	},
	{
		name: "Sticky",
		render: (p) => (
			<Sticky {...p} offset={8}>
				<Paper withBorder>Sticks 8px from the top while its container scrolls.</Paper>
			</Sticky>
		),
	},
	// files-nav.tsx
	{
		name: "FileButton",
		render: (p) => (
			<FileButton {...p} accept="image/*" onChange={noop}>
				Upload avatar
			</FileButton>
		),
	},
	{
		name: "Dropzone",
		render: (p) => (
			<Dropzone {...p} multiple accept=".csv" onDrop={noop}>
				Drop CSV files here, or click to browse
			</Dropzone>
		),
	},
	{
		name: "Subnav",
		render: (p) => (
			<Subnav
				{...p}
				label="Filter"
				value="all"
				onChange={noop}
				items={[
					{ id: "all", label: "All" },
					{ id: "production", label: "Production" },
					{ id: "preview", label: "Preview" },
				]}
			/>
		),
	},
	{
		name: "Iconnav",
		render: (p) => (
			<Iconnav
				{...p}
				label="Workspace"
				value="home"
				onChange={noop}
				items={[
					{ id: "home", icon: "home", label: "Home" },
					{ id: "alerts", icon: "bell", label: "Alerts" },
					{ id: "settings", icon: "settings", label: "Settings" },
				]}
			/>
		),
	},
	{ name: "NavigationProgress", render: (p) => <NavigationProgress {...p} visible value={40} /> },
	{
		name: "NumberFormatter",
		render: (p) => <NumberFormatter {...p} value={1234567.891} decimalScale={2} />,
	},
];
