import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import {
	Burger,
	Calendar,
	Carousel,
	ColorSwatch,
	DatePicker,
	Dropzone,
	HoverCard,
	Subnav,
	Text,
	Tree,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "mouseenter", "mouseleave"]);

	const open = signal(false);
	const tab = signal("a");
	const date = signal("2026-09-28");

	render(
		() => (
			<div>
				<Burger opened={open()} onClick={() => open.set(!open())} />
				<ColorSwatch color="#1e87f0" />
				<HoverCard dropdown={<Text>Tip</Text>}>
					<span>Host</span>
				</HoverCard>
				<Subnav
					value={tab()}
					onChange={(id) => tab.set(id)}
					items={[
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					]}
				/>
				<Tree
					data={[
						{
							id: "root",
							label: "Root",
							children: [{ id: "child", label: "Child" }],
						},
					]}
				/>
				<Carousel
					slides={[
						{ id: "1", content: <Text>One</Text> },
						{ id: "2", content: <Text>Two</Text> },
					]}
				/>
				<Calendar value={date()} onChange={(v) => date.set(v)} />
				<DatePicker value={date()} onChange={(v) => date.set(v)} />
				<Dropzone onDrop={() => {}}>Drop</Dropzone>
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
	};
}
