import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachne/signals";
import {
	$,
	click,
	type Dom,
	type Mounted,
	mountHarness,
	press,
	setupDom,
} from "./test-utils/dom.ts";

type Api = {
	order: Signal<1 | 2 | 3 | 4 | 5 | 6>;
	level: Signal<1 | 2 | 3 | 4 | 5 | 6>;
	ring: Signal<number>;
	meter: Signal<number>;
	password: Signal<string>;
	trend: Signal<number>;
	unread: Signal<number>;
	navVisible: Signal<boolean>;
	progressMax: Signal<number>;
	highlight: Signal<string>;
	swatch: Signal<string>;
	slide: Signal<string | undefined>;
	slides: Signal<Array<{ id: string; content: string }>>;
	sortable: Signal<Array<{ id: string; label: string }>>;
	confirmOpen: Signal<boolean>;
	confirmed: Signal<number>;
	cancelled: Signal<number>;
	spotOpen: Signal<boolean>;
	ran: Signal<string>;
	ctxPicked: Signal<string>;
	currency: Signal<string>;
	helpers: {
		clampToViewport: (
			x: number,
			y: number,
			w: number,
			h: number,
			vw: number,
			vh: number,
		) => { x: number; y: number };
		wrapIndex: (i: number, n: number) => number | null;
		percentOf: (v: number, m?: number) => number;
		matchesAccept: (f: { name: string; type: string }, accept?: string) => boolean;
		formatMoney: (n: number, c: string) => string;
	};
};

const flush = () => new Promise<void>((r) => queueMicrotask(r));

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("composite-fixes");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

describe("props stay reactive after mount", () => {
	test("Title size is visual only; order sets the heading level", () => {
		const title = $(".a-title");
		expect(title.tagName).toBe("H2");
		h.api.level.set(4);
		const resized = $(".a-title");
		expect(resized.tagName).toBe("H2");
		expect(resized.classList.contains("a-title-4")).toBe(true);

		const ordered = $('[data-test="ordered"]');
		expect(ordered.tagName).toBe("H2");
		expect(ordered.classList.contains("a-title-2")).toBe(true);
		h.api.order.set(4);
		expect($('[data-test="ordered"]').tagName).toBe("H4");
		expect(($(".a-heading") as HTMLElement).tagName).toBe("H3");
	});

	test("Subtitle is a paragraph unless given an order", () => {
		expect($('[data-test="sub"]').tagName).toBe("P");
		expect($('[data-test="sub-heading"]').tagName).toBe("H3");
		expect($('[data-test="sub-heading"]').classList.contains("a-subtitle-5")).toBe(true);
	});

	test("RingProgress, Meter, PasswordStrength, StatCard follow their values", () => {
		const bar = $(".a-ring-bar");
		const before = bar.getAttribute("stroke-dashoffset");
		h.api.ring.set(80);
		expect(bar.getAttribute("stroke-dashoffset")).not.toBe(before);
		expect($(".a-ring").getAttribute("aria-valuenow")).toBe("80");

		h.api.meter.set(75);
		expect($(".a-meter-bar").style.width).toBe("75%");

		expect($(".a-pw-strength-label").textContent).toBe("Enter a password");
		h.api.password.set("Correct-Horse-9");
		expect($(".a-pw-strength").getAttribute("data-score")).toBe("4");
		expect($(".a-pw-strength-label").textContent).toBe("Strong");

		h.api.trend.set(-3);
		const trend = $(".a-stat-card-trend");
		expect(trend.textContent).toBe("-3%");
		expect(trend.classList.contains("a-stat-card-down")).toBe(true);
	});

	test("UnreadBadge and NavigationProgress mount and unmount with their conditions", () => {
		expect(document.querySelector(".a-unread")).toBeNull();
		h.api.unread.set(120);
		expect($(".a-unread").textContent).toBe("99+");
		h.api.unread.set(0);
		expect(document.querySelector(".a-unread")).toBeNull();

		expect(document.querySelector(".a-nav-progress")).toBeNull();
		h.api.navVisible.set(true);
		expect($(".a-nav-progress").getAttribute("aria-valuenow")).toBe("40");
	});

	test("Highlight, ColorSwatch and Price update", () => {
		expect($(".a-highlight mark").textContent).toBe("Ar");
		h.api.highlight.set("frame");
		expect($(".a-highlight mark").textContent).toBe("frame");

		h.api.swatch.set("#00ff00");
		expect($(".a-swatch").getAttribute("aria-label")).toBe("Color #00ff00");

		h.api.currency.set("not-a-currency");
		expect($(".a-price-amount").textContent).toContain("10.00");
	});
});

