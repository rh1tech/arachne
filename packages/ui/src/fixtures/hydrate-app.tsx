/** Shared by the SSR and hydration builds of the hydration test. */
import { signal } from "@arachnejs/signals";
import { Accordion, Button, DataTable, FormField, Tabs, TextInput, Tooltip } from "../index.ts";

export const tab = signal("a");
export const clicks = signal(0);
export const picked = signal<string[]>([]);

type Key = { id: string; key: string; seats: number };
const keys: Key[] = [
	{ id: "k1", key: "AAAA-1111", seats: 5 },
	{ id: "k2", key: "BBBB-2222", seats: 1 },
];

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
			<DataTable
				label="Keys"
				rows={keys}
				columns={[
					{ id: "key", header: "Key", cell: (r: Key) => r.key, width: "8rem" },
					{
						id: "seats",
						header: "Seats",
						cell: (r: Key) => String(r.seats),
						sortValue: (r: Key) => r.seats,
						align: "end",
					},
				]}
				selectable
				selected={picked()}
				onSelectionChange={(ids) => picked.set(ids)}
				rowHref={(r) => `/keys/${r.id}`}
				stack
			/>
		</main>
	);
}
