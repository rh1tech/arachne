import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { Pagination } from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click"]);

	const page = signal(3);

	render(() => <Pagination page={page()} pageCount={10} onChange={(n) => page.set(n)} />, root);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
		page,
	};
}
