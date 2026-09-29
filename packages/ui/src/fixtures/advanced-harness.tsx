import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import {
	CodeBlock,
	ColorPicker,
	ConfirmDialog,
	ContextMenu,
	Countdown,
	type DateRange,
	DateRangePicker,
	MonthPicker,
	SemiCircleProgress,
	Sparkline,
	Spotlight,
	Text,
	TimePicker,
	TransferList,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown", "contextmenu"]);

	const color = signal("#1e87f0");
	const month = signal("2026-09");
	const time = signal("12:00");
	const range = signal<DateRange>({ start: "2026-09-01" });
	const transfer = signal({ left: ["A", "B"], right: ["C"] });
	const spotlight = signal(false);
	const confirm = signal(false);

	render(
		() => (
			<div>
				<ColorPicker value={color()} onChange={(c) => color.set(c)} />
				<MonthPicker value={month()} onChange={(v) => month.set(v)} />
				<TimePicker value={time()} onChange={(v) => time.set(v)} />
				<DateRangePicker value={range()} onChange={(r) => range.set(r)} />
				<TransferList
					left={transfer().left}
					right={transfer().right}
					onChange={(n) => transfer.set(n)}
				/>
				<SemiCircleProgress value={50} label="50%" />
				<Sparkline data={[1, 3, 2, 5]} />
				<CodeBlock code="const x = 1;" language="ts" />
				<Countdown to={Date.now() + 60_000} />
				<button type="button" data-open-spotlight="" onClick={() => spotlight.set(true)}>
					Spotlight
				</button>
				<button type="button" data-open-confirm="" onClick={() => confirm.set(true)}>
					Confirm
				</button>
				<Spotlight
					open={spotlight()}
					onClose={() => spotlight.set(false)}
					actions={[
						{
							id: "a",
							label: "Action A",
							onSelect: () => {},
						},
					]}
				/>
				<ConfirmDialog
					open={confirm()}
					message="Sure?"
					onCancel={() => confirm.set(false)}
					onConfirm={() => confirm.set(false)}
				/>
				<ContextMenu
					items={[
						{
							id: "x",
							label: "Item",
							onSelect: () => {},
						},
					]}
				>
					<div data-ctx="">Right-click</div>
				</ContextMenu>
				<Text>ok</Text>
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
