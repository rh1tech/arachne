/** Components whose names promise behaviour must actually deliver it. */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachne/signals";
import { $, type Dom, type Mounted, mountHarness, press, setupDom } from "./test-utils/dom.ts";

type Card = { id: string; title: string };
type Api = {
	loads: Signal<number>;
	loading: Signal<boolean>;
	hasMore: Signal<boolean>;
	hotkeys: Signal<number>;
	columns: Signal<Record<string, Card[]>>;
	moves: Array<[string, string, number]>;
};

let dom: Dom;
let h: Mounted<Api>;
let observers: Array<{ cb: IntersectionObserverCallback; el: Element[]; disconnected: boolean }> =
	[];
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

beforeEach(async () => {
	dom = setupDom();
	observers = [];
	const g = globalThis as unknown as Record<string, unknown>;
	g["IntersectionObserver"] = class {
		entry: { cb: IntersectionObserverCallback; el: Element[]; disconnected: boolean };
		constructor(cb: IntersectionObserverCallback) {
			this.entry = { cb, el: [], disconnected: false };
			observers.push(this.entry);
		}
		observe(el: Element) {
			this.entry.el.push(el);
		}
		disconnect() {
			this.entry.disconnected = true;
		}
		unobserve() {}
	};
	h = await mountHarness<Api>("behavior", ["click", "keydown", "input"]);
	await flush();
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const intersect = (visible: boolean) => {
	for (const o of observers.filter((o) => !o.disconnected)) {
		o.cb(
			o.el.map((target) => ({ isIntersecting: visible, target }) as IntersectionObserverEntry),
			{} as IntersectionObserver,
		);
	}
};

describe("InfiniteScroll", () => {
	test("loads when the sentinel scrolls into view, not while loading or finished", () => {
		intersect(true);
		expect(h.api.loads()).toBe(1);
		h.api.loading.set(true);
		intersect(true);
		expect(h.api.loads()).toBe(1);
		h.api.loading.set(false);
		h.api.hasMore.set(false);
		intersect(true);
		expect(h.api.loads()).toBe(1);
	});

	test("keeps a load-more button as the keyboard fallback", () => {
		$('[data-test="infinite"] button').click();
		expect(h.api.loads()).toBe(1);
	});
});

describe("ShareButton", () => {
	test("uses the Web Share API when available", async () => {
		const shared: unknown[] = [];
		Object.defineProperty(navigator, "share", {
			configurable: true,
			value: async (d: unknown) => shared.push(d),
		});
		$('[data-test="share"]').click();
		await flush();
		expect(shared).toEqual([{ title: "Arachne", url: "https://example.com/x" }]);
	});

	test("falls back to copying the link and confirms it", async () => {
		Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
		const copied: string[] = [];
		Object.defineProperty(navigator, "clipboard", {
			configurable: true,
			value: { writeText: async (t: string) => copied.push(t) },
		});
		$('[data-test="share"]').click();
		await flush();
		expect(copied).toEqual(["https://example.com/x"]);
		expect($('[data-test="share"]').hasAttribute("data-copied")).toBe(true);
	});
});

describe("Hotkey", () => {
	test("binds the displayed combination when onTrigger is set", () => {
		press("k", document.body, { ctrlKey: true });
		expect(h.api.hotkeys()).toBe(1);
		press("k", document.body);
		press("k", document.body, { ctrlKey: true, shiftKey: true });
		expect(h.api.hotkeys()).toBe(1);
		expect($('[data-test="hotkey"]').textContent).toContain("Ctrl");
	});
});

describe("CommandBar", () => {
	test("is a labelled toolbar with one tab stop and arrow-key focus", () => {
		const bar = $('[data-test="toolbar"]');
		expect(bar.getAttribute("role")).toBe("toolbar");
		expect(bar.getAttribute("aria-label")).toBe("Formatting");
		const buttons = [...bar.querySelectorAll<HTMLElement>("button")];
		expect(buttons.map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
		buttons[0]?.focus();
		press("ArrowRight");
		expect(document.activeElement).toBe(buttons[1] as HTMLElement);
		press("End");
		expect(document.activeElement).toBe(buttons[2] as HTMLElement);
		expect(buttons.map((b) => b.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
	});
});

describe("KanbanBoard", () => {
	const card = (id: string) => $(`[data-card-id="${id}"]`);

	test("cards are draggable and dropping on a column moves them", () => {
		expect(card("c1").getAttribute("draggable")).toBe("true");
		const data = new Map<string, string>();
		const dt = {
			setData: (k: string, v: string) => data.set(k, v),
			getData: (k: string) => data.get(k) ?? "",
			effectAllowed: "",
			dropEffect: "",
		};
		const fire = (el: Element, type: string) => {
			const e = new Event(type, { bubbles: true, cancelable: true });
			Object.defineProperty(e, "dataTransfer", { value: dt });
			el.dispatchEvent(e);
			return e;
		};
		fire(card("c1"), "dragstart");
		const done = $('[data-column-id="done"]');
		expect(fire(done, "dragover").defaultPrevented).toBe(true);
		fire(done, "drop");
		expect(h.api.moves).toEqual([["c1", "done", 1]]);
		expect(h.api.columns()["done"]?.map((c) => c.id)).toEqual(["c3", "c1"]);
	});

	test("Alt+arrows move cards between and within columns, announced and focus kept", async () => {
		card("c2").focus();
		press("ArrowRight", document.activeElement ?? document.body, { altKey: true });
		expect(h.api.moves).toEqual([["c2", "done", 1]]);
		await flush();
		expect(document.activeElement).toBe(card("c2"));
		expect($('[data-test="board"] [role="status"]').textContent).toContain("Fix bug");
		press("ArrowUp", document.activeElement ?? document.body, { altKey: true });
		expect(h.api.moves.at(-1)).toEqual(["c2", "done", 0]);
	});
});
