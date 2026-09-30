import { For, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	Button,
	CommandBar,
	Hotkey,
	InfiniteScroll,
	KanbanBoard,
	KanbanCard,
	KanbanColumn,
	ShareButton,
} from "../index.ts";

type Card = { id: string; title: string };

export function run(root: HTMLElement) {
	const loads = signal(0);
	const loading = signal(false);
	const hasMore = signal(true);
	const hotkeys = signal(0);
	const columns = signal<Record<string, Card[]>>({
		todo: [
			{ id: "c1", title: "Write docs" },
			{ id: "c2", title: "Fix bug" },
		],
		done: [{ id: "c3", title: "Ship" }],
	});
	const moves: Array<[string, string, number]> = [];
	const move = (cardId: string, to: string, index: number) => {
		moves.push([cardId, to, index]);
		const all = columns();
		const card = Object.values(all)
			.flat()
			.find((c) => c.id === cardId);
		if (!card) return;
		const next: Record<string, Card[]> = {};
		for (const [id, list] of Object.entries(all)) next[id] = list.filter((c) => c.id !== cardId);
		const target = [...(next[to] ?? [])];
		target.splice(index, 0, card);
		next[to] = target;
		columns.set(next);
	};

	const dispose = render(
		() => (
			<div>
				<InfiniteScroll
					data-test="infinite"
					loading={loading()}
					hasMore={hasMore()}
					onLoadMore={() => loads.set(loads() + 1)}
				>
					<p>rows</p>
				</InfiniteScroll>
				<ShareButton data-test="share" title="Arachne" url="https://example.com/x" />
				<Hotkey
					data-test="hotkey"
					keys={["Ctrl", "K"]}
					onTrigger={() => hotkeys.set(hotkeys() + 1)}
				/>
				<CommandBar data-test="toolbar" label="Formatting">
					<Button>Bold</Button>
					<Button>Italic</Button>
					<Button>Link</Button>
				</CommandBar>
				<KanbanBoard data-test="board" onMove={move}>
					<For each={Object.keys(columns())}>
						{(col) => (
							<KanbanColumn columnId={col} title={col === "todo" ? "To do" : "Done"}>
								<For each={columns()[col] ?? []}>
									{(card) => <KanbanCard cardId={card.id} title={card.title} />}
								</For>
							</KanbanColumn>
						)}
					</For>
				</KanbanBoard>
			</div>
		),
		root,
	);
	return { dispose, loads, loading, hasMore, hotkeys, columns, moves };
}
