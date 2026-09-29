import {
	ActionIcon,
	Affix,
	Anchor,
	AppShell,
	AspectRatio,
	AvatarGroup,
	Badge,
	BarList,
	BottomNav,
	Box,
	Button,
	ButtonGroup,
	Center,
	Collapse,
	Comment,
	DataTable,
	DocExample,
	DocMenu,
	DocPage,
	Flex,
	FloatingActionButton,
	Group,
	Icon,
	Indicator,
	Label,
	Leader,
	List,
	ListGroup,
	ListGroupItem,
	ListItem,
	LoadingOverlay,
	Mark,
	Marquee,
	Meter,
	NavLink,
	Notification,
	Overlay,
	PasswordStrength,
	Progress,
	Quote,
	RingProgress,
	ScrollArea,
	Segmented,
	SidebarNav,
	SkipLink,
	SortableList,
	Space,
	Spinner,
	SplitButton,
	Splitter,
	Spoiler,
	Stack,
	Steps,
	Subtitle,
	Table,
	Text,
	Thumbnav,
	Timeline,
	TimelineItem,
	Title,
	ToggleGroup,
	UnstyledButton,
	YearPicker,
} from "../src/index.ts";
import { swatch } from "./placeholder.ts";
import type { Example } from "./types.ts";

const noop = () => {};
const sections = [
	{ id: "overview", label: "Overview" },
	{ id: "deploys", label: "Deploys" },
	{ id: "settings", label: "Settings" },
];

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	// display.tsx
	{ name: "Spinner", render: (p) => <Spinner {...p} label="Loading deploys" /> },
	{ name: "Progress", render: (p) => <Progress {...p} value={64} color="success" /> },
	{
		name: "Box",
		render: (p) => <Box {...p}>Boxes group related content on a raised surface.</Box>,
	},
	{
		name: "Table",
		render: (p) => (
			<Table {...p} striped fullwidth>
				<thead>
					<tr>
						<th scope="col">Project</th>
						<th scope="col">Status</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>marketing-site</td>
						<td>Ready</td>
					</tr>
					<tr>
						<td>docs</td>
						<td>Building</td>
					</tr>
				</tbody>
			</Table>
		),
	},
	// layout.tsx
	{
		name: "Label",
		render: (p) => (
			<Label {...p} for="project-name">
				Project name
			</Label>
		),
	},
	{
		name: "Text",
		render: (p) => (
			<Text {...p} muted>
				Last deployed 4 minutes ago by Ada.
			</Text>
		),
	},
	{
		name: "Stack",
		render: (p) => (
			<Stack {...p} gap="0.5rem">
				<Text>First</Text>
				<Text>Second</Text>
				<Text>Third</Text>
			</Stack>
		),
	},
	{
		name: "Badge",
		render: (p) => (
			<Badge {...p} tone="success">
				Active
			</Badge>
		),
	},
	// appshell.tsx
	{
		name: "AppShell",
		render: (p) => (
			<AppShell
				contentAs="div"
				{...p}
				header={<strong>Acme Console</strong>}
				sidebar={<SidebarNav label="Main" items={sections} value="deploys" />}
			>
				<Text>Main content</Text>
			</AppShell>
		),
	},
	{
		name: "SidebarNav",
		render: (p) => (
			<SidebarNav {...p} label="Project" items={sections} value="deploys" onChange={noop} />
		),
	},
	{
		name: "Segmented",
		render: (p) => (
			<Segmented
				{...p}
				label="Range"
				items={[
					{ id: "24h", label: "24h" },
					{ id: "7d", label: "7 days" },
					{ id: "30d", label: "30 days" },
				]}
				value="7d"
				onChange={noop}
			/>
		),
	},
	// steps.tsx
	{
		name: "Steps",
		render: (p) => (
			<Steps
				{...p}
				label="Checkout"
				items={[
					{ id: "cart", label: "Cart" },
					{ id: "shipping", label: "Shipping", description: "Address and method" },
					{ id: "payment", label: "Payment" },
				]}
				value="shipping"
			/>
		),
	},
	// doc-page.tsx / doc-menu.tsx
	{
		name: "DocPage",
		render: (p) => (
			<DocPage {...p} title="Buttons" description="Trigger an action or an event.">
				<Text>Page content goes here.</Text>
			</DocPage>
		),
	},
	{
		name: "DocExample",
		render: (p) => (
			<DocExample {...p} title="Primary button" code={"<Button>Save</Button>"}>
				<Button>Save</Button>
			</DocExample>
		),
	},
	{
		name: "DocMenu",
		render: (p) => (
			<DocMenu
				{...p}
				label="Documentation pages"
				sections={[
					{
						id: "start",
						label: "Getting started",
						items: [
							{ id: "install", label: "Installation" },
							{ id: "theming", label: "Theming" },
						],
					},
					{ id: "changelog", label: "Changelog" },
				]}
				defaultOpen={["start"]}
				value="install"
				onChange={noop}
			/>
		),
	},
	// widgets.tsx
	{
		name: "Group",
		render: (p) => (
			<Group {...p} gap="0.5rem">
				<Button variant="ghost">Cancel</Button>
				<Button>Save</Button>
			</Group>
		),
	},
	{
		name: "Center",
		render: (p) => (
			<Center style={{ "min-height": "6rem" }} {...p}>
				<Text muted>Centered on both axes</Text>
			</Center>
		),
	},
	{
		name: "Space",
		render: (p) => (
			<div>
				<Text>Above</Text>
				<Space {...p} h="1.5rem" />
				<Text>Below, 1.5rem later</Text>
			</div>
		),
	},
	{
		name: "Flex",
		render: (p) => (
			<Flex {...p} justify="space-between" align="center">
				<Text>Invoices</Text>
				<Button size="sm">Export</Button>
			</Flex>
		),
	},
	{
		name: "AspectRatio",
		render: (p) => (
			<AspectRatio style={{ "max-width": "20rem" }} {...p} ratio={16 / 9}>
				<img src={swatch(200, "16:9", 640, 360)} alt="16 by 9 placeholder" />
			</AspectRatio>
		),
	},
	{
		name: "Affix",
		render: (p) => (
			<Affix {...p} position="bottom-right" offset="1rem">
				<Button size="sm">Feedback</Button>
			</Affix>
		),
	},
	{
		name: "Overlay",
		render: (p) => (
			<Box style={{ position: "relative", "min-height": "6rem" }}>
				<Text>Content under the overlay</Text>
				<Overlay {...p} blur />
			</Box>
		),
	},
	{
		name: "LoadingOverlay",
		render: (p) => (
			<Box style={{ position: "relative", "min-height": "6rem" }}>
				<Text>Refreshing the deploy list…</Text>
				<LoadingOverlay {...p} visible label="Refreshing" />
			</Box>
		),
	},
	{
		name: "Indicator",
		render: (p) => (
			<Indicator {...p} label={3}>
				<Button variant="outline">Inbox</Button>
			</Indicator>
		),
	},
	{
		name: "List",
		render: (p) => (
			<List {...p}>
				<ListItem>Install the package</ListItem>
				<ListItem>Import the stylesheet</ListItem>
				<ListItem>Render your first component</ListItem>
			</List>
		),
	},
	{
		name: "ListItem",
		render: (p) => (
			<List ordered>
				<ListItem {...p}>Install the package</ListItem>
				<ListItem>Import the stylesheet</ListItem>
			</List>
		),
	},
	{
		name: "ListGroup",
		render: (p) => (
			<ListGroup {...p}>
				<ListGroupItem>Profile</ListGroupItem>
				<ListGroupItem>Security</ListGroupItem>
				<ListGroupItem>Notifications</ListGroupItem>
			</ListGroup>
		),
	},
	{
		name: "ListGroupItem",
		render: (p) => (
			<ListGroup>
				<ListGroupItem {...p}>Profile</ListGroupItem>
				<ListGroupItem>Security</ListGroupItem>
			</ListGroup>
		),
	},
	{
		name: "Timeline",
		render: (p) => (
			<Timeline {...p}>
				<TimelineItem title="Build started" bullet="play">
					09:41
				</TimelineItem>
				<TimelineItem title="Tests passed" bullet="check">
					09:43
				</TimelineItem>
				<TimelineItem title="Deployed to production" bullet="zap" active>
					09:44
				</TimelineItem>
			</Timeline>
		),
	},
	{
		name: "TimelineItem",
		render: (p) => (
			<Timeline>
				<TimelineItem {...p} title="Deployed to production" bullet="zap" active>
					09:44 by Ada
				</TimelineItem>
			</Timeline>
		),
	},
	{
		name: "NavLink",
		render: (p) => (
			<NavLink {...p} label="Deploys" description="History and logs" href="#deploys" active />
		),
	},
	{
		name: "ActionIcon",
		render: (p) => (
			<ActionIcon {...p} label="Edit project" variant="subtle">
				<Icon name="edit" />
			</ActionIcon>
		),
	},
	{
		name: "Collapse",
		render: (p) => (
			<Collapse {...p} open>
				<Text>Collapsible content animates its height when toggled.</Text>
			</Collapse>
		),
	},
	{
		name: "Spoiler",
		render: (p) => (
			<Spoiler {...p} maxHeight={48} showLabel="Show more" hideLabel="Show less">
				Arachne renders on the server and hydrates on the client without re-running component
				bodies. Signals track exactly which DOM nodes depend on which values, so updates touch only
				what changed. Components share one customization system for classes, styles and slots.
			</Spoiler>
		),
	},
	{
		name: "Mark",
		render: (p) => (
			<Text>
				Deploys run on <Mark {...p}>every push</Mark> to main.
			</Text>
		),
	},
	{
		name: "Quote",
		render: (p) => (
			<Quote {...p} cite="Grace Hopper">
				The most dangerous phrase in the language is “we've always done it this way.”
			</Quote>
		),
	},
	{
		name: "ScrollArea",
		render: (p) => (
			<ScrollArea {...p} maxHeight="6rem">
				<Stack gap="0.35rem">
					<Text>Deploy #128</Text>
					<Text>Deploy #127</Text>
					<Text>Deploy #126</Text>
					<Text>Deploy #125</Text>
					<Text>Deploy #124</Text>
					<Text>Deploy #123</Text>
				</Stack>
			</ScrollArea>
		),
	},
	{
		name: "Anchor",
		render: (p) => (
			<Anchor {...p} href="/docs">
				Read the docs
			</Anchor>
		),
	},
	{
		name: "Title",
		render: (p) => (
			<Title {...p} order={3}>
				Project settings
			</Title>
		),
	},
	{
		name: "Subtitle",
		render: (p) => <Subtitle {...p}>Manage domains, builds and access.</Subtitle>,
	},
	{ name: "RingProgress", render: (p) => <RingProgress {...p} value={72} label="72%" /> },
	// composite.tsx
	{
		name: "UnstyledButton",
		render: (p) => <UnstyledButton {...p}>Plain clickable text</UnstyledButton>,
	},
	{
		name: "ButtonGroup",
		render: (p) => (
			<ButtonGroup {...p} label="Text alignment">
				<Button variant="outline">Left</Button>
				<Button variant="outline">Center</Button>
				<Button variant="outline">Right</Button>
			</ButtonGroup>
		),
	},
	{
		name: "SplitButton",
		render: (p) => (
			<SplitButton
				{...p}
				label="Merge"
				caretLabel="More merge options"
				onClick={noop}
				menu={[
					{ label: "Squash and merge", onSelect: noop },
					{ label: "Rebase and merge", onSelect: noop },
				]}
			/>
		),
	},
	{
		name: "ToggleGroup",
		render: (p) => (
			<ToggleGroup
				{...p}
				label="Formatting"
				multiple
				items={[
					{ id: "bold", label: "Bold" },
					{ id: "italic", label: "Italic" },
					{ id: "underline", label: "Underline" },
				]}
				value={["bold"]}
				onChange={noop}
			/>
		),
	},
	{
		name: "AvatarGroup",
		render: (p) => (
			<AvatarGroup
				{...p}
				max={3}
				names={["Ada Lovelace", "Grace Hopper", "Alan Turing", "Linus Torvalds"]}
			/>
		),
	},
	{
		name: "Notification",
		render: (p) => (
			<Notification {...p} tone="info" title="New sign-in" onClose={noop}>
				Chrome on macOS, Berlin — just now.
			</Notification>
		),
	},
	{
		name: "FloatingActionButton",
		render: (p) => <FloatingActionButton {...p} label="New project" icon="plus" />,
	},
	{
		name: "BottomNav",
		render: (p) => (
			<BottomNav
				{...p}
				label="Primary"
				items={[
					{ id: "home", label: "Home", icon: "home" },
					{ id: "search", label: "Search", icon: "search" },
					{ id: "inbox", label: "Inbox", icon: "bell" },
				]}
				value="home"
				onChange={noop}
			/>
		),
	},
	{
		name: "SortableList",
		render: (p) => (
			<SortableList
				{...p}
				items={[
					{ id: "install", label: "Install" },
					{ id: "test", label: "Test" },
					{ id: "deploy", label: "Deploy" },
				]}
				onChange={noop}
			/>
		),
	},
	{ name: "PasswordStrength", render: (p) => <PasswordStrength {...p} password="correct horse" /> },
	{ name: "Meter", render: (p) => <Meter {...p} value={62} label="Disk usage" /> },
	{
		name: "Comment",
		render: (p) => (
			<Comment {...p} author="Ada Lovelace" meta="2h ago">
				Looks great — can we add a reduced-motion variant?
			</Comment>
		),
	},
	{
		name: "SkipLink",
		render: (p) => (
			<SkipLink {...p} href="#main">
				Skip to content (focus me)
			</SkipLink>
		),
	},
	{
		name: "Thumbnav",
		render: (p) => (
			<Thumbnav
				{...p}
				label="Photos"
				items={[
					{ id: "1", src: swatch(200, "1", 120, 80), alt: "Photo 1" },
					{ id: "2", src: swatch(150, "2", 120, 80), alt: "Photo 2" },
					{ id: "3", src: swatch(30, "3", 120, 80), alt: "Photo 3" },
				]}
				value="2"
				onChange={noop}
			/>
		),
	},
	{ name: "Leader", render: (p) => <Leader {...p} label="Espresso" value="$3.50" /> },
	{
		name: "Marquee",
		render: (p) => (
			<Marquee {...p} pauseOnHover>
				Arachne 2.4 · dark theme · 330+ components · SSR & hydration · full customization
			</Marquee>
		),
	},
	{
		name: "BarList",
		render: (p) => (
			<BarList
				{...p}
				data={[
					{ id: "home", label: "/", value: 4210 },
					{ id: "docs", label: "/docs", value: 2380 },
					{ id: "pricing", label: "/pricing", value: 912 },
				]}
			/>
		),
	},
	{
		name: "Splitter",
		render: (p) => (
			<Splitter
				style={{ height: "8rem" }}
				{...p}
				label="Resize panes"
				initial={40}
				left={<Text>Files</Text>}
				right={<Text>Editor</Text>}
			/>
		),
	},
	{
		name: "DataTable",
		render: (p) => (
			<DataTable
				{...p}
				label="Deploys"
				rows={[
					{ id: "128", branch: "main", duration: 102 },
					{ id: "127", branch: "feat/ui-kit", duration: 88 },
					{ id: "126", branch: "main", duration: 131 },
				]}
				columns={[
					{ id: "id", header: "Deploy", cell: (r: { id: string }) => `#${r.id}` },
					{ id: "branch", header: "Branch", cell: (r: { branch: string }) => r.branch },
					{
						id: "duration",
						header: "Duration",
						cell: (r: { duration: number }) => `${r.duration}s`,
						sortValue: (r: { duration: number }) => r.duration,
					},
				]}
			/>
		),
	},
	{ name: "YearPicker", render: (p) => <YearPicker {...p} value={2026} onChange={noop} /> },
];
