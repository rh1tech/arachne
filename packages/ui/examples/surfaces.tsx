import { For, Show } from "@arachne/render";
import { signal } from "@arachne/signals";
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
	Group,
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
	ScrollArea,
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
import { action } from "./actions.ts";
import { swatch } from "./placeholder.ts";
import type { Example, ExampleProps } from "./types.ts";

function PanelExample(p: ExampleProps) {
	const repos = [
		{ name: "arachne", visibility: "public" },
		{ name: "marketing-site", visibility: "private" },
		{ name: "design-tokens", visibility: "public" },
	];
	const tab = signal("all");
	const active = signal("arachne");
	const shown = () => repos.filter((r) => tab() === "all" || r.visibility === tab());
	return (
		<Panel label="Repositories" style={{ "max-width": "22rem" }} {...p}>
			<PanelHeading>Repositories</PanelHeading>
			<PanelTabs>
				<For each={["all", "public", "private"]}>
					{(id) => (
						<PanelTab active={tab() === id} onClick={() => tab.set(id)}>
							{id[0]?.toUpperCase() + id.slice(1)}
						</PanelTab>
					)}
				</For>
			</PanelTabs>
			<For each={shown()}>
				{(repo) => (
					<PanelBlock active={active() === repo.name} onClick={() => active.set(repo.name)}>
						{repo.name}
					</PanelBlock>
				)}
			</For>
		</Panel>
	);
}

function PanelTabExample(p: ExampleProps) {
	const tab = signal("all");
	return (
		<Panel label="Sources">
			<PanelTabs>
				<PanelTab {...p} active={tab() === "all"} onClick={() => tab.set("all")}>
					All
				</PanelTab>
				<PanelTab active={tab() === "forks"} onClick={() => tab.set("forks")}>
					Forks
				</PanelTab>
			</PanelTabs>
		</Panel>
	);
}

function PanelBlockExample(p: ExampleProps) {
	const active = signal("marketing-site");
	return (
		<Panel label="Recent projects">
			<PanelBlock
				{...p}
				active={active() === "marketing-site"}
				onClick={() => active.set("marketing-site")}
			>
				marketing-site
			</PanelBlock>
			<PanelBlock active={active() === "docs"} onClick={() => active.set("docs")}>
				docs
			</PanelBlock>
		</Panel>
	);
}

function MessageExample(p: ExampleProps) {
	const visible = signal(true);
	return (
		<Show
			when={visible()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => visible.set(true)}>
					Show message
				</Button>
			}
		>
			<Message {...p} tone="info">
				<MessageHeader onClose={() => visible.set(false)}>Scheduled maintenance</MessageHeader>
				<MessageBody>
					Builds pause on Sunday 02:00–03:00 UTC while we upgrade the runners.
				</MessageBody>
			</Message>
		</Show>
	);
}

function MessageHeaderExample(p: ExampleProps) {
	const visible = signal(true);
	return (
		<Show
			when={visible()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => visible.set(true)}>
					Show message
				</Button>
			}
		>
			<Message tone="warning">
				<MessageHeader {...p} onClose={() => visible.set(false)}>
					Usage limit
				</MessageHeader>
				<MessageBody>You've used 92% of this month's build minutes.</MessageBody>
			</Message>
		</Show>
	);
}

function BannerExample(p: ExampleProps) {
	const visible = signal(true);
	return (
		<Show
			when={visible()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => visible.set(true)}>
					Show banner
				</Button>
			}
		>
			<Banner
				{...p}
				tone="warning"
				title="Payment failed"
				action={
					<Button size="sm" onClick={() => visible.set(false)}>
						Update card
					</Button>
				}
				onClose={() => visible.set(false)}
			>
				Your card ending in 4242 was declined.
			</Banner>
		</Show>
	);
}

function ThemeToggleExample(p: ExampleProps) {
	const theme = signal<"light" | "dark">("light");
	return (
		<Paper withBorder class={theme() === "dark" ? "a-theme-dark" : undefined}>
			<Group gap="0.75rem">
				<ThemeToggle {...p} value={theme()} onChange={theme.set} />
				<Text>This panel is in the {theme()} theme.</Text>
			</Group>
		</Paper>
	);
}

