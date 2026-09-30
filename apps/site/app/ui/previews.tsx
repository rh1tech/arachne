/**
 * Live UI examples on the component reference pages. Loaded on demand (its
 * own chunk, with `@arachnejs/ui` and every example) by the doc page when the
 * page has `.ui-preview[data-example]` placeholders; the UI stylesheet is
 * added the first time.
 */
import { For, Show } from "@arachnejs/render";
// The DOM entry, not "@arachnejs/render": the kit's SSR bundle follows the doc
// page's import() of this module, and the SSR runtime has no `render`.
import { delegateEvents, render } from "@arachnejs/render/dom";
import { signal, untrack } from "@arachnejs/signals";
import { actionLog } from "../../../../packages/ui/examples/actions.ts";
import { exampleGroups } from "../../../../packages/ui/examples/index.ts";

const examples = new Map(
	exampleGroups.flatMap((group) => group.examples.map((e) => [e.name, e] as const)),
);

/** The example the reader touched last: its event log shows the calls. */
const active = signal<string | undefined>(undefined);

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

/** Mount examples this far before they scroll into view. */
const LOOKAHEAD = "600px 0px";

/** Extra room below a fixed-position demo (FAB, banner, bottom nav). */
const FIXED_GAP_PX = 16;

let stylesheet: Promise<void> | undefined;

/** Add `/ui.css` once and let the kit follow the OS theme, as the site does. */
function loadStyles(): Promise<void> {
	stylesheet ??= new Promise((resolve) => {
		document.documentElement.dataset["theme"] = "system";
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "/ui.css";
		link.onload = link.onerror = () => resolve();
		document.head.append(link);
	});
	return stylesheet;
}

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

function EventLog(props: { name: string }) {
	const mine = () => active() === props.name && actionLog().length > 0;
	return (
		<output class="ui-preview-log" aria-live="polite" aria-label={`${props.name} event log`}>
			<Show
				when={mine()}
				fallback={<span>Interact with the example: callbacks show up here.</span>}
			>
				<For each={actionLog()}>
					{(entry) => (
						<code>
							{entry.name}({entry.args})
						</code>
					)}
				</For>
			</Show>
		</output>
	);
}

function Preview(props: { name: string; render: () => unknown; logs: boolean }) {
	// Built once, untracked: the example's own state patches the DOM in place.
	const content = untrack(props.render);
	return (
		<>
			<div
				class="ui-preview-stage"
				onPointerDown={() => active.set(props.name)}
				onFocusIn={() => active.set(props.name)}
			>
				{content}
			</div>
			<Show when={props.logs}>
				<EventLog name={props.name} />
			</Show>
		</>
	);
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
		const stop = render(
			() => (
				<Preview
					name={name}
					logs={slot.hasAttribute("data-logs")}
					render={() => (example.demo ? example.demo() : example.render({}))}
				/>
			),
			slot,
		);
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
	let stopped = false;
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
	void loadStyles().then(() => {
		if (stopped) return;
		for (const slot of slots) observer.observe(slot);
	});
	return () => {
		stopped = true;
		observer.disconnect();
		for (const stop of unmount) stop();
	};
}
