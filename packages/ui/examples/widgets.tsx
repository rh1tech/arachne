import { Show } from "@arachnejs/render";
import { effect, signal } from "@arachnejs/signals";
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
import { action } from "./actions.ts";
import { swatch } from "./placeholder.ts";
import type { Example, ExampleProps } from "./types.ts";

const sections = [
	{ id: "overview", label: "Overview" },
	{ id: "deploys", label: "Deploys" },
	{ id: "settings", label: "Settings" },
];

function AppShellExample(p: ExampleProps) {
	const page = signal("deploys");
	return (
		<AppShell
			contentAs="div"
			{...p}
			header={<strong>Acme Console</strong>}
			sidebar={<SidebarNav label="Main" items={sections} value={page()} onChange={page.set} />}
		>
			<Text>{sections.find((s) => s.id === page())?.label} page</Text>
		</AppShell>
	);
}

function SidebarNavExample(p: ExampleProps) {
	const page = signal("deploys");
	return <SidebarNav {...p} label="Project" items={sections} value={page()} onChange={page.set} />;
}

function SegmentedExample(p: ExampleProps) {
	const range = signal("7d");
	return (
		<Segmented
			{...p}
			label="Range"
			items={[
				{ id: "24h", label: "24h" },
				{ id: "7d", label: "7 days" },
				{ id: "30d", label: "30 days" },
			]}
			value={range()}
			onChange={range.set}
		/>
	);
}

function StepsExample(p: ExampleProps) {
	const step = signal("shipping");
	return (
		<Steps
			{...p}
			label="Checkout"
			items={[
				{ id: "cart", label: "Cart" },
				{ id: "shipping", label: "Shipping", description: "Address and method" },
				{ id: "payment", label: "Payment" },
			]}
			value={step()}
			onChange={step.set}
		/>
	);
}

function DocMenuExample(p: ExampleProps) {
	const page = signal("install");
	return (
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
			value={page()}
			onChange={page.set}
		/>
	);
}

function CollapseExample(p: ExampleProps) {
	const open = signal(true);
	return (
		<Stack gap="0.5rem">
			<Button size="sm" variant="outline" aria-expanded={open()} onClick={() => open.set(!open())}>
				{open() ? "Hide details" : "Show details"}
			</Button>
			<Collapse {...p} open={open()}>
				<Text>Collapsible content animates its height when toggled.</Text>
			</Collapse>
		</Stack>
	);
}

function LoadingOverlayExample(p: ExampleProps) {
	const loading = signal(true);
	const refresh = () => loading.set(true);
	// Pretend each refresh takes 1.5 s (effects run only in the browser).
	effect(() => {
		if (!loading()) return;
		const timer = setTimeout(() => loading.set(false), 1500);
		return () => clearTimeout(timer);
	});
	return (
		<Stack gap="0.5rem">
			<Box style={{ position: "relative", "min-height": "6rem" }}>
				<Text>Deploy list</Text>
				<LoadingOverlay {...p} visible={loading()} label="Refreshing" />
			</Box>
			<Button size="sm" variant="outline" onClick={refresh} disabled={loading()}>
				Refresh
			</Button>
		</Stack>
	);
}

function SplitButtonExample(p: ExampleProps) {
	const strategy = signal("Merge");
	const merged = signal("");
	return (
		<Stack gap="0.5rem">
			<SplitButton
				{...p}
				label={strategy()}
				caretLabel="More merge options"
				onClick={() => merged.set(`${strategy()} done`)}
				menu={[
					{ label: "Merge", onSelect: () => strategy.set("Merge") },
					{ label: "Squash and merge", onSelect: () => strategy.set("Squash and merge") },
					{ label: "Rebase and merge", onSelect: () => strategy.set("Rebase and merge") },
				]}
			/>
			<Text muted>{merged() || "Pick a strategy from the caret menu."}</Text>
		</Stack>
	);
}

function ToggleGroupExample(p: ExampleProps) {
	const formats = signal<string[]>(["bold"]);
	return (
		<ToggleGroup
			{...p}
			label="Formatting"
			multiple
			items={[
				{ id: "bold", label: "Bold" },
				{ id: "italic", label: "Italic" },
				{ id: "underline", label: "Underline" },
			]}
			value={formats()}
			onChange={(next) => formats.set(Array.isArray(next) ? next : next ? [next] : [])}
		/>
	);
}

