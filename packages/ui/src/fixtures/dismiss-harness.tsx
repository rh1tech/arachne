import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { DatePicker, Menu } from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "pointerdown"]);

	const menuOpen = signal(false);
	const date = signal("2026-09-28");

	render(
		() => (
			<div>
				<button type="button" data-test="outside">
					Outside
				</button>
				<div class="a-menu-host">
					<button
						type="button"
						data-test="menu-trigger"
						class="a-btn a-btn-ghost"
						onClick={() => menuOpen.set(!menuOpen())}
					>
						Menu
					</button>
					<Menu
						open={menuOpen()}
						onClose={() => menuOpen.set(false)}
						items={[{ label: "One", onSelect: () => undefined }]}
					/>
				</div>
				<DatePicker value={date()} onChange={(v) => date.set(v)} />
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
		menuOpen: () => menuOpen(),
		dateOpen: () => Boolean(root.querySelector(".a-datepicker-dropdown")),
		pointerOutside: () => {
			const outside = root.querySelector('[data-test="outside"]') as HTMLElement;
			const Ev = globalThis.PointerEvent ?? globalThis.Event;
			outside.dispatchEvent(new Ev("pointerdown", { bubbles: true, cancelable: true }));
		},
	};
}
