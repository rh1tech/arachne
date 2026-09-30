/**
 * Live UI examples on the component reference pages. The build renders each
 * example to HTML in its `.ui-preview` slot (`data-ssr`); this chunk (with
 * `@arachnejs/ui` and every example), loaded on demand by the doc page,
 * hydrates each slot as it nears the viewport. Slots the build couldn't
 * render are rendered here instead. The stylesheet (`/ui.css`) comes with
 * the page's head.
 */
// The DOM entry, not "@arachnejs/render": the kit's SSR bundle follows the doc
// page's import() of this module, and the SSR runtime has no `render`.
import { delegateEvents, hydrate, render } from "@arachnejs/render/dom";
import { examples, Preview, renderIdOf } from "./preview.tsx";

/** Events the UI kit's compiled handlers are delegated for (beyond the kit's client set). */
const UI_EVENTS = [
	"dblclick",
	"mousedown",
	"mouseup",
	"mouseover",
	"mouseout",
	"touchstart",
	"touchend",
];

/** Hydrate examples this far before they scroll into view. */
const LOOKAHEAD = "600px 0px";

/** Extra room below a fixed-position demo (FAB, banner, bottom nav). */
const FIXED_GAP_PX = 16;

/**
 * Grow `box` so fixed-position children (bottom bars, floating buttons) fit
 * inside it; `transform` on the box makes it their containing block.
 */
function fitFixedChildren(box: HTMLElement): () => void {
	const fit = () => {
		const outer = box.getBoundingClientRect();
		let overflow = 0;
		for (const el of box.querySelectorAll<HTMLElement>("*")) {
			if (getComputedStyle(el).position !== "fixed") continue;
			const r = el.getBoundingClientRect();
			if (r.height === 0) continue;
			overflow = Math.max(overflow, outer.top - r.top, r.bottom - outer.bottom);
		}
		if (overflow > 0.5)
			box.style.minHeight = `${Math.ceil(outer.height + overflow + FIXED_GAP_PX)}px`;
	};
	const frame = requestAnimationFrame(fit);
	const observer = new ResizeObserver(fit);
	observer.observe(box);
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
	};
}

function mount(slot: HTMLElement): () => void {
	const name = slot.dataset["example"] ?? "";
	const example = examples.get(name);
	const status = (text: string) => {
		slot.textContent = "";
		const p = document.createElement("p");
		p.className = "ui-preview-status";
		p.textContent = text;
		slot.append(p);
	};
	if (!example) {
		status(`No live example for ${name}.`);
		return () => {};
	}
	try {
		const view = () => <Preview name={name} logs={slot.hasAttribute("data-logs")} />;
		const stop = slot.hasAttribute("data-ssr")
			? hydrate(view, slot, { renderId: renderIdOf(name) })
			: render(view, slot);
		slot.classList.add("is-live");
		const stage = slot.querySelector<HTMLElement>(".ui-preview-stage");
		const unfit = stage ? fitFixedChildren(stage) : () => {};
		return () => {
			unfit();
			stop();
		};
	} catch (error) {
		console.error(`[site] example ${name} failed`, error);
		status(`The ${name} example failed to render.`);
		return () => {};
	}
}

/**
 * Mount every `.ui-preview[data-example]` inside `root` as it nears the
 * viewport. Returns a function that unmounts them all (call it before the
 * page's HTML is replaced).
 */
export function mountPreviews(root: Element): () => void {
	delegateEvents(UI_EVENTS);
	const slots = [...root.querySelectorAll<HTMLElement>(".ui-preview[data-example]")];
	const unmount: (() => void)[] = [];
	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (!entry.isIntersecting) continue;
				observer.unobserve(entry.target);
				unmount.push(mount(entry.target as HTMLElement));
			}
		},
		{ rootMargin: LOOKAHEAD },
	);
	for (const slot of slots) observer.observe(slot);
	return () => {
		observer.disconnect();
		for (const stop of unmount) stop();
	};
}
