import { afterEach, beforeEach, expect, test } from "bun:test";
import { type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

let dom: Dom;
let h: Mounted<object>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<object>("doc-example");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

test("DocExample titles are h2 by default and follow titleOrder", () => {
	expect(document.querySelector("#default .a-doc-example-title")?.tagName).toBe("H2");
	expect(document.querySelector("#nested .a-doc-example-title")?.tagName).toBe("H4");
	expect(document.querySelector("#nested .a-doc-example-title")?.textContent).toBe("Sizes");
});

test("DocPage titles are h1 by default and follow titleOrder", () => {
	expect(document.querySelector("#page .a-doc-page-title")?.tagName).toBe("H1");
	expect(document.querySelector("#embedded .a-doc-page-title")?.tagName).toBe("H3");
});
