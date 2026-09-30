import { render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	AngleSlider,
	AutosaveIndicator,
	BottomSheet,
	BuildStatus,
	Checklist,
	type ChecklistItemData,
	ConfirmButton,
	DonutChart,
	DotPagination,
	Gauge,
	Heatmap,
	Icon,
	type IconName,
	InlineEdit,
	JsonViewer,
	RelativeTime,
	SparkBar,
	ThemeToggle,
	Trend,
	UploadItem,
	UsageMeter,
} from "../index.ts";

export function run(root: HTMLElement) {
	const icon = signal<IconName>("copy");
	const theme = signal<"light" | "dark">("light");
	const save = signal<"idle" | "saving" | "saved" | "error">("saving");
	const build = signal<"running" | "success">("running");
	const value = signal(25);
	const max = signal(100);
	const trend = signal(2);
	const angle = signal(0);
	const bars = signal([1, 2]);
	const checklist = signal<ChecklistItemData[]>([{ id: "a", label: "A", done: false }]);
	const acceptChecks = signal(true);
	const dots = signal(3);
	const page = signal(0);
	const json = signal<unknown>({ a: 1 });
	const time = signal<number>(Date.now());
	const text = signal("Title");
	const edits = signal<string[]>([]);
	const confirms = signal(0);
	const sheet = signal(false);

	const dispose = render(
		() => (
			<div>
				<span data-test="icon">
					<Icon name={icon()} />
				</span>
				<ThemeToggle value={theme()} onChange={(t) => theme.set(t)} />
				<AutosaveIndicator state={save()} />
				<BuildStatus status={build()} />
				<span data-test="gauge">
					<Gauge value={value()} max={max()} />
				</span>
				<span data-test="donut">
					<DonutChart value={value()} />
				</span>
				<span data-test="upload">
					<UploadItem name="a.png" progress={value()} />
				</span>
				<span data-test="usage">
					<UsageMeter label="Seats" used={value()} limit={max()} />
				</span>
				<span data-test="trend">
					<Trend value={trend()} />
				</span>
				<span data-test="angle">
					<AngleSlider value={angle()} onChange={(d) => angle.set(d)} />
				</span>
				<span data-test="sparkbar">
					<SparkBar data={bars()} />
				</span>
				<span data-test="heatmap">
					<Heatmap values={bars()} />
				</span>
				<span data-test="checklist">
					<Checklist
						items={checklist()}
						onChange={(items) => {
							if (acceptChecks()) checklist.set(items);
						}}
					/>
				</span>
				<span data-test="dots">
					<DotPagination count={dots()} value={page()} onChange={(i) => page.set(i)} />
				</span>
				<span data-test="json">
					<JsonViewer value={json()} />
				</span>
				<span data-test="time">
					<RelativeTime value={time()} />
				</span>
				<span data-test="inline">
					<InlineEdit
						value={text()}
						onChange={(v) => {
							edits.set([...edits(), v]);
							text.set(v);
						}}
					/>
				</span>
				<span data-test="confirm">
					<ConfirmButton label="Delete" onConfirm={() => confirms.set(confirms() + 1)} />
				</span>
				<button type="button" data-test="sheet-trigger" onClick={() => sheet.set(true)}>
					sheet
				</button>
				<BottomSheet open={sheet()} onClose={() => sheet.set(false)} title="Filters">
					<button type="button" data-test="sheet-first">
						First
					</button>
				</BottomSheet>
			</div>
		),
		root,
	);

	return {
		dispose,
		icon,
		theme,
		save,
		build,
		value,
		max,
		trend,
		angle,
		bars,
		checklist,
		acceptChecks,
		dots,
		page,
		json,
		time,
		text,
		edits,
		confirms,
		sheet,
	};
}
