import { effect, signal } from "@arachne/signals";
import {
	Calendar,
	Carousel,
	ColorPicker,
	ConfirmDialog,
	ContextMenu,
	createNavbarController,
	DatePicker,
	Lightbox,
	Navbar,
	NavbarLink,
	Paper,
	SearchInput,
	Spotlight,
	Stack,
	Table,
	Tbody,
	Td,
	Text,
	Tfoot,
	Th,
	Thead,
	Tr,
	TransferList,
	Tree,
	type TreeNode,
} from "../src/index.ts";
import { action } from "./actions.ts";
import { swatch } from "./placeholder.ts";
import type { Example, ExampleProps } from "./types.ts";

function NavbarCase(p: Record<string, unknown>) {
	const ctrl = createNavbarController();
	effect(() => () => ctrl.dispose());
	return (
		<Navbar
			{...p}
			ctrl={ctrl}
			label="Main"
			brand={<strong>Acme</strong>}
			items={[
				{ id: "product", label: "Product", active: true },
				{
					id: "resources",
					label: "Resources",
					children: [
						{ id: "docs", label: "Docs", href: "#docs" },
						{ id: "blog", label: "Blog", href: "#blog" },
					],
				},
				{ id: "pricing", label: "Pricing", href: "#pricing" },
			]}
		/>
	);
}

function TreeExample(p: ExampleProps) {
	const selected = signal("button.tsx");
	const query = signal("");
	const files: TreeNode[] = [
		{
			id: "apps",
			label: "apps",
			badge: 2,
			children: [
				{ id: "web", label: "web", children: [{ id: "client.tsx", label: "client.tsx" }] },
				{ id: "admin", label: "admin", disabled: true, badge: "locked" },
			],
		},
		{
			id: "packages",
			label: "packages",
			children: [
				{
					id: "ui",
					label: "ui",
					children: [
						{ id: "button.tsx", label: "button.tsx" },
						{ id: "tree.tsx", label: "tree.tsx" },
						{ id: "styles.css", label: "styles.css", icon: "code" },
					],
				},
			],
		},
		{ id: "readme", label: "README.md", icon: "info" },
	];
	return (
		<Stack gap="0.5rem" style={{ "max-width": "22rem" }}>
			<SearchInput
				aria-label="Filter files"
				placeholder="Filter files"
				value={query()}
				onChange={query.set}
			/>
			<Tree
				{...p}
				label="Workspace"
				icons="auto"
				filter={query()}
				defaultExpanded={["apps", "packages", "ui"]}
				value={selected()}
				onChange={selected.set}
				data={files}
			/>
			<Text muted>Open: {selected()}</Text>
		</Stack>
	);
}

function CalendarExample(p: ExampleProps) {
	const date = signal("2026-09-29");
	return (
		<Stack gap="0.5rem">
			<Calendar {...p} value={date()} onChange={date.set} />
			<Text muted>Selected: {date()}</Text>
		</Stack>
	);
}

function DatePickerExample(p: ExampleProps) {
	const due = signal("2026-09-29");
	return <DatePicker {...p} value={due()} onChange={due.set} label="Due date" />;
}

function ColorPickerExample(p: ExampleProps) {
	const color = signal("#1e87f0");
	return (
		<Stack gap="0.5rem">
			<ColorPicker {...p} value={color()} onChange={color.set} />
			<Text muted>
				Selected: <code>{color()}</code>
			</Text>
		</Stack>
	);
}

