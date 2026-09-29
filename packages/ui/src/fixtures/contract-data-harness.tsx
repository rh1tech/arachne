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
	Spotlight,
	Tbody,
	Td,
	Tfoot,
	Th,
	Thead,
	Tr,
	TransferList,
	Tree,
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

function NavbarCase(p: Record<string, unknown>) {
	const ctrl = createNavbarController();
	effect(() => () => ctrl.dispose());
	return <Navbar {...p} ctrl={ctrl} items={[{ id: "home", label: "Home" }]} />;
}

/** Register every exported component of this group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	// Table parts render inside a real table (their templates are table-part roots).
	{
		name: "Thead",
		render: (p) => (
			<table>
				<Thead {...p}>
					<tr>
						<th>h</th>
					</tr>
				</Thead>
			</table>
		),
	},
	{
		name: "Tbody",
		render: (p) => (
			<table>
				<Tbody {...p}>
					<tr>
						<td>b</td>
					</tr>
				</Tbody>
			</table>
		),
	},
	{
		name: "Tfoot",
		render: (p) => (
			<table>
				<Tfoot {...p}>
					<tr>
						<td>f</td>
					</tr>
				</Tfoot>
			</table>
		),
	},
	{
		name: "Tr",
		render: (p) => (
			<table>
				<tbody>
					<Tr {...p}>
						<td>r</td>
					</Tr>
				</tbody>
			</table>
		),
	},
	{
		name: "Th",
		render: (p) => (
			<table>
				<thead>
					<tr>
						<Th {...p}>h</Th>
					</tr>
				</thead>
			</table>
		),
	},
	{
		name: "Td",
		render: (p) => (
			<table>
				<tbody>
					<tr>
						<Td {...p}>d</Td>
					</tr>
				</tbody>
			</table>
		),
	},
	{
		name: "Tree",
		render: (p) => (
			<Tree {...p} data={[{ id: "a", label: "A", children: [{ id: "b", label: "B" }] }]} />
		),
	},
	{ name: "Carousel", render: (p) => <Carousel {...p} slides={[{ id: "s1", content: "One" }]} /> },
	{ name: "Calendar", render: (p) => <Calendar {...p} value="2026-09-29" /> },
	{ name: "DatePicker", render: (p) => <DatePicker {...p} value="2026-09-29" label="Date" /> },
	// Thead/Tbody/Tfoot/Tr/Th/Td are converted too, but happy-dom's <template>
	// parser drops standalone table parts (`<thead>` → null), so the compiled
	// templates can't be instantiated here. Real browsers parse them fine.
	{
		name: "ContextMenu",
		render: (p) => (
			<ContextMenu {...p} items={[{ id: "x", label: "X", onSelect: () => {} }]}>
				target
			</ContextMenu>
		),
	},
	{
		name: "ColorPicker",
		render: (p) => <ColorPicker {...p} value="#1e87f0" onChange={() => {}} />,
	},
	{
		name: "Lightbox",
		render: (p) => (
			<Lightbox {...p} images={[{ src: "a.png", alt: "A" }]} index={0} onClose={() => {}} />
		),
	},
	{
		name: "TransferList",
		render: (p) => <TransferList {...p} left={["a"]} right={["b"]} onChange={() => {}} />,
	},
	{
		name: "Spotlight",
		render: (p) => (
			<Spotlight
				{...p}
				open
				actions={[{ id: "a", label: "A", onSelect: () => {} }]}
				onClose={() => {}}
			/>
		),
	},
	{
		name: "ConfirmDialog",
		host: "panel",
		render: (p) => (
			<ConfirmDialog {...p} open message="Sure?" onConfirm={() => {}} onCancel={() => {}} />
		),
	},
	{ name: "Navbar", render: (p) => <NavbarCase {...p} /> },
	{ name: "NavbarLink", render: (p) => <NavbarLink {...p}>Link</NavbarLink> },
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
