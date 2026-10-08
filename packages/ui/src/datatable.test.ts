import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import type { Advanced, AdvancedOptions } from "./fixtures/datatable-harness.tsx";
import { $, type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

type Row = { id: string; name: string; score: number };
type Api = {
	rows: Signal<Row[]>;
	columns: Signal<unknown[]>;
	changes: Array<{ id: string; dir: string } | null>;
	base: unknown[];
	advanced: (opts: AdvancedOptions) => Advanced;
};

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("datatable");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const headers = () => [...document.querySelectorAll<HTMLElement>('[role="columnheader"]')];
const header = (label: string) =>
	headers().find((el) => el.textContent?.startsWith(label)) as HTMLElement;
const order = () =>
	[...document.querySelectorAll<HTMLElement>(".a-datatable-row")].map((r) => r.dataset["rowId"]);
const sortBy = (label: string) => $("button", header(label)).click();

describe("DataTable", () => {
	test("exposes ARIA table structure", () => {
		const table = $('[role="table"]');
		expect(table.getAttribute("aria-label")).toBe("Scores");
		expect([...table.children].filter((el) => el.getAttribute("role") === "rowgroup").length).toBe(
			2,
		);
		expect(table.querySelectorAll('[role="row"]').length).toBe(4);
		expect(table.querySelectorAll('[role="cell"]').length).toBe(9);
		expect(header("Name").getAttribute("aria-sort")).toBe("none");
		expect(header("Note").hasAttribute("aria-sort")).toBe(false);
		expect(header("Note").querySelector("button")).toBeNull();
	});

	test("header button cycles ascending → descending → none with natural string order", () => {
		sortBy("Name");
		expect(header("Name").getAttribute("aria-sort")).toBe("ascending");
		expect(header("Score").getAttribute("aria-sort")).toBe("none");
		expect(order()).toEqual(["c", "b", "a"]); // Item 1, item 2, item 10
		sortBy("Name");
		expect(header("Name").getAttribute("aria-sort")).toBe("descending");
		expect(order()).toEqual(["a", "b", "c"]);
		sortBy("Name");
		expect(header("Name").getAttribute("aria-sort")).toBe("none");
		expect(order()).toEqual(["a", "b", "c"]);
		expect(h.api.changes).toEqual([{ id: "name", dir: "asc" }, { id: "name", dir: "desc" }, null]);
	});

	test("numeric columns sort numerically and re-sort when rows change", () => {
		sortBy("Score");
		expect(order()).toEqual(["a", "c", "b"]); // 9, 20, 100
		h.api.rows.set([...h.api.rows(), { id: "d", name: "x", score: 1 }]);
		expect(order()).toEqual(["d", "a", "c", "b"]);
	});

	test("columns are reactive and the empty state renders", () => {
		h.api.columns.set(h.api.base.slice(0, 2));
		expect(headers().length).toBe(2);
		expect($(".a-datatable-row").style.getPropertyValue("grid-template-columns")).toBe(
			"repeat(2, minmax(0, 1fr))",
		);
		h.api.rows.set([]);
		expect($(".a-datatable-empty").textContent).toBe("No rows");
	});
});

/** Queries scoped to one advanced table (the basic table shares the document). */
function within(t: Advanced) {
	const all = <E extends Element = HTMLElement>(sel: string) => [...t.el.querySelectorAll<E>(sel)];
	const th = (label: string) =>
		all('[role="columnheader"]').find((el) => el.textContent?.startsWith(label)) as HTMLElement;
	return {
		all,
		th,
		rows: () => all(".a-datatable-row"),
		order: () => all(".a-datatable-row").map((r) => r.dataset["rowId"]),
		sortBy: (label: string) => $("button", th(label)).click(),
		boxes: () => all<HTMLInputElement>('.a-datatable-row input[type="checkbox"]'),
		selectAll: () => $('.a-datatable-head input[type="checkbox"]', t.el) as HTMLInputElement,
		selectedIds: () => all("[data-selected]").map((r) => r.dataset["rowId"]),
	};
}

describe("DataTable column layout", () => {
	test("column widths become grid tracks on the header and every row", () => {
		const t = within(h.api.advanced({}));
		const tracks = "9rem minmax(8rem,1fr) 2fr";
		expect(
			$(".a-datatable-head", t.all(".a-datatable")[0]).style.getPropertyValue(
				"grid-template-columns",
			),
		).toBe(tracks);
		for (const r of t.rows())
			expect(r.style.getPropertyValue("grid-template-columns")).toBe(tracks);
	});

	test("align lands on headers and cells; tables without align keep no data-align", () => {
		const t = within(h.api.advanced({}));
		expect(t.th("Seats").dataset["align"]).toBe("end");
		expect(t.th("Plan").dataset["align"]).toBe("center");
		expect(t.th("Key").hasAttribute("data-align")).toBe(false);
		expect(t.all('.a-datatable-td[data-align="end"]').length).toBe(3);
		expect($(".a-datatable").querySelector("[data-align]")).toBeNull();
	});

	test("sort header shows a chevron icon instead of arrow text", () => {
		sortBy("Name");
		const icon = $("svg.a-datatable-sort-icon", header("Name"));
		expect(icon.getAttribute("data-icon")).toBe("chevron-up");
		expect(icon.getAttribute("aria-hidden")).toBe("true");
		expect(header("Name").textContent).toBe("Name");
		sortBy("Name");
		expect($("svg", header("Name")).getAttribute("data-icon")).toBe("chevron-down");
	});
});

describe("DataTable sorting modes", () => {
	test("sortable without sortValue gets a sort button and aria-sort", () => {
		const t = within(h.api.advanced({}));
		expect(t.th("Plan").getAttribute("aria-sort")).toBe("none");
		t.sortBy("Plan");
		expect(t.th("Plan").getAttribute("aria-sort")).toBe("ascending");
		expect(t.order()).toEqual(["a", "b", "c"]); // nothing to sort by client-side
		expect(t.th("Key").hasAttribute("aria-sort")).toBe(false);
		expect(t.th("Key").querySelector("button")).toBeNull();
	});

	test("controlled sort wins over header clicks until the parent updates it", () => {
		const a = h.api.advanced({ controlledSort: true });
		const t = within(a);
		t.sortBy("Seats");
		expect(a.sortChanges).toEqual([{ id: "score", dir: "asc" }]);
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("none");
		expect(t.order()).toEqual(["a", "b", "c"]);
		a.sort.set({ id: "score", dir: "desc" });
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("descending");
		expect(t.order()).toEqual(["b", "c", "a"]);
		t.sortBy("Seats");
		expect(a.sortChanges.at(-1)).toBeNull(); // desc → none
		a.sort.set(null);
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("none");
		expect(t.order()).toEqual(["a", "b", "c"]);
	});

	test("manualSort renders rows as given and only reports the next sort", () => {
		const a = h.api.advanced({ controlledSort: true, manualSort: true });
		const t = within(a);
		a.sort.set({ id: "score", dir: "asc" });
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("ascending");
		expect(t.order()).toEqual(["a", "b", "c"]); // not re-sorted client-side
		t.sortBy("Seats");
		expect(a.sortChanges).toEqual([{ id: "score", dir: "desc" }]);
		a.rows.set([...a.rows()].reverse()); // the server answers
		a.sort.set({ id: "score", dir: "desc" });
		expect(t.order()).toEqual(["c", "b", "a"]);
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("descending");
	});

	test("manualSort without controlled sort still cycles aria-sort", () => {
		const a = h.api.advanced({ manualSort: true });
		const t = within(a);
		t.sortBy("Seats");
		t.sortBy("Seats");
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("descending");
		expect(t.order()).toEqual(["a", "b", "c"]);
		t.sortBy("Seats");
		expect(t.th("Seats").getAttribute("aria-sort")).toBe("none");
		expect(a.sortChanges).toEqual([
			{ id: "score", dir: "asc" },
			{ id: "score", dir: "desc" },
			null,
		]);
	});
});

describe("DataTable selection", () => {
	test("no selection markup without selectable", () => {
		expect(document.querySelector(".a-datatable-select")).toBeNull();
		expect(document.querySelector("[aria-selected]")).toBeNull();
		expect($(".a-datatable").hasAttribute("data-selectable")).toBe(false);
	});

	test("adds a labelled checkbox column and a select-all header", () => {
		const t = within(h.api.advanced({ selectable: true }));
		expect(t.boxes().map((b) => b.getAttribute("aria-label"))).toEqual([
			"Select item 10",
			"Select item 2",
			"Select Item 1",
		]);
		expect(t.all('.a-datatable-head [role="columnheader"]').length).toBe(4);
		expect(t.all('[role="cell"]').length).toBe(12);
		expect(t.selectAll().closest("label")?.textContent).toBe("Select all");
		expect(t.rows()[0]?.style.getPropertyValue("grid-template-columns")).toBe(
			"2.75rem 9rem minmax(8rem,1fr) 2fr",
		);
		expect(t.rows().map((r) => r.getAttribute("aria-selected"))).toEqual([
			"false",
			"false",
			"false",
		]);
	});

	test("row checkbox toggles selection, data-selected and aria-selected", () => {
		const a = h.api.advanced({ selectable: true });
		const t = within(a);
		t.boxes()[1]?.click();
		expect(a.selectionChanges).toEqual([["b"]]);
		expect(t.selectedIds()).toEqual(["b"]);
		expect(t.rows()[1]?.getAttribute("aria-selected")).toBe("true");
		expect(t.selectAll().indeterminate).toBe(true);
		expect(t.selectAll().checked).toBe(false);
		t.boxes()[1]?.click();
		expect(a.selectionChanges.at(-1)).toEqual([]);
		expect(t.selectedIds()).toEqual([]);
		expect(t.selectAll().indeterminate).toBe(false);
	});

	test("select-all selects every shown row, then clears them", () => {
		const a = h.api.advanced({ selectable: true });
		const t = within(a);
		t.boxes()[0]?.click();
		t.selectAll().click();
		expect(a.selectionChanges.at(-1)).toEqual(["a", "b", "c"]);
		expect(t.selectAll().checked).toBe(true);
		expect(t.selectAll().indeterminate).toBe(false);
		expect(t.boxes().every((b) => b.checked)).toBe(true);
		t.selectAll().click();
		expect(a.selectionChanges.at(-1)).toEqual([]);
		expect(t.boxes().some((b) => b.checked)).toBe(false);
	});

	test("controlled selection follows the parent and keeps ids of other pages", () => {
		const a = h.api.advanced({ selectable: true, controlledSelection: true, accept: true });
		const t = within(a);
		a.selected.set(["zz", "c"]);
		expect(t.selectedIds()).toEqual(["c"]);
		expect(t.boxes().map((b) => b.checked)).toEqual([false, false, true]);
		expect(t.selectAll().indeterminate).toBe(true);
		t.selectAll().click();
		expect(a.selected()).toEqual(["zz", "c", "a", "b"]);
		expect(t.selectAll().checked).toBe(true);
		t.selectAll().click();
		expect(a.selected()).toEqual(["zz"]);
		a.rows.set([]);
		expect(t.selectAll().disabled).toBe(true);
	});

	test("controlled selection ignores clicks the parent does not accept", () => {
		const a = h.api.advanced({ selectable: true, controlledSelection: true });
		const t = within(a);
		t.boxes()[0]?.click();
		expect(a.selectionChanges).toEqual([["a"]]);
		expect(t.boxes()[0]?.checked).toBe(false);
		expect(t.selectedIds()).toEqual([]);
	});
});

describe("DataTable row links", () => {
	test("rowHref puts a stretched link in the first data cell", () => {
		const t = within(h.api.advanced({ links: true, selectable: true }));
		const links = t.all<HTMLAnchorElement>("a.a-datatable-link");
		expect(links.map((l) => l.getAttribute("href"))).toEqual(["/keys/a", "/keys/b"]);
		expect(links[0]?.textContent).toBe("item 10");
		expect(links[0]?.closest('[role="cell"]')?.classList.contains("a-datatable-td")).toBe(true);
		expect(t.rows().map((r) => r.hasAttribute("data-linked"))).toEqual([true, true, false]);
		expect($(".a-datatable").querySelector("a")).toBeNull(); // the basic table has none
	});

	test("checkbox and cell button clicks do not go through the row link", () => {
		const a = h.api.advanced({ links: true, selectable: true });
		const t = within(a);
		let navigations = 0;
		for (const l of t.all("a.a-datatable-link")) l.addEventListener("click", () => navigations++);
		const box = t.boxes()[0] as HTMLInputElement;
		expect(box.closest("a")).toBeNull();
		box.click();
		$(".plan-action", t.rows()[0]).click();
		expect(navigations).toBe(0);
		expect(a.selectionChanges).toEqual([["a"]]);
		expect(window.location.pathname).toBe("/");
	});
});

describe("DataTable stacked layout", () => {
	test("stack labels every cell with its column header", () => {
		const t = within(h.api.advanced({ stack: true, selectable: true }));
		const root = t.all(".a-datatable")[0] as HTMLElement;
		expect(root.classList.contains("a-datatable-stack")).toBe(true);
		expect(root.hasAttribute("data-stack")).toBe(true);
		expect(t.all(".a-datatable-td").map((c) => c.dataset["label"])).toEqual(
			Array.from({ length: 3 }, () => ["Key", "Seats", "Plan"]).flat(),
		);
		expect(t.selectAll()).toBeTruthy();
	});

	test("tables without stack carry no data-label", () => {
		expect(document.querySelector("[data-label]")).toBeNull();
		expect($(".a-datatable").classList.contains("a-datatable-stack")).toBe(false);
	});
});
