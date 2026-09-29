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
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const toaster = createToaster({ exitMs: 0 });

export const cases: ContractCase[] = [
	{ name: "Button", render: (p) => <Button {...p}>Save</Button> },
	{
		name: "Modal",
		host: "panel",
		render: (p) => <Modal {...p} open onClose={() => {}} title="T" />,
	},
	{
		name: "Drawer",
		host: "panel",
		render: (p) => <Drawer {...p} open onClose={() => {}} title="T" />,
	},
	{
		name: "Menu",
		render: (p) => <Menu {...p} open items={[{ label: "A", onSelect: () => {} }]} />,
	},
	{
		name: "Tabs",
		render: (p) => <Tabs {...p} value="a" onChange={() => {}} items={[{ id: "a", label: "A" }]} />,
	},
	{ name: "Popover", render: (p) => <Popover {...p} open={false} onOpenChange={() => {}} /> },
	{
		name: "Tooltip",
		render: (p) => (
			<Tooltip {...p} content="Tip">
				x
			</Tooltip>
		),
	},
	{
		name: "Accordion",
		render: (p) => (
			<Accordion
				{...p}
				value={null}
				onChange={() => {}}
				items={[{ id: "a", title: "A", content: "a" }]}
			/>
		),
	},
	{ name: "ToastHost", render: (p) => <ToastHost {...p} toaster={toaster} /> },
	{ name: "Breadcrumb", render: (p) => <Breadcrumb {...p} items={[{ label: "Home" }]} /> },
	{
		name: "Pagination",
		render: (p) => <Pagination {...p} page={1} pageCount={3} onChange={() => {}} />,
	},
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