function NotificationExample(p: ExampleProps) {
	const visible = signal(true);
	return (
		<Show
			when={visible()}
			fallback={
				<Button size="sm" variant="outline" onClick={() => visible.set(true)}>
					Show notification
				</Button>
			}
		>
			<Notification {...p} tone="info" title="New sign-in" onClose={() => visible.set(false)}>
				Chrome on macOS, Berlin — just now.
			</Notification>
		</Show>
	);
}

function BottomNavExample(p: ExampleProps) {
	const tab = signal("home");
	return (
		<BottomNav
			{...p}
			label="Primary"
			items={[
				{ id: "home", label: "Home", icon: "home" },
				{ id: "search", label: "Search", icon: "search" },
				{ id: "inbox", label: "Inbox", icon: "bell" },
			]}
			value={tab()}
			onChange={tab.set}
		/>
	);
}

function SortableListExample(p: ExampleProps) {
	const steps = signal([
		{ id: "install", label: "Install" },
		{ id: "test", label: "Test" },
		{ id: "deploy", label: "Deploy" },
	]);
	return <SortableList {...p} items={steps()} onChange={steps.set} />;
}

function YearPickerExample(p: ExampleProps) {
	const year = signal(2026);
	return (
		<>
			<YearPicker {...p} value={year()} onChange={year.set} />
			<Text muted>Selected: {year()}</Text>
		</>
	);
}

function DataTableExample(p: ExampleProps) {
	const selected = signal<string[]>([]);
	return (
		<>
			<DataTable
				{...p}
				label="Deploys"
				rows={[
					{ id: "128", branch: "main", duration: 102 },
					{ id: "127", branch: "feat/ui-kit", duration: 88 },
					{ id: "126", branch: "main", duration: 131 },
				]}
				columns={[
					{ id: "id", header: "Deploy", cell: (r: { id: string }) => `#${r.id}`, width: "7rem" },
					{
						id: "branch",
						header: "Branch",
						cell: (r: { branch: string }) => r.branch,
						width: "2fr",
					},
					{
						id: "duration",
						header: "Duration",
						cell: (r: { duration: number }) => `${r.duration}s`,
						sortValue: (r: { duration: number }) => r.duration,
						align: "end",
					},
				]}
				selectable
				selected={selected()}
				onSelectionChange={selected.set}
				selectionLabel={(r: { id: string }) => `Select deploy #${r.id}`}
				rowHref={(r: { id: string }) => `#deploy-${r.id}`}
				stack
			/>
			<Text muted>Selected: {selected().length ? selected().join(", ") : "none"}</Text>
		</>
	);
}

/** The link is invisible until focused: Tab into the box, or use the button. */
function SkipLinkPreview(p: ExampleProps) {
	let link: HTMLAnchorElement | undefined;
	return (
		<Box style={{ position: "relative", "padding-top": "3rem" }}>
			<SkipLink
				{...p}
				href="#main"
				ref={(el: HTMLElement) => {
					link = el as HTMLAnchorElement;
				}}
			>
				Skip to content
			</SkipLink>
			<Group gap="0.75rem">
				<Button size="sm" variant="outline" onClick={() => link?.focus()}>
					Reveal the skip link
				</Button>
				<Text muted>It appears only while focused — keyboard users meet it first on Tab.</Text>
			</Group>
		</Box>
	);
}

