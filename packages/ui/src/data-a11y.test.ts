/**
 * Keyboard / ARIA models for Tree (WAI-ARIA tree), Calendar & DatePicker
 * (date grid) and TransferList row stability.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import { $, type Dom, type Mounted, mountHarness, press, setupDom } from "./test-utils/dom.ts";

type Api = {
	tree: Signal<string | undefined>;
	day: Signal<string>;
	guarded: Signal<string | undefined>;
	picked: Signal<string>;
	left: Signal<string[]>;
	right: Signal<string[]>;
	query: Signal<string>;
	rich: Signal<string | undefined>;
	toggles: string[];
	addMonths: (iso: string, months: number) => string;
	calendarKeyTarget: (
		key: string,
		shift: boolean,
		iso: string,
		weekStartsOn?: number,
	) => string | null;
};

const flush = () => new Promise<void>((r) => queueMicrotask(r));

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("data-a11y");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const item = (id: string) => $(`[data-test="tree"] [data-tree-id="${id}"]`);
const focusedId = () => (document.activeElement as HTMLElement | null)?.dataset["treeId"];

describe("Tree", () => {
	test("is a tree with one tab stop, levels and collapsed parents", () => {
		const tree = $('[data-test="tree"]');
		expect(tree.getAttribute("role")).toBe("tree");
		expect(tree.getAttribute("aria-label")).toBe("Files");
		const stops = [...tree.querySelectorAll('[role="treeitem"][tabindex="0"]')];
		expect(stops.map((el) => (el as HTMLElement).dataset["treeId"])).toEqual(["src"]);
		expect(item("src").getAttribute("aria-level")).toBe("1");
		expect(item("src").getAttribute("aria-expanded")).toBe("false");
		expect(item("readme").hasAttribute("aria-expanded")).toBe(false);
	});

	test("arrow keys expand, enter, collapse and walk the visible items", () => {
		item("src").focus();
		press("ArrowRight");
		expect(item("src").getAttribute("aria-expanded")).toBe("true");
		expect(focusedId()).toBe("src");
		expect(item("app").closest('[role="group"]')).toBeTruthy();
		expect(item("app").getAttribute("aria-level")).toBe("2");

		press("ArrowRight");
		expect(focusedId()).toBe("app");
		press("ArrowDown");
		expect(focusedId()).toBe("lib");
		press("ArrowRight");
		press("ArrowRight");
		expect(focusedId()).toBe("util");
		expect(item("util").getAttribute("aria-level")).toBe("3");

		press("ArrowLeft");
		expect(focusedId()).toBe("lib");
		press("ArrowLeft");
		expect(item("lib").getAttribute("aria-expanded")).toBe("false");
		press("End");
		expect(focusedId()).toBe("readme");
		press("Home");
		expect(focusedId()).toBe("src");
		press("ArrowUp");
		expect(focusedId()).toBe("src");
	});

	test("type-ahead jumps to the next visible label and * expands siblings", () => {
		item("src").focus();
		press("r");
		expect(focusedId()).toBe("readme");
		press("s");
		expect(focusedId()).toBe("src");
		press("*");
		expect(item("src").getAttribute("aria-expanded")).toBe("true");
		press("a");
		expect(focusedId()).toBe("app");
		press("z");
		expect(focusedId()).toBe("app");
		press("r", document.activeElement ?? document.body, { ctrlKey: true });
		expect(focusedId()).toBe("app");
	});

	test("Enter selects, roving tab stop follows focus", () => {
		item("src").focus();
		press("ArrowDown");
		press("Enter");
		expect(h.api.tree()).toBe("readme");
		expect(item("readme").getAttribute("aria-selected")).toBe("true");
		expect(item("src").getAttribute("aria-selected")).toBe("false");
		expect(item("readme").getAttribute("tabindex")).toBe("0");
		expect(item("src").getAttribute("tabindex")).toBe("-1");
	});

	test("clicking the toggle expands without selecting; clicking a label selects", () => {
		$('[data-tree-id="src"] [data-tree-toggle]').click();
		expect(item("src").getAttribute("aria-expanded")).toBe("true");
		expect(h.api.tree()).toBeUndefined();
		$('[data-tree-id="app"] .a-tree-label').click();
		expect(h.api.tree()).toBe("app");
		expect(focusedId()).toBe("app");
	});
});

describe("Tree extras", () => {
	const rich = (id: string) => $(`[data-test="rich"] [data-tree-id="${id}"]`);
	const visibleIds = () =>
		[...document.querySelectorAll<HTMLElement>('[data-test="rich"] [role="treeitem"]')].map(
			(el) => el.dataset["treeId"],
		);

	test("clicking a parent row selects and expands it; onToggle reports it", () => {
		$('[data-test="rich"] [data-tree-id="pkgs"] .a-tree-label').click();
		expect(h.api.rich()).toBe("pkgs");
		expect(rich("pkgs").getAttribute("aria-expanded")).toBe("true");
		expect(h.api.toggles).toEqual(["pkgs:true"]);
	});

	test("auto icons, own icons and badges render; disabled nodes can't be selected", () => {
		$('[data-test="rich"] [data-tree-id="pkgs"] [data-tree-toggle]').click();
		expect($('[data-tree-id="pkgs"] > .a-tree-row .a-tree-icon')).toBeTruthy();
		expect($('[data-tree-id="pkgs"] > .a-tree-row .a-tree-badge').textContent).toBe("2");
		expect(rich("forms").getAttribute("aria-disabled")).toBe("true");
		$('[data-tree-id="forms"] .a-tree-label').click();
		expect(h.api.rich()).toBeUndefined();
	});

	test("filter shows matches with their ancestors, expanded and highlighted", async () => {
		h.api.query.set("guide");
		await flush();
		expect(visibleIds()).toEqual(["docs", "guide"]);
		expect(rich("docs").getAttribute("aria-expanded")).toBe("true");
		expect($('[data-tree-id="guide"] mark').textContent).toBe("guide");
		h.api.query.set("nothing-matches");
		await flush();
		expect($('[data-test="rich"] .a-tree-empty').textContent).toBe("No matches");
		h.api.query.set("");
		await flush();
		expect(visibleIds()).toEqual(["pkgs", "docs"]);
	});
});

const cal = (name: string) => $(`[data-test="${name}"]`);
const dayButton = (name: string, iso: string) => $(`[data-date="${iso}"]`, cal(name));
const focusedDate = () => (document.activeElement as HTMLElement | null)?.dataset["date"];

describe("Calendar", () => {
	test("exposes a labelled grid with full-date day labels and selection", () => {
		const grid = $('[role="grid"]', cal("cal"));
		const label = $(`#${grid.getAttribute("aria-labelledby")}`);
		expect(label.textContent).toContain("September 2026");
		expect(grid.querySelectorAll('[role="columnheader"]').length).toBe(7);
		expect(grid.querySelector('[role="columnheader"]')?.getAttribute("aria-label")).toBe("Sunday");

		const d29 = dayButton("cal", "2026-09-29");
		const name = d29.getAttribute("aria-label") ?? "";
		for (const part of ["Tuesday", "29", "September", "2026"]) expect(name).toContain(part);
		expect(d29.closest('[role="gridcell"]')?.getAttribute("aria-selected")).toBe("true");
		expect(
			dayButton("cal", "2026-09-28").closest('[role="gridcell"]')?.getAttribute("aria-selected"),
		).toBe("false");
		expect(cal("cal").querySelectorAll('[data-date][tabindex="0"]').length).toBe(1);
		expect(d29.getAttribute("tabindex")).toBe("0");
	});

	test("marks today with aria-current=date", () => {
		const current = cal("today").querySelectorAll('[aria-current="date"]');
		expect(current.length).toBe(1);
	});

	test("arrow / Home / End / PageUp / PageDown move focus across days and months", () => {
		dayButton("cal", "2026-09-29").focus();
		press("ArrowRight");
		expect(focusedDate()).toBe("2026-09-30");
		press("ArrowDown");
		expect(focusedDate()).toBe("2026-10-07");
		expect($('[role="grid"]', cal("cal")).textContent).toContain("31");
		expect(cal("cal").textContent).toContain("October 2026");
		press("PageUp");
		expect(focusedDate()).toBe("2026-09-07");
		press("Home");
		expect(focusedDate()).toBe("2026-09-06");
		press("End");
		expect(focusedDate()).toBe("2026-09-12");
		press("ArrowUp");
		expect(focusedDate()).toBe("2026-09-05");
		press("PageDown", document.activeElement ?? document.body, { shiftKey: true });
		expect(focusedDate()).toBe("2027-09-05");
		expect(h.api.day()).toBe("2026-09-29");
	});

	test("clicking a day selects it", () => {
		dayButton("cal", "2026-09-12").click();
		expect(h.api.day()).toBe("2026-09-12");
		expect(
			dayButton("cal", "2026-09-12").closest('[role="gridcell"]')?.getAttribute("aria-selected"),
		).toBe("true");
	});

	test("min / max / isDateDisabled block selection and weekStartsOn reorders columns", () => {
		const grid = $('[role="grid"]', cal("guarded"));
		expect(grid.querySelector('[role="columnheader"]')?.getAttribute("aria-label")).toBe("Monday");
		// Sept 1 2026 is a Tuesday: one leading blank when weeks start on Monday.
		const firstRow = grid.querySelectorAll('[role="rowgroup"] [role="row"]')[0];
		expect(
			firstRow
				?.querySelectorAll('[role="gridcell"]')[1]
				?.querySelector("[data-date]")
				?.getAttribute("data-date"),
		).toBe("2026-09-01");

		for (const iso of ["2026-09-05", "2026-09-15", "2026-09-28"]) {
			const btn = dayButton("guarded", iso);
			expect(btn.getAttribute("aria-disabled")).toBe("true");
			btn.click();
			expect(h.api.guarded()).toBeUndefined();
		}
		dayButton("guarded", "2026-09-16").click();
		expect(h.api.guarded()).toBe("2026-09-16");
		expect(
			[...cal("guarded").querySelectorAll("button")].find(
				(b) => b.getAttribute("aria-label") === "Previous month",
			)?.disabled,
		).toBe(true);
	});

	test("date math clamps month ends and respects week start", () => {
		expect(h.api.addMonths("2026-01-31", 1)).toBe("2026-02-28");
		expect(h.api.addMonths("2024-01-31", 1)).toBe("2024-02-29");
		expect(h.api.addMonths("2026-03-31", -1)).toBe("2026-02-28");
		expect(h.api.calendarKeyTarget("Home", false, "2026-09-06", 1)).toBe("2026-08-31");
		expect(h.api.calendarKeyTarget("End", false, "2026-09-06", 1)).toBe("2026-09-06");
		expect(h.api.calendarKeyTarget("Tab", false, "2026-09-06")).toBeNull();
	});
});

describe("DatePicker", () => {
	test("opening focuses the selected day; picking closes and returns focus", async () => {
		const trigger = $('[data-test="picker"] [data-datepicker-trigger]');
		trigger.click();
		await flush();
		expect(focusedDate()).toBe("2026-09-29");
		press("ArrowLeft");
		(document.activeElement as HTMLElement).click();
		expect(h.api.picked()).toBe("2026-09-28");
		expect(document.querySelector('[data-test="picker"] [role="grid"]')).toBeNull();
		expect(document.activeElement).toBe(trigger);
	});

	test("Escape closes and returns focus to the trigger", async () => {
		const trigger = $('[data-test="picker"] [data-datepicker-trigger]');
		trigger.click();
		await flush();
		press("Escape");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		expect(document.activeElement).toBe(trigger);
	});
});

describe("TransferList", () => {
	test("moving an item keeps the other rows' DOM and exposes pressed state", () => {
		const items = () => [
			...document.querySelectorAll<HTMLElement>('[data-test="transfer"] .a-transfer-item'),
		];
		const beta = items().find((b) => b.textContent === "beta");
		const alpha = items().find((b) => b.textContent === "alpha") as HTMLElement;
		alpha.click();
		expect(alpha.getAttribute("aria-pressed")).toBe("true");
		$('[data-test="transfer"] [aria-label="Move to selected"]').click();
		expect(h.api.right()).toEqual(["alpha"]);
		expect(items().find((b) => b.textContent === "beta")).toBe(beta as HTMLElement);
	});
});
