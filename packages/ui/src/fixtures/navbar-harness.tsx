import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { createNavbarController, Navbar, type NavMenuItem } from "../index.ts";

export function run(root: HTMLElement, opts: { trigger?: "hover" | "click" } = {}) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown"]);

	const selected = signal<string | null>(null);
	const ctrl = createNavbarController();

	const items: NavMenuItem[] = [
		{
			id: "product",
			label: "Product",
			children: [
				{
					id: "core",
					label: "Core",
					children: [
						{
							id: "signals",
							label: "Signals",
							onSelect: () => selected.set("signals"),
						},
						{
							id: "jsx",
							label: "JSX",
							onSelect: () => selected.set("jsx"),
						},
					],
				},
				{
					id: "docs",
					label: "Docs",
					onSelect: () => selected.set("docs"),
				},
			],
		},
		{
			id: "about",
			label: "About",
			onSelect: () => selected.set("about"),
		},
	];

	render(
		() => (
			<Navbar
				ctrl={ctrl}
				trigger={opts.trigger ?? "hover"}
				brand={<span>Arachne</span>}
				items={items}
			/>
		),
		root,
	);

	return {
		ctrl,
		selected: () => selected(),
		get: (sel: string) => root.querySelector(sel) ?? document.querySelector(sel),
		all: (sel: string) => {
			const inRoot = [...root.querySelectorAll(sel)];
			const inDoc = [...document.querySelectorAll(sel)];
			const seen = new Set(inRoot);
			for (const el of inDoc) {
				if (!seen.has(el)) inRoot.push(el);
			}
			return inRoot;
		},
		click: (sel: string) => {
			const el =
				(root.querySelector(sel) as HTMLElement | null) ??
				(document.querySelector(sel) as HTMLElement | null);
			el?.click();
		},
		dispose: () => ctrl.dispose(),
	};
}