function ChoiceCardExample(p: ExampleProps) {
	const plan = signal("pro");
	return (
		<Group gap="0.75rem">
			<ChoiceCard
				type="radio"
				name="plan"
				value="free"
				checked={plan() === "free"}
				label="Free"
				description="For side projects"
				onChange={(checked) => checked && plan.set("free")}
			/>
			<ChoiceCard
				{...p}
				type="radio"
				name="plan"
				value="pro"
				checked={plan() === "pro"}
				label="Pro"
				description="$20 per seat / month"
				onChange={(checked) => checked && plan.set("pro")}
			/>
		</Group>
	);
}

function LoadMoreExample(p: ExampleProps) {
	const count = signal(3);
	const loading = signal(false);
	const load = () => {
		loading.set(true);
		setTimeout(() => {
			count.set(count() + 3);
			loading.set(false);
		}, 500);
	};
	return (
		<Stack gap="0.5rem">
			<For each={Array.from({ length: count() }, (_, i) => i + 1)}>
				{(n) => <Text>Activity #{n}</Text>}
			</For>
			<LoadMore
				{...p}
				onLoad={load}
				loading={loading()}
				hasMore={count() < 12}
				endLabel="That's everything."
			>
				Load 3 more
			</LoadMore>
		</Stack>
	);
}

function FilterBarExample(p: ExampleProps) {
	const query = signal("");
	const deploys = ["marketing-site #128", "docs #127", "marketing-site #126", "api #125"];
	return (
		<Stack gap="0.5rem">
			<FilterBar {...p}>
				<SearchInput
					aria-label="Search deploys"
					placeholder="Search deploys"
					value={query()}
					onChange={query.set}
				/>
				<Button variant="outline" onClick={() => query.set("")}>
					Clear
				</Button>
			</FilterBar>
			<For each={deploys.filter((d) => d.includes(query()))}>{(d) => <Text>{d}</Text>}</For>
		</Stack>
	);
}

function BurgerExample(p: ExampleProps) {
	const opened = signal(false);
	return (
		<Group gap="0.75rem">
			<Burger
				{...p}
				opened={opened()}
				label={opened() ? "Close navigation" : "Open navigation"}
				onClick={() => opened.set(!opened())}
			/>
			<Text muted>Navigation is {opened() ? "open" : "closed"}</Text>
		</Group>
	);
}

function FileButtonExample(p: ExampleProps) {
	const file = signal("");
	return (
		<Group gap="0.75rem">
			<FileButton {...p} accept="image/*" onChange={(files) => file.set(files[0]?.name ?? "")}>
				Upload avatar
			</FileButton>
			<Text muted>{file() || "No file chosen"}</Text>
		</Group>
	);
}

function DropzoneExample(p: ExampleProps) {
	const files = signal<string[]>([]);
	return (
		<Stack gap="0.5rem">
			<Dropzone
				{...p}
				multiple
				accept=".csv"
				onDrop={(dropped) => files.set(dropped.map((f) => f.name))}
			>
				Drop CSV files here, or click to browse
			</Dropzone>
			<Text muted>{files().length ? files().join(", ") : "No files yet"}</Text>
		</Stack>
	);
}

function SubnavExample(p: ExampleProps) {
	const filter = signal("all");
	return (
		<Subnav
			{...p}
			label="Filter"
			value={filter()}
			onChange={filter.set}
			items={[
				{ id: "all", label: "All" },
				{ id: "production", label: "Production" },
				{ id: "preview", label: "Preview" },
			]}
		/>
	);
}

function IconnavExample(p: ExampleProps) {
	const section = signal("home");
	return (
		<Iconnav
			{...p}
			label="Workspace"
			value={section()}
			onChange={section.set}
			items={[
				{ id: "home", icon: "home", label: "Home" },
				{ id: "alerts", icon: "bell", label: "Alerts" },
				{ id: "settings", icon: "settings", label: "Settings" },
			]}
		/>
	);
}

function ScrollSpyExample(p: ExampleProps) {
	const sections = [
		{ id: "spy-intro", label: "Introduction", text: "What Arachne UI is and when to use it." },
		{
			id: "spy-install",
			label: "Installation",
			text: "Add the package and import the stylesheet.",
		},
		{ id: "spy-usage", label: "Usage", text: "Render components and wire their state." },
	];
	return (
		<Group align="start" gap="1.5rem">
			<ScrollSpy {...p} label="On this page" offset={8} items={sections} />
			<ScrollArea maxHeight="9rem" aria-label="Article">
				<For each={sections}>
					{(section) => (
						<section id={section.id} style={{ "min-height": "7rem" }}>
							<strong>{section.label}</strong>
							<Text muted>{section.text}</Text>
						</section>
					)}
				</For>
			</ScrollArea>
		</Group>
	);
}

function PanelTabsExample(p: ExampleProps) {
	const tab = signal("all");
	return (
		<Panel label="Filter tabs">
			<PanelTabs {...p}>
				<PanelTab active={tab() === "all"} onClick={() => tab.set("all")}>
					All
				</PanelTab>
				<PanelTab active={tab() === "forks"} onClick={() => tab.set("forks")}>
					Forks
				</PanelTab>
			</PanelTabs>
		</Panel>
	);
}

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
					<CardFooterItem onClick={action("onClick")}>Visit</CardFooterItem>
					<CardFooterItem onClick={action("onClick")}>Logs</CardFooterItem>
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
					<CardFooterItem onClick={action("onClick")}>Cancel</CardFooterItem>
					<CardFooterItem onClick={action("onClick")}>Delete</CardFooterItem>
				</CardFooter>
			</Card>
		),
	},
	{
		name: "CardFooterItem",
		render: (p) => (
			<Card>
				<CardFooter>
					<CardFooterItem {...p} onClick={action("onClick")}>
						Save
					</CardFooterItem>
					<CardFooterItem onClick={action("onClick")}>Cancel</CardFooterItem>
				</CardFooter>
			</Card>
		),
	},
	{ name: "Panel", render: (p) => <PanelExample {...p} /> },
	{
		name: "PanelHeading",
		render: (p) => (
			<Panel label="Projects">
				<PanelHeading {...p}>Repositories</PanelHeading>
				<PanelBlock>arachne</PanelBlock>
			</Panel>
		),
	},
	{ name: "PanelTabs", render: (p) => <PanelTabsExample {...p} /> },
	{ name: "PanelTab", render: (p) => <PanelTabExample {...p} /> },
	{ name: "PanelBlock", render: (p) => <PanelBlockExample {...p} /> },
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
	{ name: "Message", render: (p) => <MessageExample {...p} /> },
	{ name: "MessageHeader", render: (p) => <MessageHeaderExample {...p} /> },
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
					<Button size="sm" variant="ghost" onClick={action("Reply")}>
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
						<Button size="sm" onClick={action("New deploy")}>
							New deploy
						</Button>
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
			<BottomSheet {...p} open onClose={action("onClose")} title="Share project">
				Anyone with the link can view.
			</BottomSheet>
		),
	},
	{ name: "Banner", render: (p) => <BannerExample {...p} /> },
	{ name: "StatusDot", render: (p) => <StatusDot {...p} label="Online" tone="success" /> },
	{
		name: "PageHeader",
		render: (p) => (
			<PageHeader
				{...p}
				title="Deploys"
				description="Every push to a branch creates a deploy."
				actions={<Button onClick={action("New deploy")}>New deploy</Button>}
			/>
		),
	},
	{
		name: "UserButton",
		render: (p) => (
			<UserButton {...p} name="Ada Lovelace" email="ada@example.com" onClick={action("onClick")} />
		),
	},
	{ name: "ThemeToggle", render: (p) => <ThemeToggleExample {...p} /> },
	{ name: "ChoiceCard", render: (p) => <ChoiceCardExample {...p} /> },
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
	{ name: "ScrollSpy", render: (p) => <ScrollSpyExample {...p} /> },
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
	{ name: "LoadMore", render: (p) => <LoadMoreExample {...p} /> },
	{
		name: "ActivityItem",
		render: (p) => (
			<ActivityItem {...p} icon="git" title="Ada pushed 3 commits to main" meta="12 minutes ago" />
		),
	},
	{ name: "FilterBar", render: (p) => <FilterBarExample {...p} /> },
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
	{ name: "Burger", render: (p) => <BurgerExample {...p} /> },
	{ name: "ColorSwatch", render: (p) => <ColorSwatch {...p} color="#fca311" /> },
	{
		name: "VisuallyHidden",
		render: (p) => (
			<Button variant="ghost" onClick={action("★Add to favourites")}>
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
	{ name: "FileButton", render: (p) => <FileButtonExample {...p} /> },
	{ name: "Dropzone", render: (p) => <DropzoneExample {...p} /> },
	{ name: "Subnav", render: (p) => <SubnavExample {...p} /> },
	{ name: "Iconnav", render: (p) => <IconnavExample {...p} /> },
	{ name: "NavigationProgress", render: (p) => <NavigationProgress {...p} visible value={40} /> },
	{
		name: "NumberFormatter",
		render: (p) => <NumberFormatter {...p} value={1234567.891} decimalScale={2} />,
	},
];
