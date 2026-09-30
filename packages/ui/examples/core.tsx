import { signal } from "@arachnejs/signals";
import {
	Accordion,
	Breadcrumb,
	Button,
	createToaster,
	Drawer,
	Menu,
	Modal,
	Pagination,
	Popover,
	Tabs,
	Text,
	ToastHost,
	Tooltip,
} from "../src/index.ts";
import { action } from "./actions.ts";
import type { Example, ExampleProps } from "./types.ts";

const toaster = createToaster({ exitMs: 0 });

function TabsExample(p: ExampleProps) {
	const tab = signal("deploys");
	return (
		<Tabs
			{...p}
			label="Project"
			value={tab()}
			onChange={tab.set}
			items={[
				{ id: "overview", label: "Overview", panel: <Text>Traffic and status at a glance.</Text> },
				{
					id: "deploys",
					label: "Deploys",
					badge: "12",
					panel: <Text>Every push creates a deploy.</Text>,
				},
				{ id: "settings", label: "Settings", panel: <Text>Domains, builds and access.</Text> },
			]}
		/>
	);
}

function PopoverExample(p: ExampleProps) {
	const open = signal(false);
	return (
		<Popover {...p} open={open()} onOpenChange={open.set} label="Share" panelLabel="Share project">
			Anyone with the link can view this project.
		</Popover>
	);
}

function AccordionExample(p: ExampleProps) {
	const openItem = signal<string | null>("billing");
	return (
		<Accordion
			{...p}
			value={openItem() ?? ""}
			onChange={(id: string | null) => openItem.set(id)}
			items={[
				{
					id: "billing",
					title: "How does billing work?",
					content: "You're billed monthly per seat.",
				},
				{
					id: "cancel",
					title: "Can I cancel anytime?",
					content: "Yes — your plan ends at the period's close.",
				},
				{
					id: "data",
					title: "Where is my data stored?",
					content: "In the EU (Frankfurt) by default.",
				},
			]}
		/>
	);
}

function PaginationExample(p: ExampleProps) {
	const page = signal(3);
	return <Pagination {...p} page={page()} pageCount={12} onChange={page.set} />;
}

export const examples: Example[] = [
	{
		name: "Button",
		render: (p) => (
			<Button {...p} onClick={action("onClick")}>
				Save changes
			</Button>
		),
	},
	{
		name: "Modal",
		host: "panel",
		render: (p) => (
			<Modal
				{...p}
				open
				onClose={action("onClose")}
				title="Edit profile"
				description="Changes apply immediately."
			>
				Modal body content.
			</Modal>
		),
	},
	{
		name: "Drawer",
		host: "panel",
		render: (p) => (
			<Drawer {...p} open onClose={action("onClose")} title="Filters" side="right">
				Drawer body content.
			</Drawer>
		),
	},
	{
		name: "Menu",
		render: (p) => (
			<Menu
				{...p}
				open
				label="Project actions"
				items={[
					{ type: "label", label: "marketing-site" },
					{ label: "Rename", onSelect: action("rename") },
					{ label: "Duplicate", onSelect: action("duplicate") },
					{ type: "separator" },
					{ label: "Delete", onSelect: action("delete"), danger: true },
				]}
			/>
		),
	},
	{ name: "Tabs", render: (p) => <TabsExample {...p} /> },
	{ name: "Popover", render: (p) => <PopoverExample {...p} /> },
	{
		name: "Tooltip",
		render: (p) => (
			<Tooltip {...p} content="Copies the deploy URL">
				<Button variant="outline" onClick={action("copy")}>
					Copy link
				</Button>
			</Tooltip>
		),
	},
	{ name: "Accordion", render: (p) => <AccordionExample {...p} /> },
	{ name: "ToastHost", render: (p) => <ToastHost {...p} toaster={toaster} /> },
	{
		name: "Breadcrumb",
		render: (p) => (
			<Breadcrumb
				{...p}
				items={[
					{ label: "Projects", href: "#projects" },
					{ label: "marketing-site", href: "#marketing-site" },
					{ label: "Deploys" },
				]}
			/>
		),
	},
	{ name: "Pagination", render: (p) => <PaginationExample {...p} /> },
];
