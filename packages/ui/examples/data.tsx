import { effect } from "@arachne/signals";
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
	Spotlight,
	Table,
	Tbody,
	Td,
	Tfoot,
	Th,
	Thead,
	Tr,
	TransferList,
	Tree,
} from "../src/index.ts";
import { swatch } from "./placeholder.ts";
import type { Example } from "./types.ts";

const noop = () => {};

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
	{
		name: "Tree",
		render: (p) => (
			<Tree
				{...p}
				label="Workspace"
				defaultExpanded={["apps"]}
				value="web"
				data={[
					{
						id: "apps",
						label: "apps",
						children: [
							{ id: "web", label: "web" },
							{ id: "admin", label: "admin" },
						],
					},
					{ id: "packages", label: "packages", children: [{ id: "ui", label: "ui" }] },
				]}
			/>
		),
	},
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
	{ name: "Calendar", render: (p) => <Calendar {...p} value="2026-09-29" /> },
	{ name: "DatePicker", render: (p) => <DatePicker {...p} value="2026-09-29" label="Due date" /> },
	{
		name: "ContextMenu",
		render: (p) => (
			<ContextMenu
				{...p}
				items={[
					{ id: "open", label: "Open", onSelect: noop },
					{ id: "rename", label: "Rename", onSelect: noop },
					{ id: "delete", label: "Delete", danger: true, onSelect: noop },
				]}
			>
				<Paper withBorder>Right-click this file card</Paper>
			</ContextMenu>
		),
	},
	{
		name: "ColorPicker",
		render: (p) => <ColorPicker {...p} value="#1e87f0" onChange={noop} />,
	},
	{
		name: "Lightbox",
		render: (p) => (
			<Lightbox
				{...p}
				images={[{ src: swatch(210, "Photo"), alt: "Photo" }]}
				index={0}
				onClose={noop}
			/>
		),
	},
	{
		name: "TransferList",
		render: (p) => (
			<TransferList
				{...p}
				leftTitle="Available"
				rightTitle="Selected"
				left={["Frankfurt", "Tokyo", "São Paulo"]}
				right={["Washington, D.C."]}
				onChange={noop}
			/>
		),
	},
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
						onSelect: noop,
					},
					{ id: "deploy", label: "Deploy", onSelect: noop },
					{ id: "theme", label: "Toggle theme", onSelect: noop },
				]}
				onClose={noop}
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
				onConfirm={noop}
				onCancel={noop}
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