describe("math guards", () => {
	test("Progress with max 0 renders 0% instead of NaN", () => {
		expect($(".a-progress-bar").style.width).toBe("0%");
		const { percentOf, wrapIndex, clampToViewport } = h.api.helpers;
		expect(percentOf(Number.NaN, 10)).toBe(0);
		expect(percentOf(5, -1)).toBe(0);
		expect(percentOf(15, 10)).toBe(100);
		expect(wrapIndex(-1, 3)).toBe(2);
		expect(wrapIndex(0, 0)).toBeNull();
		expect(clampToViewport(990, 700, 200, 150, 1024, 768)).toEqual({ x: 816, y: 610 });
	});

	test("matchesAccept and formatMoney", () => {
		const { matchesAccept, formatMoney } = h.api.helpers;
		expect(matchesAccept({ name: "a.PNG", type: "image/png" }, "image/*")).toBe(true);
		expect(matchesAccept({ name: "a.pdf", type: "application/pdf" }, "image/*,.txt")).toBe(false);
		expect(matchesAccept({ name: "notes.txt", type: "" }, "image/*, .txt")).toBe(true);
		expect(matchesAccept({ name: "x", type: "" }, undefined)).toBe(true);
		expect(formatMoney(1, "not-a-currency")).toBe("NOT-A-CURRENCY 1.00");
		expect(formatMoney(Number.NaN, "EUR")).toBe("—");
	});
});

describe("a11y semantics", () => {
	test("Alert role follows tone; NavLink is a real link; Segmented is named", () => {
		const alerts = document.querySelectorAll(".a-alert");
		expect(alerts[0]?.getAttribute("role")).toBe("alert");
		expect(alerts[1]?.getAttribute("role")).toBe("status");

		const link = $("a.a-navlink");
		expect(link.getAttribute("href")).toBe("/docs");
		expect(link.getAttribute("aria-current")).toBe("page");

		expect($(".a-segmented").getAttribute("aria-label")).toBe("View");
		expect($(".a-segmented").tagName).toBe("FIELDSET");
	});

	test("Steps without onChange are not disabled buttons", () => {
		expect(document.querySelectorAll(".a-steps button").length).toBe(0);
		expect($(".a-step-current").getAttribute("aria-current")).toBe("step");
	});

	test("Marquee duplicates content for a seamless loop, hiding the copy", () => {
		const groups = document.querySelectorAll(".a-marquee-group");
		expect(groups.length).toBe(2);
		expect(groups[1]?.getAttribute("aria-hidden")).toBe("true");
		expect(document.querySelectorAll(".marquee-item").length).toBe(2);
	});
});

describe("Carousel", () => {
	test("follows controlled value and clamps when slides shrink", () => {
		h.api.slide.set("s3");
		expect($(".a-carousel-status").textContent).toBe("3 / 3");
		expect($(".a-carousel-slide").textContent).toBe("Three");
		h.api.slide.set(undefined);
		click('.a-carousel-controls button[aria-label="Next"]');
		expect(h.api.slide()).toBe("s2");
		h.api.slides.set([{ id: "s1", content: "One" }]);
		h.api.slide.set(undefined);
		expect($(".a-carousel-status").textContent).toBe("1 / 1");
	});
});

describe("SortableList", () => {
	test("keeps row DOM and focus when moving an item", () => {
		const firstRow = $(".a-sortable-item");
		const down = firstRow.querySelector<HTMLButtonElement>('button[aria-label="Move down"]');
		down?.focus();
		down?.click();
		expect(h.api.sortable().map((i) => i.id)).toEqual(["b", "a", "c"]);
		expect([...document.querySelectorAll(".a-sortable-label")].map((el) => el.textContent)).toEqual(
			["B", "A", "C"],
		);
		expect(firstRow.dataset["id"]).toBe("a");
		expect(document.activeElement).toBe(down as HTMLButtonElement);
	});
});

describe("ConfirmDialog", () => {
	test("labels itself, focuses Cancel, Escape cancels", async () => {
		h.api.confirmOpen.set(true);
		await flush();
		const dialog = $('[role="alertdialog"]');
		expect(document.querySelector(".a-confirm")).toBeTruthy();
		expect(dialog.getAttribute("aria-labelledby")).toBeTruthy();
		expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
		expect(document.activeElement?.textContent).toBe("Cancel");
		press("Escape");
		expect(h.api.cancelled()).toBe(1);
		expect(h.api.confirmOpen()).toBe(false);
	});
});

describe("Spotlight", () => {
	test("autofocuses the combobox, arrows move the active option, Enter runs it", async () => {
		h.api.spotOpen.set(true);
		await flush();
		const input = $(".a-spotlight-input");
		expect(document.activeElement).toBe(input);
		expect(input.getAttribute("role")).toBe("combobox");
		press("ArrowDown");
		const active = $('[role="option"][aria-selected="true"]');
		expect(active.textContent).toContain("Open file");
		expect(input.getAttribute("aria-activedescendant")).toBe(active.id);
		press("Enter");
		expect(h.api.ran()).toBe("open");
		expect(h.api.spotOpen()).toBe(false);
	});
});

describe("ContextMenu", () => {
	test("focuses the first enabled item, arrows navigate, Escape closes", async () => {
		const target = $('[data-test="ctx-target"]');
		target.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, clientX: 5, clientY: 5 }));
		await flush();
		const items = [...document.querySelectorAll<HTMLElement>('.a-context-menu [role="menuitem"]')];
		expect(items.length).toBe(3);
		expect(document.activeElement).toBe(items[1] as HTMLElement);
		press("ArrowDown");
		expect(document.activeElement).toBe(items[2] as HTMLElement);
		press("Escape");
		expect(document.querySelector(".a-context-menu")).toBeNull();
	});
});