function ThumbnavExample(p: ExampleProps) {
	const photos = [
		{ id: "lake", src: swatch(200, "Lake", 640, 400), alt: "Lake at dawn" },
		{ id: "forest", src: swatch(140, "Forest", 640, 400), alt: "Forest trail" },
		{ id: "desert", src: swatch(30, "Desert", 640, 400), alt: "Desert dunes" },
		{ id: "city", src: swatch(260, "City", 640, 400), alt: "City at night" },
	];
	const photo = signal("forest");
	const current = () => photos.find((ph) => ph.id === photo()) ?? photos[0];
	return (
		<Stack gap="0.75rem" style={{ "max-width": "24rem" }}>
			<img
				src={current()?.src}
				alt={current()?.alt}
				width="640"
				height="400"
				style={{ width: "100%", height: "auto", "border-radius": "var(--a-radius)" }}
			/>
			<Thumbnav {...p} label="Photos" items={photos} value={photo()} onChange={photo.set} />
		</Stack>
	);
}

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
	{ name: "AppShell", render: (p) => <AppShellExample {...p} /> },
	{ name: "SidebarNav", render: (p) => <SidebarNavExample {...p} /> },
	{ name: "Segmented", render: (p) => <SegmentedExample {...p} /> },
	// steps.tsx
	{ name: "Steps", render: (p) => <StepsExample {...p} /> },
	// doc-page.tsx / doc-menu.tsx
	{
		name: "DocPage",
		render: (p) => (
			<DocPage {...p} title="Buttons" titleOrder={4} description="Trigger an action or an event.">
				<Text>Page content goes here.</Text>
			</DocPage>
		),
	},
	{
		name: "DocExample",
		render: (p) => (
			<DocExample {...p} title="Primary button" titleOrder={4} code={"<Button>Save</Button>"}>
				<Button onClick={action("Save")}>Save</Button>
			</DocExample>
		),
	},
	{ name: "DocMenu", render: (p) => <DocMenuExample {...p} /> },
	// widgets.tsx
	{
		name: "Group",
		render: (p) => (
			<Group {...p} gap="0.5rem">
				<Button variant="ghost" onClick={action("Cancel")}>
					Cancel
				</Button>
				<Button onClick={action("Save")}>Save</Button>
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
				<Button size="sm" onClick={action("Export")}>
					Export
				</Button>
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
				<Button size="sm" onClick={action("Feedback")}>
					Feedback
				</Button>
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
	{ name: "LoadingOverlay", render: (p) => <LoadingOverlayExample {...p} /> },
	{
		name: "Indicator",
		render: (p) => (
			<Indicator {...p} label={3}>
				<Button variant="outline" onClick={action("Inbox")}>
					Inbox
				</Button>
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
			<ActionIcon {...p} label="Edit project" variant="subtle" onClick={action("edit")}>
				<Icon name="edit" />
			</ActionIcon>
		),
	},
	{ name: "Collapse", render: (p) => <CollapseExample {...p} /> },
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
			<Stack gap="1rem">
				<Quote {...p} cite="Grace Hopper">
					The most dangerous phrase in the language is “we've always done it this way.”
				</Quote>
				<Quote variant="plain" cite="Alan Kay">
					The best way to predict the future is to invent it.
				</Quote>
			</Stack>
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
		render: (p) => (
			<UnstyledButton {...p} onClick={action("click")}>
				Plain clickable text
			</UnstyledButton>
		),
	},
	{
		name: "ButtonGroup",
		render: (p) => (
			<ButtonGroup {...p} label="Text alignment">
				<Button variant="outline" onClick={action("Left")}>
					Left
				</Button>
				<Button variant="outline" onClick={action("Center")}>
					Center
				</Button>
				<Button variant="outline" onClick={action("Right")}>
					Right
				</Button>
			</ButtonGroup>
		),
	},
	{ name: "SplitButton", render: (p) => <SplitButtonExample {...p} /> },
	{ name: "ToggleGroup", render: (p) => <ToggleGroupExample {...p} /> },
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
	{ name: "Notification", render: (p) => <NotificationExample {...p} /> },
	{
		name: "FloatingActionButton",
		render: (p) => (
			<FloatingActionButton
				{...p}
				label="New project"
				icon="plus"
				onClick={action("new project")}
			/>
		),
	},
	{ name: "BottomNav", render: (p) => <BottomNavExample {...p} /> },
	{ name: "SortableList", render: (p) => <SortableListExample {...p} /> },
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
		render: (p) => <SkipLinkPreview {...p} />,
	},
	{ name: "Thumbnav", render: (p) => <ThumbnavExample {...p} /> },
	{ name: "Leader", render: (p) => <Leader {...p} label="Espresso" value="$3.50" /> },
	{
		name: "Marquee",
		render: (p) => (
			<Stack gap="0.75rem">
				<Marquee {...p} pauseOnHover>
					Arachne 2.4 · dark theme · 330+ components · SSR & hydration · full customization
				</Marquee>
				<Marquee variant="plain" speed="slow">
					Acme · Globex · Initech · Umbrella · Hooli · Stark Industries
				</Marquee>
			</Stack>
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
	{ name: "DataTable", render: (p) => <DataTableExample {...p} /> },
	{ name: "YearPicker", render: (p) => <YearPickerExample {...p} /> },
];
