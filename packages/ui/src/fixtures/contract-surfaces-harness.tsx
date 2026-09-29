import {
	ActivityItem,
	Article,
	ArticleMeta,
	ArticleTitle,
	BackgroundImage,
	Banner,
	BeforeAfter,
	Block,
	BottomSheet,
	Burger,
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
	Content,
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
	Section,
	StatusDot,
	Sticky,
	Subnav,
	ThemeToggle,
	Tile,
	TypingIndicator,
	UserButton,
	VisuallyHidden,
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const noop = () => {};

/** Every exported component of the surfaces group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	// surfaces.tsx
	{ name: "Card", render: (p) => <Card {...p}>c</Card> },
	{ name: "CardHeader", render: (p) => <CardHeader {...p}>h</CardHeader> },
	{ name: "CardHeaderTitle", render: (p) => <CardHeaderTitle {...p}>t</CardHeaderTitle> },
	{ name: "CardImage", render: (p) => <CardImage {...p}>i</CardImage> },
	{ name: "CardContent", render: (p) => <CardContent {...p}>c</CardContent> },
	{ name: "CardFooter", render: (p) => <CardFooter {...p}>f</CardFooter> },
	{ name: "CardFooterItem", render: (p) => <CardFooterItem {...p}>f</CardFooterItem> },
	{ name: "Panel", render: (p) => <Panel {...p}>p</Panel> },
	{ name: "PanelHeading", render: (p) => <PanelHeading {...p}>h</PanelHeading> },
	{ name: "PanelTabs", render: (p) => <PanelTabs {...p}>t</PanelTabs> },
	{ name: "PanelTab", render: (p) => <PanelTab {...p}>t</PanelTab> },
	{
		name: "PanelBlock",
		render: (p) => (
			<PanelBlock {...p} onClick={noop}>
				b
			</PanelBlock>
		),
	},
	{ name: "Tile", render: (p) => <Tile {...p}>t</Tile> },
	{
		name: "Message",
		render: (p) => (
			<Message {...p} tone="info">
				m
			</Message>
		),
	},
	{
		name: "MessageHeader",
		render: (p) => (
			<MessageHeader {...p} onClose={noop}>
				h
			</MessageHeader>
		),
	},
	{ name: "MessageBody", render: (p) => <MessageBody {...p}>b</MessageBody> },
	{ name: "Block", render: (p) => <Block {...p}>b</Block> },
	{ name: "Content", render: (p) => <Content {...p}>c</Content> },
	{ name: "Paper", render: (p) => <Paper {...p}>p</Paper> },
	// chrome.tsx
	{ name: "Hero", render: (p) => <Hero {...p}>h</Hero> },
	{ name: "HeroHead", render: (p) => <HeroHead {...p}>h</HeroHead> },
	{ name: "HeroBody", render: (p) => <HeroBody {...p}>b</HeroBody> },
	{ name: "HeroFoot", render: (p) => <HeroFoot {...p}>f</HeroFoot> },
	{ name: "Footer", render: (p) => <Footer {...p}>f</Footer> },
	{ name: "Media", render: (p) => <Media {...p}>m</Media> },
	{ name: "MediaLeft", render: (p) => <MediaLeft {...p}>l</MediaLeft> },
	{ name: "MediaContent", render: (p) => <MediaContent {...p}>c</MediaContent> },
	{ name: "MediaRight", render: (p) => <MediaRight {...p}>r</MediaRight> },
	{ name: "Article", render: (p) => <Article {...p}>a</Article> },
	{ name: "ArticleTitle", render: (p) => <ArticleTitle {...p}>t</ArticleTitle> },
	{ name: "ArticleMeta", render: (p) => <ArticleMeta {...p}>m</ArticleMeta> },
	{
		name: "Figure",
		render: (p) => (
			<Figure {...p} caption="c">
				f
			</Figure>
		),
	},
	{ name: "Image", render: (p) => <Image {...p} src="/x.png" alt="x" radius={6} /> },
	// grid.tsx
	{
		name: "Columns",
		render: (p) => (
			<Columns {...p} gap="1rem">
				c
			</Columns>
		),
	},
	{
		name: "Column",
		render: (p) => (
			<Column {...p} size={6}>
				c
			</Column>
		),
	},
	{
		name: "Grid",
		render: (p) => (
			<Grid {...p} cols={3}>
				g
			</Grid>
		),
	},
	{
		name: "GridItem",
		render: (p) => (
			<GridItem {...p} span={2}>
				g
			</GridItem>
		),
	},
	{ name: "Container", render: (p) => <Container {...p}>c</Container> },
	{ name: "Section", render: (p) => <Section {...p}>s</Section> },
	{ name: "Level", render: (p) => <Level {...p}>l</Level> },
	{ name: "LevelLeft", render: (p) => <LevelLeft {...p}>l</LevelLeft> },
	{ name: "LevelRight", render: (p) => <LevelRight {...p}>r</LevelRight> },
	{ name: "LevelItem", render: (p) => <LevelItem {...p}>i</LevelItem> },
	// patterns.tsx
	{
		name: "BottomSheet",
		host: "panel",
		render: (p) => (
			<BottomSheet {...p} open onClose={noop} title="Sheet">
				s
			</BottomSheet>
		),
	},
	{
		name: "Banner",
		render: (p) => (
			<Banner {...p} title="t">
				b
			</Banner>
		),
	},
	{ name: "StatusDot", render: (p) => <StatusDot {...p} label="Online" tone="success" /> },
	{ name: "PageHeader", render: (p) => <PageHeader {...p} title="Title" /> },
	{ name: "UserButton", render: (p) => <UserButton {...p} name="Ada Lovelace" /> },
	{ name: "ThemeToggle", render: (p) => <ThemeToggle {...p} value="light" onChange={noop} /> },
	{
		name: "ChoiceCard",
		render: (p) => <ChoiceCard {...p} checked={false} label="Pro" onChange={noop} />,
	},
	{
		name: "ChatBubble",
		render: (p) => (
			<ChatBubble {...p} from="me">
				hi
			</ChatBubble>
		),
	},
	{ name: "TypingIndicator", render: (p) => <TypingIndicator {...p} /> },
	{ name: "JsonViewer", render: (p) => <JsonViewer {...p} value={{ a: 1 }} /> },
	{ name: "RelativeTime", render: (p) => <RelativeTime {...p} value={Date.now() - 60_000} /> },
	{ name: "CountUp", render: (p) => <CountUp {...p} value={10} duration={0} /> },
	{
		name: "ScrollSpy",
		render: (p) => <ScrollSpy {...p} items={[{ id: "intro", label: "Intro" }]} />,
	},
	{ name: "BeforeAfter", render: (p) => <BeforeAfter {...p} before="/a.png" after="/b.png" /> },
	{ name: "LoadMore", render: (p) => <LoadMore {...p} onLoad={noop} /> },
	{ name: "ActivityItem", render: (p) => <ActivityItem {...p} title="Deployed" /> },
	{ name: "FilterBar", render: (p) => <FilterBar {...p}>f</FilterBar> },
	{ name: "Masonry", render: (p) => <Masonry {...p}>m</Masonry> },
	// overlays-extra.tsx
	{
		name: "HoverCard",
		render: (p) => (
			<HoverCard {...p} dropdown="more">
				target
			</HoverCard>
		),
	},
	{ name: "Burger", render: (p) => <Burger {...p} /> },
	{ name: "ColorSwatch", render: (p) => <ColorSwatch {...p} color="#fca311" /> },
	{ name: "VisuallyHidden", render: (p) => <VisuallyHidden {...p}>hidden</VisuallyHidden> },
	{ name: "Highlight", render: (p) => <Highlight {...p} text="hello world" highlight="world" /> },
	{
		name: "BackgroundImage",
		render: (p) => (
			<BackgroundImage {...p} src="/bg.png">
				b
			</BackgroundImage>
		),
	},
	{
		name: "Sticky",
		render: (p) => (
			<Sticky {...p} offset={8}>
				s
			</Sticky>
		),
	},
	// files-nav.tsx
	{ name: "FileButton", render: (p) => <FileButton {...p} onChange={noop} /> },
	{ name: "Dropzone", render: (p) => <Dropzone {...p} onDrop={noop} /> },
	{
		name: "Subnav",
		render: (p) => <Subnav {...p} value="a" onChange={noop} items={[{ id: "a", label: "A" }]} />,
	},
	{
		name: "Iconnav",
		render: (p) => (
			<Iconnav {...p} value="a" items={[{ id: "a", icon: "bell", label: "Alerts" }]} />
		),
	},
	{ name: "NavigationProgress", render: (p) => <NavigationProgress {...p} visible value={40} /> },
	{
		name: "NumberFormatter",
		render: (p) => <NumberFormatter {...p} value={1234.5} decimalScale={2} />,
	},
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
