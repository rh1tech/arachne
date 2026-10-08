import { render } from "@arachnejs/render";
import { type Signal, signal } from "@arachnejs/signals";
import { DataTable, type DataTableColumn, type DataTableSort } from "../index.ts";

type Row = { id: string; name: string; score: number };

const base: Array<DataTableColumn<Row>> = [
	{ id: "name", header: "Name", cell: (r) => r.name, sortValue: (r) => r.name },
	{ id: "score", header: "Score", cell: (r) => String(r.score), sortValue: (r) => r.score },
	{ id: "note", header: "Note", cell: () => "-" },
];

/** License-key style columns: fixed / fractional tracks, alignment, server-sortable `plan`. */
const keyColumns: Array<DataTableColumn<Row>> = [
	{ id: "name", header: "Key", cell: (r) => r.name, width: "9rem" },
	{
		id: "score",
		header: "Seats",
		cell: (r) => String(r.score),
		sortValue: (r) => r.score,
		width: "minmax(8rem,1fr)",
		align: "end",
	},
	{
		id: "plan",
		header: "Plan",
		cell: (r) => (
			<button type="button" class="plan-action">
				{r.name}
			</button>
		),
		sortable: true,
		width: "2fr",
		align: "center",
	},
];

const initialRows = (): Row[] => [
	{ id: "a", name: "item 10", score: 9 },
	{ id: "b", name: "item 2", score: 100 },
	{ id: "c", name: "Item 1", score: 20 },
];

export type AdvancedOptions = {
	/** Pass `sort` (controlled) from the returned signal. */
	controlledSort?: boolean;
	manualSort?: boolean;
	selectable?: boolean;
	/** Pass `selected` from the returned signal; the parent accepts changes when `accept`. */
	controlledSelection?: boolean;
	accept?: boolean;
	links?: boolean;
	stack?: boolean;
};

export type Advanced = {
	el: HTMLElement;
	rows: Signal<Row[]>;
	sort: Signal<DataTableSort | null>;
	selected: Signal<string[]>;
	sortChanges: Array<DataTableSort | null>;
	selectionChanges: string[][];
};

export function run(root: HTMLElement) {
	const rows = signal<Row[]>(initialRows());
	const columns = signal(base);
	const changes: Array<DataTableSort | null> = [];
	const disposers: Array<() => void> = [];
	disposers.push(
		render(
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
		),
	);

	/** Mount a second, feature-rich table in its own element and return its controls. */
	const advanced = (opts: AdvancedOptions): Advanced => {
		const el = document.createElement("div");
		root.appendChild(el);
		const api: Advanced = {
			el,
			rows: signal<Row[]>(initialRows()),
			sort: signal<DataTableSort | null>(null),
			selected: signal<string[]>([]),
			sortChanges: [],
			selectionChanges: [],
		};
		disposers.push(
			render(
				() => (
					<DataTable
						label="Keys"
						rows={api.rows()}
						columns={keyColumns}
						sort={opts.controlledSort ? api.sort() : undefined}
						manualSort={opts.manualSort}
						onSortChange={(s) => api.sortChanges.push(s)}
						selectable={opts.selectable}
						selected={opts.controlledSelection ? api.selected() : undefined}
						onSelectionChange={(ids) => {
							api.selectionChanges.push(ids);
							if (opts.accept) api.selected.set(ids);
						}}
						selectionLabel={(r) => `Select ${r.name}`}
						rowHref={opts.links ? (r) => (r.id === "c" ? undefined : `/keys/${r.id}`) : undefined}
						stack={opts.stack}
					/>
				),
				el,
			),
		);
		return api;
	};

	const dispose = () => {
		for (const d of disposers) d();
	};
	return { dispose, rows, columns, changes, base, advanced };
}
