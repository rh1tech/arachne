/** Shared by the SSR and hydration builds of the hydration test. */
import { signal } from "@arachnejs/signals";
import { Accordion, Button, FormField, Tabs, TextInput, Tooltip } from "../index.ts";

export const tab = signal("a");
export const clicks = signal(0);

export function App() {
	return (
		<main id="app">
			<Tabs
				value={tab()}
				onChange={(id) => tab.set(id)}
				items={[
					{ id: "a", label: "Alpha", panel: <p>Panel A</p> },
					{ id: "b", label: "Beta", panel: <p>Panel B</p> },
				]}
			/>
			<Accordion
				value={null}
				onChange={() => {}}
				items={[{ id: "x", title: "X", content: "x body" }]}
			/>
			<FormField label="Email" labelFor="email" help="We never share it">
				<TextInput id="email" value="a@b.c" />
			</FormField>
			<Tooltip content="Hint">
				<Button onClick={() => clicks.set(clicks() + 1)}>Save</Button>
			</Tooltip>
		</main>
	);
}