function TransferListExample(p: ExampleProps) {
	const lists = signal({ left: ["Frankfurt", "Tokyo", "São Paulo"], right: ["Washington, D.C."] });
	return (
		<TransferList
			{...p}
			leftTitle="Available"
			rightTitle="Selected"
			left={lists().left}
			right={lists().right}
			onChange={lists.set}
		/>
	);
}

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	// Table parts render inside a real table (their templates are table-part roots).
	{
		name: "Thead",
		render: (p) => (
			<Table>
				<Thead {...p}>
					<Tr>
						<Th scope="col">Invoice</Th>
						<Th scope="col">Amount</Th>
					</Tr>
				</Thead>
				<Tbody>
					<Tr>
						<Td>INV-014</Td>
						<Td>$49.00</Td>
					</Tr>
				</Tbody>
			</Table>
		),
	},
	{
		name: "Tbody",
		render: (p) => (
			<Table>
				<Tbody {...p}>
					<Tr>
						<Td>INV-014</Td>
						<Td>$49.00</Td>
					</Tr>
					<Tr>
						<Td>INV-013</Td>
						<Td>$49.00</Td>
					</Tr>
				</Tbody>
			</Table>
		),
	},
	{
		name: "Tfoot",
		render: (p) => (
			<Table>
				<Tbody>
					<Tr>
						<Td>INV-014</Td>
						<Td>$49.00</Td>
					</Tr>
				</Tbody>
				<Tfoot {...p}>
					<Tr>
						<Th scope="row">Total</Th>
						<Td>$49.00</Td>
					</Tr>
				</Tfoot>
			</Table>
		),
	},
	{
		name: "Tr",
		render: (p) => (
			<Table>
				<Tbody>
					<Tr {...p}>
						<Td>INV-014</Td>
						<Td>Paid</Td>
					</Tr>
				</Tbody>
			</Table>
		),
	},
	{
		name: "Th",
		render: (p) => (
			<Table>
				<Thead>
					<Tr>
						<Th {...p} scope="col">
							Status
						</Th>
					</Tr>
				</Thead>
			</Table>
		),
	},
	{
		name: "Td",
		render: (p) => (
			<Table>
				<Tbody>
					<Tr>
						<Td {...p}>Paid</Td>
					</Tr>
				</Tbody>
			</Table>
		),
	},
	{ name: "Tree", render: (p) => <TreeExample {...p} /> },
	{
		name: "Carousel",
		render: (p) => (
			<Carousel
				{...p}
				label="Highlights"
				slides={[
					{
						id: "s1",
						content: (
							<img src={swatch(210, "Signals", 640, 280)} alt="Signals" width="640" height="280" />
						),
					},
					{
						id: "s2",
						content: <img src={swatch(150, "SSR", 640, 280)} alt="SSR" width="640" height="280" />,
					},
					{
						id: "s3",
						content: (
							<img src={swatch(30, "Theming", 640, 280)} alt="Theming" width="640" height="280" />
						),
					},
				]}
			/>
		),
	},
	{ name: "Calendar", render: (p) => <CalendarExample {...p} /> },
	{ name: "DatePicker", render: (p) => <DatePickerExample {...p} /> },
	{
		name: "ContextMenu",
		render: (p) => (
			<ContextMenu
				{...p}
				items={[
					{ id: "open", label: "Open", onSelect: action("onSelect") },
					{ id: "rename", label: "Rename", onSelect: action("onSelect") },
					{ id: "delete", label: "Delete", danger: true, onSelect: action("onSelect") },
				]}
			>
				<Paper withBorder>Right-click this file card</Paper>
			</ContextMenu>
		),
	},
	{ name: "ColorPicker", render: (p) => <ColorPickerExample {...p} /> },
	{
		name: "Lightbox",
		render: (p) => (
			<Lightbox
				{...p}
				images={[{ src: swatch(210, "Photo"), alt: "Photo" }]}
				index={0}
				onClose={action("onClose")}
			/>
		),
	},
	{ name: "TransferList", render: (p) => <TransferListExample {...p} /> },
	{
		name: "Spotlight",
		render: (p) => (
			<Spotlight
				{...p}
				open
				placeholder="Search commands…"
				actions={[
					{
						id: "new",
						label: "New project",
						description: "Create a project from a template",
						onSelect: action("onSelect"),
					},
					{ id: "deploy", label: "Deploy", onSelect: action("onSelect") },
					{ id: "theme", label: "Toggle theme", onSelect: action("onSelect") },
				]}
				onClose={action("onClose")}
			/>
		),
	},
	{
		name: "ConfirmDialog",
		host: "panel",
		render: (p) => (
			<ConfirmDialog
				{...p}
				open
				danger
				title="Delete project?"
				message="This removes marketing-site and all of its deploys."
				confirmLabel="Delete"
				onConfirm={action("onConfirm")}
				onCancel={action("onCancel")}
			/>
		),
	},
	{ name: "Navbar", render: (p) => <NavbarCase {...p} /> },
	{
		name: "NavbarLink",
		render: (p) => (
			<NavbarLink {...p} href="#pricing" active>
				Pricing
			</NavbarLink>
		),
	},
];
