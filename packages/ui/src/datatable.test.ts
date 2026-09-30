import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import { $, type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

type Row = { id: string; name: string; score: number };
type Api = {
	rows: Signal<Row[]>;
	columns: Signal<unknown[]>;
	changes: Array<{ id: string; dir: string } | null>;
	base: unknown[];
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
