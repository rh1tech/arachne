import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	ConfirmButton,
	DangerZone,
	Details,
	Diff,
	DonutChart,
	LoadingButton,
	Metric,
	Paper,
	PresenceAvatar,
	Reel,
	ReviewCard,
	SkeletonCard,
	SparkBar,
	Terminal,
	Testimonial,
	ToggleRow,
	Trend,
	Truncate,
	UploadItem,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown", "blur"]);

	const busy = signal(false);
	const on = signal(true);

	render(
		() => (
			<div>
				<PresenceAvatar name="Ada" />
				<Truncate>Long text that truncates</Truncate>
				<Trend value={4} />
				<Metric label="CPU" value="12%" trend={2} />
				<DonutChart value={40} label="40%" />
				<SparkBar data={[1, 3, 2, 5]} />
				<Terminal>echo hi</Terminal>
				<Diff
					lines={[
						{ type: "add", text: " added" },
						{ type: "del", text: " removed" },
					]}
				/>
				<SkeletonCard />
				<LoadingButton loading={busy()} onClick={() => busy.set(true)}>
					Go
				</LoadingButton>
				<ConfirmButton label="Delete" onConfirm={() => {}} />
				<ToggleRow label="Notify" checked={on()} onChange={(v) => on.set(v)} />
				<DangerZone>
					<span>Danger</span>
				</DangerZone>
				<Reel>
					<Paper>A</Paper>
					<Paper>B</Paper>
				</Reel>
				<Testimonial quote="Nice" author="Ada" />
				<ReviewCard rating={4}>Good</ReviewCard>
				<UploadItem name="a.js" progress={50} />
				<Details summary="More">Body</Details>
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
