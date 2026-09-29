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
	ToastHost,
	Tooltip,
} from "../src/index.ts";
import type { Example } from "./types.ts";

const toaster = createToaster({ exitMs: 0 });

const noop = () => {};

export const examples: Example[] = [
	{ name: "Button", render: (p) => <Button {...p}>Save changes</Button> },
	{
		name: "Modal",
		host: "panel",
		render: (p) => (
			<Modal
				{...p}
				open
				onClose={noop}
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
			<Drawer {...p} open onClose={noop} title="Filters" side="right">
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
					{ label: "Rename", onSelect: noop },
					{ label: "Duplicate", onSelect: noop },
					{ type: "separator" },
					{ label: "Delete", onSelect: noop, danger: true },
				]}
			/>
		),
	},
	{
		name: "Tabs",
		render: (p) => (
			<Tabs
				{...p}
				label="Project"
				value="deploys"
				onChange={noop}
				items={[
					{ id: "overview", label: "Overview" },
					{ id: "deploys", label: "Deploys", badge: "12" },
					{ id: "settings", label: "Settings" },
				]}
			/>
		),
	},
	{
		name: "Popover",
		render: (p) => (
			<Popover {...p} open={false} onOpenChange={noop} label="Share" panelLabel="Share project">
				Anyone with the link can view this project.
			</Popover>
		),
	},
	{
		name: "Tooltip",
		render: (p) => (
			<Tooltip {...p} content="Copies the deploy URL">
				<Button variant="outline">Copy link</Button>
			</Tooltip>
		),
	},
	{
		name: "Accordion",
		render: (p) => (
			<Accordion
				{...p}
				value="billing"
				onChange={noop}
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
		),
	},
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
	{
		name: "Pagination",
		render: (p) => <Pagination {...p} page={3} pageCount={12} onChange={noop} />,
	},
];
