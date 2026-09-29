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
	ButtonGroup,
	Center,
	Collapse,
	Comment,
	DataTable,
	DocExample,
	DocMenu,
	DocPage,
	Field,
	Flex,
	FloatingActionButton,
	Group,
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
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const noop = () => {};
const opts = [{ id: "a", label: "A" }];

/** Register every exported component of this group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	// display.tsx
	{ name: "Spinner", render: (p) => <Spinner {...p} /> },
	{ name: "Progress", render: (p) => <Progress {...p} value={40} /> },
	{ name: "Box", render: (p) => <Box {...p}>box</Box> },
	{
		name: "Table",
		render: (p) => (
			<Table {...p}>
				<tbody>
					<tr>
						<td>x</td>
					</tr>
				</tbody>
			</Table>
		),
	},
	// layout.tsx
	{ name: "Label", render: (p) => <Label {...p}>Name</Label> },
	{ name: "Field", render: (p) => <Field {...p} label="Name" hint="Hint" /> },
	{ name: "Text", render: (p) => <Text {...p}>text</Text> },
	{ name: "Stack", render: (p) => <Stack {...p} gap="1rem" /> },
	{ name: "Badge", render: (p) => <Badge {...p}>3</Badge> },
	// appshell.tsx
	{ name: "AppShell", render: (p) => <AppShell {...p} sidebar="s" header="h" /> },
	{ name: "SidebarNav", render: (p) => <SidebarNav {...p} items={opts} value="a" /> },
	{ name: "Segmented", render: (p) => <Segmented {...p} items={opts} value="a" onChange={noop} /> },
	// steps.tsx
	{ name: "Steps", render: (p) => <Steps {...p} items={opts} value="a" /> },
	// doc-page.tsx / doc-menu.tsx
	{ name: "DocPage", render: (p) => <DocPage {...p} title="Doc" description="d" /> },
	{ name: "DocExample", render: (p) => <DocExample {...p} title="Ex" code="<x />" /> },
	{
		name: "DocMenu",
		render: (p) => (
			<DocMenu {...p} sections={[{ id: "a", label: "A" }]} value="a" onChange={noop} />
		),
	},
	// widgets.tsx
	{ name: "Group", render: (p) => <Group {...p} gap="4px" /> },
	{ name: "Center", render: (p) => <Center {...p} /> },
	{ name: "Space", render: (p) => <Space {...p} h={8} /> },
	{ name: "Flex", render: (p) => <Flex {...p} gap="4px" /> },
	{ name: "AspectRatio", render: (p) => <AspectRatio {...p} /> },
	{ name: "Affix", render: (p) => <Affix {...p} /> },
	{ name: "Overlay", render: (p) => <Overlay {...p} /> },
	{ name: "LoadingOverlay", render: (p) => <LoadingOverlay {...p} visible /> },
	{ name: "Indicator", render: (p) => <Indicator {...p} label={2} /> },
	{ name: "List", render: (p) => <List {...p} /> },
	{ name: "ListItem", render: (p) => <ListItem {...p}>item</ListItem> },
	{ name: "ListGroup", render: (p) => <ListGroup {...p} /> },
	{ name: "ListGroupItem", render: (p) => <ListGroupItem {...p}>row</ListGroupItem> },
	{ name: "Timeline", render: (p) => <Timeline {...p} /> },
	{ name: "TimelineItem", render: (p) => <TimelineItem {...p} title="t" /> },
	{ name: "NavLink", render: (p) => <NavLink {...p} label="Home" /> },
	{ name: "ActionIcon", render: (p) => <ActionIcon {...p} label="Edit" /> },
	{ name: "Collapse", render: (p) => <Collapse {...p} open /> },
	{ name: "Spoiler", render: (p) => <Spoiler {...p}>long</Spoiler> },
	{ name: "Mark", render: (p) => <Mark {...p}>m</Mark> },
	{ name: "Quote", render: (p) => <Quote {...p} cite="c" /> },
	{ name: "ScrollArea", render: (p) => <ScrollArea {...p} maxHeight="10rem" /> },
	{ name: "Anchor", render: (p) => <Anchor {...p} href="/x" /> },
	{ name: "Title", render: (p) => <Title {...p}>Title</Title> },
	{ name: "Subtitle", render: (p) => <Subtitle {...p}>Sub</Subtitle> },
	{ name: "RingProgress", render: (p) => <RingProgress {...p} value={30} /> },
	// composite.tsx
	{ name: "UnstyledButton", render: (p) => <UnstyledButton {...p}>u</UnstyledButton> },
	{ name: "ButtonGroup", render: (p) => <ButtonGroup {...p} /> },
	{ name: "SplitButton", render: (p) => <SplitButton {...p} label="Go" menu={[]} /> },
	{
		name: "ToggleGroup",
		render: (p) => <ToggleGroup {...p} items={opts} value={null} onChange={noop} />,
	},
	{ name: "AvatarGroup", render: (p) => <AvatarGroup {...p} names={["Ada Lovelace"]} /> },
	{ name: "Notification", render: (p) => <Notification {...p} title="Hi" /> },
	{ name: "FloatingActionButton", render: (p) => <FloatingActionButton {...p} label="Add" /> },
	{ name: "BottomNav", render: (p) => <BottomNav {...p} items={opts} value="a" onChange={noop} /> },
	{ name: "SortableList", render: (p) => <SortableList {...p} items={opts} onChange={noop} /> },
	{ name: "PasswordStrength", render: (p) => <PasswordStrength {...p} password="abc" /> },
	{ name: "Meter", render: (p) => <Meter {...p} value={5} label="Load" /> },
	{
		name: "Comment",
		render: (p) => (
			<Comment {...p} author="Ada">
				hi
			</Comment>
		),
	},
	{ name: "SkipLink", render: (p) => <SkipLink {...p} /> },
	{ name: "Thumbnav", render: (p) => <Thumbnav {...p} items={[]} value="" onChange={noop} /> },
	{ name: "Leader", render: (p) => <Leader {...p} label="Tax" value="$1" /> },
	{ name: "Marquee", render: (p) => <Marquee {...p}>news</Marquee> },
	{ name: "BarList", render: (p) => <BarList {...p} data={[{ id: "a", label: "A", value: 3 }]} /> },
	{ name: "Splitter", render: (p) => <Splitter {...p} left="L" right="R" /> },
	{
		name: "DataTable",
		render: (p) => (
			<DataTable
				{...p}
				rows={[{ id: "1" }]}
				columns={[{ id: "c", header: "C", cell: (r: { id: string }) => r.id }]}
			/>
		),
	},
	{ name: "YearPicker", render: (p) => <YearPicker {...p} value={2026} /> },
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
