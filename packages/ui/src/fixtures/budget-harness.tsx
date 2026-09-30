import { render } from "@arachnejs/render";
import { Badge, Button, Card, Checkbox, Icon, Tabs, TextInput, Tooltip } from "../index.ts";

/** Each case renders one component into its own root so DOM cost can be counted. */
export const cases: Record<string, () => unknown> = {
	Button: () => <Button>Save</Button>,
	"Button (start+end)": () => (
		<Button start={<Icon name="check" />} end="⌘S">
			Save
		</Button>
	),
	TextInput: () => <TextInput value="x" />,
	Badge: () => <Badge>3</Badge>,
	Checkbox: () => <Checkbox checked label="Remember" />,
	Card: () => <Card>Body</Card>,
	Tooltip: () => (
		<Tooltip content="Hint">
			<button type="button">?</button>
		</Tooltip>
	),
	Tabs: () => (
		<Tabs
			value="a"
			onChange={() => {}}
			items={[
				{ id: "a", label: "A" },
				{ id: "b", label: "B" },
			]}
		/>
	),
};

export function run(root: HTMLElement) {
	const disposers: Array<() => void> = [];
	const counts: Record<string, { elements: number; nodes: number }> = {};
	for (const [name, view] of Object.entries(cases)) {
		const host = document.createElement("div");
		root.appendChild(host);
		disposers.push(render(view, host));
		const walker = document.createTreeWalker(host, 0xffffffff);
		let nodes = 0;
		while (walker.nextNode()) nodes += 1;
		counts[name] = { elements: host.querySelectorAll("*").length, nodes };
	}
	return {
		counts,
		dispose: () => {
			for (const d of disposers) d();
		},
	};
}
