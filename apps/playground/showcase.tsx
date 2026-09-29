import { Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import {
	Alert,
	applyPalette,
	applyRadius,
	Badge,
	Box,
	Breadcrumb,
	Button,
	Card,
	CardContent,
	CardFooter,
	CardFooterItem,
	CardHeader,
	CardHeaderTitle,
	Checkbox,
	CheckboxGroup,
	Column,
	Columns,
	Container,
	createNavbarController,
	DataTable,
	DocExample,
	type DocMenuSection,
	DocPage,
	Drawer,
	Fieldset,
	FormField,
	FormSection,
	Group,
	Hero,
	HeroBody,
	Icon,
	IconBadge,
	Image,
	Level,
	LevelItem,
	LevelLeft,
	LevelRight,
	Menu,
	Message,
	MessageBody,
	MessageHeader,
	Modal,
	Navbar,
	type NavMenuItem,
	Pagination,
	type PaletteName,
	Panel,
	PanelBlock,
	PanelHeading,
	Paper,
	PasswordInput,
	Progress,
	paletteStyle,
	palettes,
	RadioGroup,
	type RadiusName,
	radii,
	resolvePalette,
	Section,
	Select,
	Stack,
	Subtitle,
	Switch,
	Table,
	Tabs,
	Tag,
	Tags,
	Text,
	TextArea,
	TextInput,
	Title,
} from "@arachne/ui";
import { CATALOG_PREFIX, CatalogPage, ComponentReference, catalogSections } from "./catalog.tsx";

export const showcaseSections: DocMenuSection[] = [
	{ id: "overview", label: "Overview" },
	{ id: "palette", label: "Palette" },
	{
		id: "elements",
		label: "Elements",
		items: [
			{ id: "button", label: "Button" },
			{ id: "box", label: "Box" },
			{ id: "tag", label: "Tag" },
			{ id: "badge", label: "Badge" },
			{ id: "progress", label: "Progress" },
			{ id: "notification", label: "Notification" },
			{ id: "icon", label: "Icon" },
			{ id: "title", label: "Title" },
			{ id: "table", label: "Table" },
			{ id: "image", label: "Image" },
		],
	},
	{
		id: "components",
		label: "Components",
		items: [
			{ id: "breadcrumb", label: "Breadcrumb" },
			{ id: "card", label: "Card" },
			{ id: "dropdown", label: "Drawer" },
			{ id: "menu", label: "Menu" },
			{ id: "message", label: "Message" },
			{ id: "modal", label: "Modal" },
			{ id: "navbar", label: "Navbar" },
			{ id: "pagination", label: "Pagination" },
			{ id: "panel", label: "Panel" },
			{ id: "tabs", label: "Tabs" },
		],
	},
	{
		id: "form",
		label: "Form",
		items: [
			{ id: "form-complete", label: "Complete form" },
			{ id: "form-layouts", label: "Form layouts" },
			{ id: "input", label: "Input" },
			{ id: "textarea", label: "Textarea" },
			{ id: "select", label: "Select" },
			{ id: "checkbox", label: "Checkbox" },
			{ id: "radio", label: "Radio" },
			{ id: "switch", label: "Switch" },
		],
	},
	{
		id: "layout",
		label: "Layout",
		items: [
			{ id: "columns", label: "Columns" },
			{ id: "container", label: "Container" },
			{ id: "hero", label: "Hero" },
			{ id: "level", label: "Level" },
			{ id: "section", label: "Section" },
		],
	},
	// Generated reference: every other component, by category (see catalog.tsx).
	...catalogSections,
];

export function flatShowcaseOptions(): Array<{ id: string; label: string }> {
	const out: Array<{ id: string; label: string }> = [];
	for (const section of showcaseSections) {
		if (section.items?.length) {
			for (const item of section.items) out.push(item);
		} else {
			out.push({ id: section.id, label: section.label });
		}
	}
	return out;
}

const loadPct = signal(42);
const page = signal(3);
const modalOpen = signal(false);
const drawerOpen = signal(false);
const tab = signal("jsx");
const tabOverflow = signal("overview");
const tabOverflowItems = [
	{ id: "overview", label: "Overview" },
	{ id: "jsx", label: "JSX" },
	{ id: "signals", label: "Signals" },
	{ id: "forms", label: "Forms" },
	{ id: "routing", label: "Routing" },
	{ id: "ssr", label: "SSR" },
	{ id: "islands", label: "Islands" },
	{ id: "testing", label: "Testing" },
	{ id: "tooling", label: "Tooling" },
	{ id: "deploy", label: "Deploy" },
	{ id: "a11y", label: "Accessibility" },
	{ id: "perf", label: "Performance" },
];
const checked = signal(true);
const switched = signal(false);
const textVal = signal("");
const selectVal = signal("engineer");
const radioVal = signal("email");
const checkGroup = signal<string[]>(["tsx"]);
const msgInfo = signal(true);
const msgDanger = signal(true);
const menuOpen = signal(false);
const navTrigger = signal<"hover" | "click">("click");
const navCtrl = createNavbarController();
const navCtrlOverflow = createNavbarController();
const btnLoading = signal(false);
const formName = signal("");
const formEmail = signal("");
const formRole = signal("engineer");
const formBio = signal("");
const formNotify = signal(true);
const formPlan = signal("pro");
const formPassword = signal("");
const formSubmitted = signal("");
const activePalette = signal<PaletteName>("graphite");
const activeRadius = signal<RadiusName>("sm");

const paletteMeta: Record<PaletteName, { title: string; blurb: string }> = {
	graphite: {
		title: "Graphite",
		blurb: "Default — soft neutrals, navy primary, muted emerald / amber / rose accents.",
	},
	sky: { title: "Sky", blurb: "Clear material blues from pale ice to deep navy." },
	meadow: { title: "Meadow", blurb: "Fresh greens on pale mint." },
	sage: { title: "Sage", blurb: "Warm parchment with muted botanical greens." },
	citrus: { title: "Citrus", blurb: "Amber → orange → flame gradient energy." },
	blush: { title: "Blush", blurb: "Peach canvas with berry accent." },
	aqua: { title: "Aqua", blurb: "Mint foam with electric aqua accent." },
	twilight: { title: "Twilight", blurb: "Teal wash into indigo and plum." },
	clay: { title: "Clay", blurb: "Terracotta on warm paper." },
	ember: { title: "Ember", blurb: "Clay + saffron + teal." },
	forest: { title: "Forest", blurb: "Deep pine on soft peach mist." },
	festiva: { title: "Festiva", blurb: "Magenta, gold, and electric blue punches." },
	olive: { title: "Olive", blurb: "Cream paper with olive leaf accent." },
	marina: { title: "Marina", blurb: "Coastal blue with coral and gold." },
	lime: { title: "Lime", blurb: "Chartreuse greens and sunny yellows." },
	apricot: { title: "Apricot", blurb: "Warm peach stack with brick accent." },
	daybreak: { title: "Daybreak", blurb: "Sky cyan, indigo, and sunrise gold." },
	tide: { title: "Tide", blurb: "Teal depths with orange spark." },
	confetti: { title: "Confetti", blurb: "Slate, mint, lemon, and pink." },
	lilac: { title: "Lilac", blurb: "Violet neon on lemon ice." },
	reef: { title: "Reef", blurb: "Seafoam teal with amber signal." },
	mustard: { title: "Mustard", blurb: "Chartreuse field under navy ink." },
	pop: { title: "Pop", blurb: "Cyan, cream, orange, and signal red." },
	plum: { title: "Plum", blurb: "Graphite canvas with wine accent." },
	harvest: { title: "Harvest", blurb: "Olive, straw, and autumn orange." },
	harbor: { title: "Harbor", blurb: "Soft canvas, teal wash, deep blue accent." },
	moss: { title: "Moss", blurb: "Forest green on straw with amber." },
	orchid: { title: "Orchid", blurb: "Blush canvas, periwinkle, electric blue." },
	lagoon: { title: "Lagoon", blurb: "Cool mint paper with lagoon accent." },
	grove: { title: "Grove", blurb: "Lime mist with deep magenta ink." },
	neon: { title: "Neon", blurb: "High-voltage orange on lemon with mint." },
	rose: { title: "Rose", blurb: "Soft pinks with forest green ink." },
};

const navActive = signal("docs");
const navOverflowActive = signal("overview");

/** Marks the chosen item active (recursively) so the demos respond to clicks. */
function withActive(
	items: NavMenuItem[],
	active: () => string,
	choose: (id: string) => void,
): NavMenuItem[] {
	return items.map((item) =>
		item.children
			? {
					...item,
					active: item.children.some((c) => c.id === active()),
					children: withActive(item.children, active, choose),
				}
			: { ...item, active: item.id === active(), onSelect: () => choose(item.id) },
	);
}

const navItems = (): NavMenuItem[] =>
	withActive(
		[
			{
				id: "product",
				label: "Product",
				children: [
					{ id: "signals", label: "Signals" },
					{ id: "jsx", label: "JSX" },
				],
			},
			{ id: "docs", label: "Docs" },
		],
		navActive,
		navActive.set,
	);

const navOverflowItems = (): NavMenuItem[] =>
	withActive(
		[
			{ id: "overview", label: "Overview" },
			{ id: "components", label: "Components" },
			{ id: "patterns", label: "Patterns" },
			{ id: "forms", label: "Forms" },
			{ id: "layout", label: "Layout" },
			{ id: "feedback", label: "Feedback" },
			{ id: "navigation", label: "Navigation" },
			{ id: "data", label: "Data display" },
			{ id: "overlays", label: "Overlays" },
			{ id: "utils", label: "Utilities" },
			{ id: "theming", label: "Theming" },
		],
		navOverflowActive,
		navOverflowActive.set,
	);

const tagVisible = signal(true);
const crumbTrail = ["Arachne", "Docs", "Breadcrumb"];
const crumbDepth = signal(crumbTrail.length - 1);
const layoutRole = signal("engineer");
const layoutDigests = signal(true);
const layoutPush = signal(false);

export function ShowcaseContent(props: { page: string }) {
	effect(() => {
		props.page;
		const main = document.querySelector(".docs-main");
		if (main instanceof HTMLElement) main.scrollTop = 0;
		window.scrollTo(0, 0);
	});

	return (
		<Show when={props.page} fallback={null}>
			{(id: string) => renderShowcasePage(id)}
		</Show>
	);
}

/** Showcase pages by id (the sidebar / select value). */
const SHOWCASE_PAGES: Record<string, () => unknown> = {
	overview: () => (
		<DocPage
			title="Overview"
			description="Arachne UI is a full component kit built with Arachne JSX and signals. Pick a component in the sidebar — each page shows a short description, a live example, and the matching code."
		>
			<DocExample
				title="Quick start"
				description="Import primitives and the token stylesheet."
				code={`import { Button, Card, Stack, applyPalette } from "@arachne/ui";
import "@arachne/ui/styles.css";

applyPalette("graphite");

<Stack gap="1rem">
  <Button>Primary</Button>
  <Card>Hello</Card>
</Stack>`}
			>
				<Stack gap="0.75rem">
					<Group gap="0.5rem">
						<Button>Primary</Button>
						<Button variant="ghost">Ghost</Button>
						<Badge>v0</Badge>
					</Group>
					<Text muted>Default theme is Graphite. Open Palette for 30+ named presets.</Text>
				</Stack>
			</DocExample>
		</DocPage>
	),
	palette: () => (
		<DocPage
			title="Palette"
			description="Thirty-plus named presets. Graphite is the kit default; override any --a-* token for a custom brand."
		>
			<DocExample
				title="Apply a preset"
				description="Writes --a-* variables on :root. Scoped theming uses paletteStyle on a subtree."
				code={`import { applyPalette, applyRadius, paletteStyle } from "@arachne/ui";

applyPalette("graphite"); // default
applyPalette("marina");
applyRadius("sm"); // none | sm | lg — sm is default
applyPalette({ accent: "#0ea5e9", canvas: "#f8fafc", radius: "lg" });

<div style={paletteStyle("lagoon")}>Scoped theme</div>`}
			>
				<Stack gap="1rem">
					<Text muted>
						Active: <strong>{paletteMeta[activePalette()].title}</strong> —{" "}
						{paletteMeta[activePalette()].blurb}
					</Text>
					<div class="a-palette-grid">
						{(Object.keys(palettes) as PaletteName[]).map((name) => {
							const tokens = resolvePalette(name);
							const selected = () => activePalette() === name;
							return (
								<button
									type="button"
									class={selected() ? "a-palette-card a-palette-card-active" : "a-palette-card"}
									onClick={() => {
										activePalette.set(name);
										applyPalette(name);
										applyRadius(activeRadius());
									}}
								>
									<div class="a-palette-swatches" aria-hidden="true">
										<span style={`background:${tokens.canvas}`} />
										<span style={`background:${tokens.accentSoft ?? tokens.info}`} />
										<span style={`background:${tokens.accent}`} />
										<span style={`background:${tokens.ink}`} />
									</div>
									<span class="a-palette-card-title">{paletteMeta[name].title}</span>
									<span class="a-palette-card-blurb">{paletteMeta[name].blurb}</span>
								</button>
							);
						})}
					</div>
					<Stack gap="0.5rem">
						<Text muted>
							Corner radius: <strong>{activeRadius()}</strong> ({radii[activeRadius()]})
						</Text>
						<Group gap="0.5rem" wrap>
							{(["none", "sm", "lg"] as RadiusName[]).map((scale) => (
								<Button
									variant={activeRadius() === scale ? "solid" : "ghost"}
									size="sm"
									onClick={() => {
										activeRadius.set(scale);
										applyRadius(scale);
									}}
								>
									{scale}
								</Button>
							))}
						</Group>
					</Stack>
					<Group gap="0.5rem" wrap>
						<Button>Accent</Button>
						<Button variant="success">Success</Button>
						<Button variant="warning">Warning</Button>
						<Button variant="danger">Danger</Button>
						<Tag color="info">Info</Tag>
						<Tag color="success">Success</Tag>
						<Badge>12</Badge>
					</Group>
					<div style={paletteStyle("lagoon")}>
						<Box>
							<Text muted>Scoped lagoon island (does not change the page chrome).</Text>
							<Group gap="0.5rem">
								<Button size="sm">Lagoon button</Button>
								<Tag color="primary">Accent</Tag>
							</Group>
						</Box>
					</div>
				</Stack>
			</DocExample>
		</DocPage>
	),
	button: () => (
		<DocPage
			title="Button"
			description="The classic button, in different colors, sizes, and states."
		>
			<DocExample
				title="Colors"
				code={`<Button>Primary</Button>
<Button variant="default">Default</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="success">Success</Button>
<Button variant="warning">Warning</Button>
<Button variant="danger">Danger</Button>`}
			>
				<Group gap="0.5rem" wrap>
					<Button>Primary</Button>
					<Button variant="default">Default</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="success">Success</Button>
					<Button variant="warning">Warning</Button>
					<Button variant="danger">Danger</Button>
				</Group>
			</DocExample>
			<DocExample
				title="Sizes"
				code={`<Button size="sm">Small</Button>
<Button>Normal</Button>
<Button size="lg">Large</Button>`}
			>
				<Group gap="0.5rem" wrap>
					<Button size="sm">Small</Button>
					<Button>Normal</Button>
					<Button size="lg">Large</Button>
				</Group>
			</DocExample>
			<DocExample
				title="States"
				code={`<Button disabled>Disabled</Button>
<Button loading>Loading</Button>`}
			>
				<Group gap="0.5rem" wrap>
					<Button disabled>Disabled</Button>
					<Button
						loading={btnLoading()}
						onClick={() => {
							btnLoading.set(true);
							setTimeout(() => btnLoading.set(false), 1200);
						}}
					>
						Click to load
					</Button>
				</Group>
			</DocExample>
		</DocPage>
	),
	box: () => (
		<DocPage
			title="Box"
			description="A bordered white box for grouping content. Paper is a softer surface without a hard edge."
		>
			<DocExample
				code={`<Box>
  <Title size={5}>Box</Title>
  <Text muted>A simple container for grouping elements.</Text>
</Box>

<Paper withBorder>
  <Text muted>Paper is a quieter surface variant.</Text>
</Paper>`}
			>
				<Stack gap="0.75rem">
					<Box>
						<Title size={5}>Box</Title>
						<Text muted>A simple container for grouping elements.</Text>
					</Box>
					<Paper withBorder>
						<Text muted>Paper is a quieter surface variant.</Text>
					</Paper>
				</Stack>
			</DocExample>
		</DocPage>
	),
	tag: () => (
		<DocPage
			title="Tag"
			description="Small colored labels for categories and filters. Prefer Badge for compact counts."
		>
			<DocExample
				title="Colors"
				code={`<Tags>
  <Tag color="black">Black</Tag>
  <Tag color="dark">Dark</Tag>
  <Tag color="light">Light</Tag>
  <Tag color="primary">Primary</Tag>
  <Tag color="link">Link</Tag>
  <Tag color="info">Info</Tag>
  <Tag color="success">Success</Tag>
  <Tag color="warning">Warning</Tag>
  <Tag color="danger">Danger</Tag>
</Tags>`}
			>
				<Tags>
					<Tag color="black">Black</Tag>
					<Tag color="dark">Dark</Tag>
					<Tag color="light">Light</Tag>
					<Tag color="white">White</Tag>
					<Tag color="primary">Primary</Tag>
					<Tag color="link">Link</Tag>
					<Tag color="info">Info</Tag>
					<Tag color="success">Success</Tag>
					<Tag color="warning">Warning</Tag>
					<Tag color="danger">Danger</Tag>
				</Tags>
			</DocExample>
			<DocExample
				title="Sizes & light"
				code={`<Tag size="medium" color="primary">Medium</Tag>
<Tag size="large" color="info">Large</Tag>
<Tag light color="success">Light</Tag>
<Tag rounded color="danger">Rounded</Tag>`}
			>
				<Tags>
					<Tag size="medium" color="primary">
						Medium
					</Tag>
					<Tag size="large" color="info">
						Large
					</Tag>
					<Tag light color="success">
						Light
					</Tag>
					<Tag rounded color="danger">
						Rounded
					</Tag>
				</Tags>
			</DocExample>
			<DocExample
				title="Removable"
				code={`<Tag color="primary" onRemove={() => {}}>
  signals
</Tag>`}
			>
				<Show
					when={tagVisible()}
					fallback={
						<Button size="sm" variant="outline" onClick={() => tagVisible.set(true)}>
							Restore tag
						</Button>
					}
				>
					<Tag color="primary" onRemove={() => tagVisible.set(false)}>
						signals
					</Tag>
				</Show>
			</DocExample>
		</DocPage>
	),
	badge: () => (
		<DocPage
			title="Badge"
			description="Compact count or status pills. Use Tag when you need a labeled chip."
		>
			<DocExample
				code={`<Badge>3</Badge>
<Badge tone="success">New</Badge>
<Badge tone="warning">12</Badge>
<Badge tone="danger">!</Badge>
<IconBadge name="star" tone="accent" />`}
			>
				<Group gap="0.65rem" wrap>
					<Badge>3</Badge>
					<Badge tone="success">New</Badge>
					<Badge tone="warning">12</Badge>
					<Badge tone="danger">!</Badge>
					<Badge tone="muted">42</Badge>
					<IconBadge name="star" tone="accent" />
				</Group>
			</DocExample>
		</DocPage>
	),
	progress: () => (
		<DocPage
			title="Progress"
			description="Linear progress bars for uploads, wizards, and async work. Use Button loading for action spinners."
		>
			<DocExample
				title="Colors"
				code={`<Progress value={15} color="primary" />
<Progress value={30} color="info" />
<Progress value={45} color="success" />
<Progress value={60} color="warning" />
<Progress value={75} color="danger" />`}
			>
				<Stack gap="0.65rem">
					<Progress value={15} color="primary" />
					<Progress value={30} color="info" />
					<Progress value={45} color="success" />
					<Progress value={60} color="warning" />
					<Progress value={75} color="danger" />
				</Stack>
			</DocExample>
			<DocExample
				title="Sizes & interactive"
				code={`<Progress value={pct()} size="sm" />
<Progress value={pct()} />
<Progress value={pct()} size="lg" />
<Progress indeterminate />`}
			>
				<Stack gap="0.75rem">
					<Progress value={loadPct()} size="sm" />
					<Progress value={loadPct()} />
					<Progress value={loadPct()} size="lg" />
					<Progress value={0} indeterminate />
					<Group gap="0.5rem">
						<Button
							size="sm"
							variant="ghost"
							onClick={() => loadPct.set(Math.max(0, loadPct() - 10))}
						>
							−10%
						</Button>
						<Button
							size="sm"
							variant="ghost"
							onClick={() => loadPct.set(Math.min(100, loadPct() + 10))}
						>
							+10%
						</Button>
						<Text muted as="span">
							{loadPct()}%
						</Text>
					</Group>
				</Stack>
			</DocExample>
		</DocPage>
	),
	notification: () => (
		<DocPage title="Notification" description="Soft alert blocks for important messages.">
			<DocExample
				code={`<Alert tone="info">Something you should know.</Alert>
<Alert tone="success">Saved successfully.</Alert>
<Alert tone="danger">Something went wrong.</Alert>`}
			>
				<Stack gap="0.65rem">
					<Alert tone="info">Something you should know.</Alert>
					<Alert tone="success">Saved successfully.</Alert>
					<Alert tone="danger">Something went wrong.</Alert>
				</Stack>
			</DocExample>
		</DocPage>
	),
	icon: () => (
		<DocPage
			title="Icon"
			description="Material Design Icons via path data. Pair with IconBadge for emphasis."
		>
			<DocExample
				code={`<Icon name="check" />
<Icon name="heart" />
<Icon name="star" />
<Icon name="bell" />
<Icon name="settings" />
<Icon name="code" />`}
			>
				<Group gap="0.75rem" wrap>
					<Icon name="check" />
					<Icon name="heart" />
					<Icon name="star" />
					<Icon name="bell" />
					<Icon name="settings" />
					<Icon name="code" />
					<Icon name="home" />
					<Icon name="search" />
				</Group>
			</DocExample>
		</DocPage>
	),
	title: () => (
		<DocPage
			title="Title"
			description="Headings sized 1–6. Pair with Subtitle for a quiet supporting line."
		>
			<DocExample
				code={`<Title size={1}>Title 1</Title>
<Title size={2}>Title 2</Title>
<Title size={3}>Title 3</Title>
<Title size={4}>Title 4</Title>
<Title size={5}>Title 5</Title>
<Title size={6}>Title 6</Title>
<Subtitle size={5}>A subtitle sits under the title.</Subtitle>`}
			>
				<Stack gap="0.5rem">
					<Title size={1}>Title 1</Title>
					<Title size={2}>Title 2</Title>
					<Title size={3}>Title 3</Title>
					<Title size={4}>Title 4</Title>
					<Title size={5}>Title 5</Title>
					<Title size={6}>Title 6</Title>
					<div>
						<Title size={3}>With subtitle</Title>
						<Subtitle size={5}>A subtitle sits under the title.</Subtitle>
					</div>
				</Stack>
			</DocExample>
		</DocPage>
	),
	table: () => (
		<DocPage
			title="Table"
			description="Plain HTML tables for markup, plus DataTable when you need sortable columns."
		>
			<DocExample
				title="Basic"
				code={`<Table bordered striped hoverable fullwidth>
  <thead>
    <tr>
      <th>One</th>
      <th>Two</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Three</td>
      <td>Four</td>
    </tr>
    <tr>
      <td>Five</td>
      <td>Six</td>
    </tr>
  </tbody>
</Table>`}
			>
				<Table bordered striped hoverable fullwidth>
					<thead>
						<tr>
							<th>One</th>
							<th>Two</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Three</td>
							<td>Four</td>
						</tr>
						<tr>
							<td>Five</td>
							<td>Six</td>
						</tr>
					</tbody>
				</Table>
			</DocExample>
			<DocExample
				title="Sortable DataTable"
				description="Click a column header to sort ascending, again for descending, again to clear."
				code={`<DataTable
  columns={[
    { id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
    { id: "role", header: "Role", cell: (r) => r.role, sortValue: (r) => r.role },
    { id: "score", header: "Score", cell: (r) => r.score, sortValue: (r) => r.score },
  ]}
  rows={[
    { id: "1", name: "Ada", role: "Engineer", score: 92 },
    { id: "2", name: "Grace", role: "Designer", score: 88 },
    { id: "3", name: "Alan", role: "Ops", score: 95 },
  ]}
/>`}
			>
				<DataTable
					columns={[
						{
							id: "name",
							header: "Name",
							cell: (r: { name: string }) => r.name,
							sortValue: (r: { name: string }) => r.name,
						},
						{
							id: "role",
							header: "Role",
							cell: (r: { role: string }) => r.role,
							sortValue: (r: { role: string }) => r.role,
						},
						{
							id: "score",
							header: "Score",
							cell: (r: { score: number }) => String(r.score),
							sortValue: (r: { score: number }) => r.score,
						},
					]}
					rows={[
						{ id: "1", name: "Ada", role: "Engineer", score: 92 },
						{ id: "2", name: "Grace", role: "Designer", score: 88 },
						{ id: "3", name: "Alan", role: "Ops", score: 95 },
					]}
				/>
			</DocExample>
		</DocPage>
	),
	image: () => (
		<DocPage title="Image" description="Full-width responsive images with optional radius.">
			<DocExample
				code={`<Image
  src="https://picsum.photos/seed/arachne/960/420"
  alt="Sample landscape"
  radius={8}
/>`}
			>
				<Image src="https://picsum.photos/seed/arachne/960/420" alt="Sample landscape" radius={8} />
			</DocExample>
		</DocPage>
	),
	breadcrumb: () => (
		<DocPage
			title="Breadcrumb"
			description="A simple breadcrumb trail for hierarchy and back-navigation."
		>
			<DocExample
				code={`<Breadcrumb
  items={[
    { label: "Arachne", onClick: () => {} },
    { label: "Docs", onClick: () => {} },
    { label: "Breadcrumb" },
  ]}
/>`}
			>
				<Stack gap="0.5rem">
					<Breadcrumb
						items={crumbTrail
							.slice(0, crumbDepth() + 1)
							.map((label, i) =>
								i < crumbDepth() ? { label, onClick: () => crumbDepth.set(i) } : { label },
							)}
					/>
					<Show when={crumbDepth() < crumbTrail.length - 1}>
						<Button size="sm" variant="ghost" onClick={() => crumbDepth.set(crumbTrail.length - 1)}>
							Back to “Breadcrumb”
						</Button>
					</Show>
				</Stack>
			</DocExample>
		</DocPage>
	),
	card: () => (
		<DocPage title="Card" description="A flexible content container with header, body, and footer.">
			<DocExample
				code={`<Card>
  <CardHeader>
    <CardHeaderTitle>Component</CardHeaderTitle>
  </CardHeader>
  <CardContent>
    <Text muted>Lorem ipsum dolor sit amet.</Text>
  </CardContent>
  <CardFooter>
    <CardFooterItem>Save</CardFooterItem>
    <CardFooterItem>Edit</CardFooterItem>
  </CardFooter>
</Card>`}
			>
				<Card>
					<CardHeader>
						<CardHeaderTitle>Component</CardHeaderTitle>
						<IconBadge name="star" tone="accent" />
					</CardHeader>
					<CardContent>
						<Text muted>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Text>
					</CardContent>
					<CardFooter>
						<CardFooterItem>Save</CardFooterItem>
						<CardFooterItem>Edit</CardFooterItem>
						<CardFooterItem>Delete</CardFooterItem>
					</CardFooter>
				</Card>
			</DocExample>
		</DocPage>
	),
	dropdown: () => (
		<DocPage
			title="Drawer"
			description="A side panel that slides over the page. Close with the ×, backdrop, or Escape."
		>
			<DocExample
				code={`<Button onClick={() => open.set(true)}>Open drawer</Button>
<Drawer open={open()} title="Account" onClose={() => open.set(false)}>
  <Text>Drawer body</Text>
</Drawer>`}
			>
				<Button onClick={() => drawerOpen.set(true)}>Open drawer</Button>
				<Drawer open={drawerOpen()} title="Account" onClose={() => drawerOpen.set(false)}>
					<Stack gap="0.75rem">
						<Text>Side panel for filters, details, or settings.</Text>
						<Button size="sm" onClick={() => drawerOpen.set(false)}>
							Done
						</Button>
					</Stack>
				</Drawer>
			</DocExample>
		</DocPage>
	),
	menu: () => (
		<DocPage
			title="Menu"
			description="Dropdown menus for actions. For a persistent side list, use Panel instead."
		>
			<DocExample
				title="Dropdown menu"
				code={`<div class="a-menu-host">
  <Button onClick={() => open.set(true)}>Actions</Button>
  <Menu
    open={open()}
    onClose={() => open.set(false)}
    items={[
      { label: "Edit", onSelect: () => {} },
      { label: "Duplicate", onSelect: () => {} },
      { label: "Delete", danger: true, onSelect: () => {} },
    ]}
  />
</div>`}
			>
				<div class="a-menu-host">
					<Button onClick={() => menuOpen.set(!menuOpen())}>Actions</Button>
					<Menu
						open={menuOpen()}
						onClose={() => menuOpen.set(false)}
						items={[
							{ label: "Edit", onSelect: () => menuOpen.set(false) },
							{ label: "Duplicate", onSelect: () => menuOpen.set(false) },
							{ label: "Delete", danger: true, onSelect: () => menuOpen.set(false) },
						]}
					/>
				</div>
			</DocExample>
		</DocPage>
	),
	message: () => (
		<DocPage
			title="Message"
			description="Soft tinted callouts for longer notes, with an optional dismissible header."
		>
			<DocExample
				code={`<Message tone="info">
  <MessageHeader onClose={() => {}}>Info</MessageHeader>
  <MessageBody>Hello world</MessageBody>
</Message>
<Message tone="danger">
  <MessageHeader onClose={() => {}}>Danger</MessageHeader>
  <MessageBody>Something went wrong.</MessageBody>
</Message>
<Message tone="success">
  <MessageHeader>Success</MessageHeader>
  <MessageBody>Saved.</MessageBody>
</Message>`}
			>
				<Stack gap="0.75rem">
					<Show when={msgInfo()} fallback={null}>
						<Message tone="info">
							<MessageHeader onClose={() => msgInfo.set(false)}>Info</MessageHeader>
							<MessageBody>Hello world — use messages for longer contextual notes.</MessageBody>
						</Message>
					</Show>
					<Show when={msgDanger()} fallback={null}>
						<Message tone="danger">
							<MessageHeader onClose={() => msgDanger.set(false)}>Danger</MessageHeader>
							<MessageBody>Something went wrong. Check the logs and try again.</MessageBody>
						</Message>
					</Show>
					<Message tone="success">
						<MessageHeader>Success</MessageHeader>
						<MessageBody>Your changes were saved.</MessageBody>
					</Message>
					<Message tone="warning">
						<MessageBody>Header-free warning body.</MessageBody>
					</Message>
				</Stack>
			</DocExample>
		</DocPage>
	),
	modal: () => (
		<DocPage
			title="Modal"
			description="A classic modal overlay. Close with the ×, backdrop click, or footer actions."
		>
			<DocExample
				code={`<Button onClick={() => open.set(true)}>Launch modal</Button>
<Modal
  open={open()}
  title="Confirm"
  onClose={() => open.set(false)}
  footer={<Button onClick={() => open.set(false)}>OK</Button>}
>
  <Text>Modal body content.</Text>
</Modal>`}
			>
				<Button onClick={() => modalOpen.set(true)}>Launch modal</Button>
				<Modal
					open={modalOpen()}
					title="Confirm"
					onClose={() => modalOpen.set(false)}
					footer={
						<Group gap="0.5rem">
							<Button variant="ghost" onClick={() => modalOpen.set(false)}>
								Cancel
							</Button>
							<Button onClick={() => modalOpen.set(false)}>OK</Button>
						</Group>
					}
				>
					<Text>Modal body content sits above the page.</Text>
				</Modal>
			</DocExample>
		</DocPage>
	),
	navbar: () => (
		<DocPage
			title="Navbar"
			description="Responsive horizontal navbar with nested menus, overflow scroll, and optional top placement."
		>
			<DocExample
				title="Basic"
				code={`<Navbar
  ctrl={ctrl}
  brand={<span>Arachne</span>}
  items={[
    { id: "docs", label: "Docs" },
    {
      id: "product",
      label: "Product",
      children: [
        { id: "signals", label: "Signals" },
        { id: "jsx", label: "JSX" },
      ],
    },
  ]}
/>`}
			>
				<Navbar
					ctrl={navCtrl}
					label="Basic demo"
					trigger={navTrigger()}
					brand={<span>Arachne</span>}
					items={navItems()}
					end={
						<Button
							size="sm"
							variant="ghost"
							onClick={() => {
								navCtrl.closeAll();
								navTrigger.set(navTrigger() === "hover" ? "click" : "hover");
							}}
						>
							Trigger: {navTrigger()}
						</Button>
					}
				/>
			</DocExample>
			<DocExample
				title="Overflow + sticky top"
				description="Extra links scroll with chevrons (disabled at the ends). placement sticky pins the bar to the top of the scrollport."
				code={`<Navbar
  ctrl={ctrl}
  placement="sticky"
  brand={<span>Arachne</span>}
  items={manyLinks}
/>`}
			>
				<Navbar
					ctrl={navCtrlOverflow}
					label="Overflow demo"
					placement="sticky"
					brand={<span>Arachne</span>}
					items={navOverflowItems()}
					end={<Button size="sm">Sign in</Button>}
				/>
			</DocExample>
		</DocPage>
	),
	pagination: () => (
		<DocPage
			title="Pagination"
			description='Numbered pagination with previous/next. Use variant="simple" for a compact status.'
		>
			<DocExample
				code={`<Pagination
  page={page()}
  pageCount={10}
  onChange={(p) => page.set(p)}
/>`}
			>
				<Stack gap="1rem">
					<Pagination
						aria-label="Pagination (numbered)"
						page={page()}
						pageCount={10}
						onChange={(p) => page.set(p)}
					/>
					<Pagination
						aria-label="Pagination (simple)"
						variant="simple"
						page={page()}
						pageCount={10}
						onChange={(p) => page.set(p)}
					/>
				</Stack>
			</DocExample>
		</DocPage>
	),
	panel: () => (
		<DocPage
			title="Panel"
			description="A composable side-list surface with a heading and block rows. Different from Menu, which is a dropdown."
		>
			<DocExample
				code={`<Panel label="Repositories">
  <PanelHeading>Repositories</PanelHeading>
  <PanelBlock active>arachne</PanelBlock>
  <PanelBlock>signals</PanelBlock>
  <PanelBlock>forms</PanelBlock>
</Panel>`}
			>
				<Panel label="Repositories">
					<PanelHeading>Repositories</PanelHeading>
					<PanelBlock active>arachne</PanelBlock>
					<PanelBlock>signals</PanelBlock>
					<PanelBlock>forms</PanelBlock>
				</Panel>
			</DocExample>
		</DocPage>
	),
	tabs: () => (
		<DocPage
			title="Tabs"
			description="Horizontal tabs for switching views. Use the chevrons when many tabs exceed the width."
		>
			<DocExample
				code={`<Tabs
  value={tab()}
  onChange={(id) => tab.set(id)}
  items={[
    { id: "jsx", label: "JSX" },
    { id: "signals", label: "Signals" },
    { id: "forms", label: "Forms" },
  ]}
/>
<Text muted>Active: {tab()}</Text>`}
			>
				<Stack gap="0.75rem">
					<Tabs
						value={tab()}
						onChange={(next) => tab.set(next)}
						items={[
							{ id: "jsx", label: "JSX" },
							{ id: "signals", label: "Signals" },
							{ id: "forms", label: "Forms" },
						]}
					/>
					<Text muted>Active: {tab()}</Text>
				</Stack>
			</DocExample>
			<DocExample
				title="Overflow"
				description="Chevron buttons appear when tabs overflow; ends are disabled when you can’t scroll further."
				code={`<Tabs value={tab()} onChange={...} items={manyTabs} />`}
			>
				<Stack gap="0.75rem">
					<Tabs
						value={tabOverflow()}
						onChange={(next) => tabOverflow.set(next)}
						items={tabOverflowItems}
					/>
					<Text muted>Active: {tabOverflow()}</Text>
				</Stack>
			</DocExample>
		</DocPage>
	),
	"form-complete": () => (
		<DocPage
			title="Complete form"
			description="A full profile form: text, password, select, radio, checkbox, textarea, and submit."
		>
			<DocExample
				code={`<form onSubmit={...}>
  <FormSection order={2} title="Profile" description="Basic account details.">
    <FormField label="Name" labelFor="name">
      <TextInput id="name" value={name()} onInput={...} />
    </FormField>
    <FormField label="Email" labelFor="email">
      <TextInput id="email" type="email" value={email()} onInput={...} />
    </FormField>
    <FormField label="Password" labelFor="password">
      <PasswordInput id="password" value={password()} onChange={setPassword} />
    </FormField>
    <FormField label="Role" labelFor="role">
      <Select id="role" value={role()} options={...} onChange={...} />
    </FormField>
    <FormField label="Plan">
      <RadioGroup name="plan" value={plan()} options={...} onChange={...} />
    </FormField>
    <FormField label="Bio" labelFor="bio">
      <TextArea id="bio" rows={3} value={bio()} onInput={...} />
    </FormField>
    <Checkbox checked={notify()} onChange={...} label="Email me updates" />
  </FormSection>
  <Button type="submit">Save profile</Button>
</form>`}
			>
				<form
					onSubmit={(e: Event) => {
						e.preventDefault();
						formSubmitted.set(
							`${formName() || "Anonymous"} · ${formEmail() || "no email"} · ${formRole()} · ${formPlan()}`,
						);
					}}
				>
					<Stack gap="1rem">
						<FormSection order={2} title="Profile" description="Basic account details.">
							<Stack gap="0.85rem">
								<FormField label="Name" labelFor="form-name">
									<TextInput
										id="form-name"
										placeholder="Jane Doe"
										value={formName()}
										onInput={(e: InputEvent) => formName.set((e.target as HTMLInputElement).value)}
									/>
								</FormField>
								<FormField label="Email" labelFor="form-email">
									<TextInput
										id="form-email"
										placeholder="jane@example.com"
										value={formEmail()}
										onInput={(e: InputEvent) => formEmail.set((e.target as HTMLInputElement).value)}
									/>
								</FormField>
								<FormField label="Password" labelFor="form-password" help="At least 8 characters.">
									<PasswordInput
										id="form-password"
										value={formPassword()}
										onChange={(v) => formPassword.set(v)}
									/>
								</FormField>
								<FormField label="Role" labelFor="form-role">
									<Select
										id="form-role"
										value={formRole()}
										onChange={(e: Event) => formRole.set((e.target as HTMLSelectElement).value)}
										options={[
											{ value: "engineer", label: "Engineer" },
											{ value: "designer", label: "Designer" },
											{ value: "ops", label: "Ops" },
										]}
									/>
								</FormField>
								<FormField label="Plan">
									<RadioGroup
										name="form-plan"
										value={formPlan()}
										onChange={(e: Event) => formPlan.set((e.target as HTMLInputElement).value)}
										options={[
											{ value: "free", label: "Free" },
											{ value: "pro", label: "Pro" },
											{ value: "team", label: "Team" },
										]}
									/>
								</FormField>
								<FormField label="Bio" labelFor="form-bio">
									<TextArea
										id="form-bio"
										rows={3}
										placeholder="A short bio…"
										value={formBio()}
										onInput={(e: InputEvent) =>
											formBio.set((e.target as HTMLTextAreaElement).value)
										}
									/>
								</FormField>
								<Checkbox
									checked={formNotify()}
									onChange={(e: Event) => formNotify.set((e.target as HTMLInputElement).checked)}
									label="Email me product updates"
								/>
							</Stack>
						</FormSection>
						<Group gap="0.5rem">
							<Button type="submit">Save profile</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={() => {
									formName.set("");
									formEmail.set("");
									formPassword.set("");
									formBio.set("");
									formSubmitted.set("");
								}}
							>
								Reset
							</Button>
						</Group>
						<Show when={formSubmitted()} fallback={null}>
							{(msg: string) => <Alert tone="success">Saved: {msg}</Alert>}
						</Show>
					</Stack>
				</form>
			</DocExample>
		</DocPage>
	),
	"form-layouts": () => (
		<DocPage
			title="Form layouts"
			description="Vertical fields, horizontal labels, and fieldsets for related controls."
		>
			<DocExample
				title="Vertical fields"
				code={`<FormField label="Username" labelFor="user">
  <TextInput id="user" />
</FormField>
<FormField label="About" labelFor="about" help="Optional.">
  <TextArea id="about" rows={3} />
</FormField>`}
			>
				<Stack gap="0.85rem">
					<FormField label="Username" labelFor="layout-user">
						<TextInput id="layout-user" placeholder="arachne" />
					</FormField>
					<FormField label="About" labelFor="layout-about" help="Optional.">
						<TextArea id="layout-about" rows={3} placeholder="Say hello…" />
					</FormField>
				</Stack>
			</DocExample>
			<DocExample
				title="Horizontal fields"
				code={`<FormField horizontal label="Name" labelFor="h-name">
  <TextInput id="h-name" />
</FormField>
<FormField horizontal label="Role" labelFor="h-role">
  <Select id="h-role" options={...} />
</FormField>`}
			>
				<Stack gap="0.85rem">
					<FormField horizontal label="Name" labelFor="h-name">
						<TextInput id="h-name" placeholder="Jane Doe" />
					</FormField>
					<FormField horizontal label="Role" labelFor="h-role">
						<Select
							id="h-role"
							value={layoutRole()}
							onChange={(e: Event) => layoutRole.set((e.target as HTMLSelectElement).value)}
							options={[
								{ value: "engineer", label: "Engineer" },
								{ value: "designer", label: "Designer" },
							]}
						/>
					</FormField>
				</Stack>
			</DocExample>
			<DocExample
				title="Fieldset groups"
				code={`<Fieldset legend="Notifications">
  <Checkbox label="Email" />
  <Checkbox label="Push" />
</Fieldset>
<Fieldset legend="Disabled group" disabled>
  <TextInput placeholder="Locked" />
</Fieldset>`}
			>
				<Stack gap="0.85rem">
					<Fieldset legend="Notifications">
						<Stack gap="0.5rem">
							<Checkbox
								label="Email digests"
								checked={layoutDigests()}
								onChange={(e: Event) => layoutDigests.set((e.target as HTMLInputElement).checked)}
							/>
							<Checkbox
								label="Push alerts"
								checked={layoutPush()}
								onChange={(e: Event) => layoutPush.set((e.target as HTMLInputElement).checked)}
							/>
						</Stack>
					</Fieldset>
					<Fieldset legend="Billing (disabled)" disabled>
						<TextInput placeholder="Card number" />
					</Fieldset>
				</Stack>
			</DocExample>
			<DocExample
				title="Login-style"
				code={`<Stack gap="0.85rem">
  <FormField label="Email" labelFor="login-email">
    <TextInput id="login-email" type="email" />
  </FormField>
  <FormField label="Password" labelFor="login-pass">
    <PasswordInput id="login-pass" value={...} onChange={...} />
  </FormField>
  <Button>Sign in</Button>
</Stack>`}
			>
				<Box>
					<Stack gap="0.85rem">
						<Title size={4}>Sign in</Title>
						<FormField label="Email" labelFor="login-email">
							<TextInput id="login-email" placeholder="you@example.com" />
						</FormField>
						<FormField label="Password" labelFor="login-pass">
							<PasswordInput
								id="login-pass"
								value={formPassword()}
								onChange={(v) => formPassword.set(v)}
							/>
						</FormField>
						<Button>Sign in</Button>
					</Stack>
				</Box>
			</DocExample>
		</DocPage>
	),
	input: () => (
		<DocPage title="Input" description="Text inputs with labels, invalid, and disabled states.">
			<DocExample
				code={`<FormField label="Name" labelFor="name">
  <TextInput id="name" placeholder="Jane Doe" />
</FormField>
<FormField label="Controlled" labelFor="ctrl" help="Updates as you type.">
  <TextInput id="ctrl" value={value()} onInput={...} />
</FormField>
<FormField label="Disabled" labelFor="off">
  <TextInput id="off" disabled placeholder="Disabled" />
</FormField>`}
			>
				<Stack gap="0.85rem">
					<FormField label="Name" labelFor="name">
						<TextInput id="name" placeholder="Jane Doe" />
					</FormField>
					<FormField label="Controlled" labelFor="ctrl" help="Updates as you type.">
						<TextInput
							id="ctrl"
							value={textVal()}
							placeholder="Controlled"
							onInput={(e: InputEvent) => textVal.set((e.target as HTMLInputElement).value)}
						/>
					</FormField>
					<FormField label="Disabled" labelFor="off">
						<TextInput id="off" disabled placeholder="Disabled" />
					</FormField>
				</Stack>
			</DocExample>
		</DocPage>
	),
	textarea: () => (
		<DocPage title="Textarea" description="Multi-line text input for longer content.">
			<DocExample
				code={`<FormField label="Notes" labelFor="notes">
  <TextArea id="notes" placeholder="Write a note…" rows={4} />
</FormField>`}
			>
				<FormField label="Notes" labelFor="notes">
					<TextArea id="notes" placeholder="Write a note…" rows={4} />
				</FormField>
			</DocExample>
		</DocPage>
	),
	select: () => (
		<DocPage title="Select" description="Native-styled select for a single choice.">
			<DocExample
				code={`<FormField label="Role" labelFor="role">
  <Select
    id="role"
    value={role()}
    onChange={...}
    options={[
      { value: "engineer", label: "Engineer" },
      { value: "designer", label: "Designer" },
    ]}
  />
</FormField>`}
			>
				<FormField label="Role" labelFor="role">
					<Select
						id="role"
						value={selectVal()}
						onChange={(e: Event) => selectVal.set((e.target as HTMLSelectElement).value)}
						options={[
							{ value: "engineer", label: "Engineer" },
							{ value: "designer", label: "Designer" },
							{ value: "ops", label: "Ops" },
						]}
					/>
				</FormField>
			</DocExample>
		</DocPage>
	),
	checkbox: () => (
		<DocPage title="Checkbox" description="Single checkboxes and checkbox groups.">
			<DocExample
				title="Single"
				code={`<Checkbox
  checked={checked()}
  onChange={...}
  label="I agree to the terms"
/>`}
			>
				<Checkbox
					checked={checked()}
					onChange={(e: Event) => checked.set((e.target as HTMLInputElement).checked)}
					label="I agree to the terms"
				/>
			</DocExample>
			<DocExample
				title="Group"
				code={`<CheckboxGroup
  value={selected()}
  onChange={setSelected}
  options={[
    { value: "tsx", label: "TypeScript" },
    { value: "css", label: "CSS" },
    { value: "md", label: "Markdown" },
  ]}
/>`}
			>
				<CheckboxGroup
					value={checkGroup()}
					onChange={(next) => checkGroup.set(next)}
					options={[
						{ value: "tsx", label: "TypeScript" },
						{ value: "css", label: "CSS" },
						{ value: "md", label: "Markdown" },
					]}
				/>
			</DocExample>
		</DocPage>
	),
	radio: () => (
		<DocPage title="Radio" description="A mutually exclusive set of options.">
			<DocExample
				code={`<RadioGroup
  name="contact"
  value={value()}
  onChange={...}
  options={[
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "mail", label: "Mail" },
  ]}
/>`}
			>
				<RadioGroup
					name="contact"
					value={radioVal()}
					onChange={(e: Event) => radioVal.set((e.target as HTMLInputElement).value)}
					options={[
						{ value: "email", label: "Email" },
						{ value: "phone", label: "Phone" },
						{ value: "mail", label: "Mail" },
					]}
				/>
			</DocExample>
		</DocPage>
	),
	switch: () => (
		<DocPage title="Switch" description="On/off toggle for settings and preferences.">
			<DocExample
				code={`<Switch
  checked={on()}
  onChange={...}
  label="Email notifications"
/>`}
			>
				<Switch
					checked={switched()}
					onChange={(e: Event) => switched.set((e.target as HTMLInputElement).checked)}
					label="Email notifications"
				/>
			</DocExample>
		</DocPage>
	),
	columns: () => (
		<DocPage title="Columns" description="A simple responsive grid. Sizes are fractions or 1–12.">
			<DocExample
				title="Basics"
				code={`<Columns>
  <Column size={4}><Box>First</Box></Column>
  <Column size={8}><Box>Second</Box></Column>
</Columns>`}
			>
				<Columns>
					<Column size={4}>
						<Box>
							<Text muted>First column</Text>
						</Box>
					</Column>
					<Column size={8}>
						<Box>
							<Text muted>Second column</Text>
						</Box>
					</Column>
				</Columns>
			</DocExample>
			<DocExample
				title="Three equal"
				code={`<Columns>
  <Column size="one-third"><Box>A</Box></Column>
  <Column size="one-third"><Box>B</Box></Column>
  <Column size="one-third"><Box>C</Box></Column>
</Columns>`}
			>
				<Columns>
					<Column size="one-third">
						<Box>
							<Text muted>A</Text>
						</Box>
					</Column>
					<Column size="one-third">
						<Box>
							<Text muted>B</Text>
						</Box>
					</Column>
					<Column size="one-third">
						<Box>
							<Text muted>C</Text>
						</Box>
					</Column>
				</Columns>
			</DocExample>
		</DocPage>
	),
	container: () => (
		<DocPage
			title="Container"
			description="A simple container to center your content horizontally."
		>
			<DocExample
				code={`<Container>
  <Text>This content is constrained.</Text>
</Container>`}
			>
				<Container>
					<Box>
						<Text>This content is constrained by Container.</Text>
					</Box>
				</Container>
			</DocExample>
		</DocPage>
	),
	hero: () => (
		<DocPage title="Hero" description="An imposing banner for page intros and landing sections.">
			<DocExample
				code={`<Hero size="sm" tone="light">
  <HeroBody>
    <Title size={2}>Hero title</Title>
    <Subtitle>Subtitle</Subtitle>
  </HeroBody>
</Hero>`}
			>
				<Hero size="sm" tone="light">
					<HeroBody>
						<Title size={2}>Hero title</Title>
						<Subtitle>Subtitle sits under the title.</Subtitle>
					</HeroBody>
				</Hero>
			</DocExample>
		</DocPage>
	),
	level: () => (
		<DocPage
			title="Level"
			description="A multi-purpose horizontal level for aligning items left and right."
		>
			<DocExample
				code={`<Level>
  <LevelLeft>
    <LevelItem>
      <div>
        <Text muted as="span">Posts</Text>
        <Title size={4}>3,210</Title>
      </div>
    </LevelItem>
  </LevelLeft>
  <LevelRight>
    <LevelItem><Button size="sm">New post</Button></LevelItem>
  </LevelRight>
</Level>`}
			>
				<Level>
					<LevelLeft>
						<LevelItem>
							<div>
								<Text muted as="span">
									Posts
								</Text>
								<Title size={4}>3,210</Title>
							</div>
						</LevelItem>
						<LevelItem>
							<div>
								<Text muted as="span">
									Following
								</Text>
								<Title size={4}>210</Title>
							</div>
						</LevelItem>
						<LevelItem>
							<div>
								<Text muted as="span">
									Followers
								</Text>
								<Title size={4}>1,421</Title>
							</div>
						</LevelItem>
					</LevelLeft>
					<LevelRight>
						<LevelItem>
							<Button size="sm">New post</Button>
						</LevelItem>
					</LevelRight>
				</Level>
			</DocExample>
		</DocPage>
	),
	section: () => (
		<DocPage
			title="Section"
			description="A simple container with vertical spacing — use to structure page regions."
		>
			<DocExample
				code={`<Section>
  <Title size={3}>Section</Title>
  <Text muted>Spaced content block.</Text>
</Section>`}
			>
				<Section>
					<Title size={3}>Section</Title>
					<Text muted>Spaced content block.</Text>
				</Section>
			</DocExample>
		</DocPage>
	),
};

function renderShowcasePage(id: string) {
	if (id.startsWith(CATALOG_PREFIX)) return <CatalogPage name={id.slice(CATALOG_PREFIX.length)} />;
	const page = SHOWCASE_PAGES[id];
	if (page)
		return (
			<>
				{page()}
				<ComponentReference pageId={id} />
			</>
		);
	return (
		<DocPage title="Not found" description={`No docs page for “${id}”.`}>
			<Text muted>Pick another item from the sidebar.</Text>
		</DocPage>
	);
}
