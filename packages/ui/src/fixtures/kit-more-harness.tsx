import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import {
	AngleSlider,
	BackLink,
	Checklist,
	type ChecklistItemData,
	CookieConsent,
	CopyField,
	DotPagination,
	FileCard,
	Heatmap,
	Hotkey,
	InlineEdit,
	KanbanBoard,
	KanbanCard,
	KanbanColumn,
	PricingCard,
	SteppedProgress,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown", "pointerdown", "pointermove"]);

	const cookie = signal(true);
	const title = signal("Edit me");
	const items = signal<ChecklistItemData[]>([
		{ id: "1", label: "One", done: false },
		{ id: "2", label: "Two", done: true },
	]);
	const dots = signal(0);
	const angle = signal(30);

	render(
		() => (
			<div>
				<CookieConsent open={cookie()} onAccept={() => cookie.set(false)} />
				<Hotkey keys={["Ctrl", "S"]} />
				<BackLink />
				<InlineEdit value={title()} onChange={(v) => title.set(v)} />
				<CopyField value="secret" />
				<Checklist items={items()} onChange={(next) => items.set(next)} />
				<PricingCard name="Pro" price="$9" features={["A", "B"]} />
				<SteppedProgress steps={3} value={2} />
				<DotPagination count={3} value={dots()} onChange={(i) => dots.set(i)} />
				<FileCard name="a.txt" meta="1 KB" />
				<Heatmap values={[1, 2, 0, 4, 3, 1, 2]} />
				<AngleSlider value={angle()} onChange={(d) => angle.set(d)} />
				<KanbanBoard>
					<KanbanColumn title="Todo" count={1}>
						<KanbanCard title="Task" />
					</KanbanColumn>
				</KanbanBoard>
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel) ?? document.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
	};
}
