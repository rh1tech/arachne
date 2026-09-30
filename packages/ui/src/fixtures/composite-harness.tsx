import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	AvatarGroup,
	BarList,
	BottomNav,
	Button,
	ButtonGroup,
	Comment,
	DataTable,
	Leader,
	Meter,
	Notification,
	PasswordStrength,
	SortableList,
	Splitter,
	ToggleGroup,
	YearPicker,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown", "pointerdown"]);

	const toggle = signal<string | null>("a");
	const tab = signal("home");
	const items = signal([
		{ id: "1", label: "One" },
		{ id: "2", label: "Two" },
	]);
	const year = signal(2026);

	render(
		() => (
			<div>
				<ButtonGroup>
					<Button size="sm">A</Button>
					<Button size="sm" variant="ghost">
						B
					</Button>
				</ButtonGroup>
				<ToggleGroup
					value={toggle()}
					onChange={(v) => toggle.set(typeof v === "string" || v == null ? v : null)}
					items={[
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					]}
				/>
				<AvatarGroup names={["Ada", "Grace", "Alan"]} />
				<Notification title="Hi">Body</Notification>
				<BottomNav
					value={tab()}
					onChange={(id) => tab.set(id)}
					items={[
						{ id: "home", label: "Home", icon: "home" },
						{ id: "mail", label: "Mail", icon: "mail" },
					]}
				/>
				<SortableList items={items()} onChange={(next) => items.set(next)} />
				<PasswordStrength password="Abcdef1!" />
				<Meter value={40} label="Load" />
				<Comment author="Ada">Hello</Comment>
				<Leader label="A" value="1" />
				<BarList data={[{ id: "x", label: "X", value: 3 }]} />
				<Splitter left={<span>L</span>} right={<span>R</span>} />
				<YearPicker value={year()} onChange={(y) => year.set(y)} />
				<DataTable
					rows={[
						{ id: "1", name: "B" },
						{ id: "2", name: "A" },
					]}
					columns={[
						{
							id: "name",
							header: "Name",
							sortValue: (r) => r.name,
							cell: (r) => r.name,
						},
					]}
				/>
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
