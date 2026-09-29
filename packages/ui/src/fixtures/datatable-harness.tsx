import { render } from "@arachne/render";
import { signal } from "@arachne/signals";
import { DataTable, type DataTableColumn } from "../index.ts";

type DataTableSort = { id: string; dir: "asc" | "desc" };

type Row = { id: string; name: string; score: number };

const base: Array<DataTableColumn<Row>> = [
	{ id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
	{ id: "score", header: "Score", cell: (r) => String(r.score), sortValue: (r) => r.score },
	{ id: "note", header: "Note", cell: () => "-" },
];

export function run(root: HTMLElement) {
	const rows = signal<Row[]>([
		{ id: "a", name: "item 10", score: 9 },
		{ id: "b", name: "item 2", score: 100 },
		{ id: "c", name: "Item 1", score: 20 },
	]);
	const columns = signal(base);
	const changes: Array<DataTableSort | null> = [];
	const dispose = render(
		() => (
			<DataTable
				label="Scores"
				rows={rows()}
				columns={columns()}
				onSortChange={(s) => changes.push(s)}
				empty="No rows"
			/>
		),
		root,
	);
	return { dispose, rows, columns, changes, base };
}
