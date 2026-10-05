/** Which edges still have overflow, for the fade affordance in docs.css. */
type ScrollEdge = "none" | "start" | "end" | "both";

function edge(el: HTMLElement): ScrollEdge {
	const max = el.scrollWidth - el.clientWidth;
	if (max <= 1) return "none";
	const left = el.scrollLeft > 1;
	const right = el.scrollLeft < max - 1;
	if (left && right) return "both";
	if (left) return "start";
	return "end";
}

function sync(el: HTMLElement): void {
	const next = edge(el);
	if (el.dataset["scroll"] !== next) el.dataset["scroll"] = next;
}

/**
 * Keeps `data-scroll` on `.table-scroll` regions in sync with overflow so CSS
 * can fade the clipped edge(s).
 */
export function bindTableScroll(root: ParentNode): () => void {
	const tables = [...root.querySelectorAll<HTMLElement>(".table-scroll")];
	const cleanups: Array<() => void> = [];

	for (const el of tables) {
		const onScroll = () => sync(el);
		el.addEventListener("scroll", onScroll, { passive: true });
		const ro = new ResizeObserver(onScroll);
		ro.observe(el);
		const table = el.querySelector("table");
		if (table) ro.observe(table);
		sync(el);
		cleanups.push(() => {
			el.removeEventListener("scroll", onScroll);
			ro.disconnect();
			delete el.dataset["scroll"];
		});
	}

	return () => {
		for (const stop of cleanups) stop();
	};
}
