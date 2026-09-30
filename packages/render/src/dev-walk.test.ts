import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { Window } from "happy-dom";
import { getFirstChild, getNextSibling } from "./index.ts";

let win: Window;
beforeEach(() => {
	win = new Window();
});
afterEach(() => win.close());

test("dev walkers return the same nodes as firstChild/nextSibling", () => {
	const root = win.document.createElement("div");
	root.innerHTML = "<h1>Title</h1><p>Body</p>";
	const h1 = getFirstChild(root as unknown as Node, "h1");
	expect((h1 as Element).tagName).toBe("H1");
	expect((getNextSibling(h1 as Node, "p") as Element).tagName).toBe("P");
});

test("a different element than the template expects warns (hydration mismatch)", () => {
	const warn = spyOn(console, "warn").mockImplementation(() => {});
	const root = win.document.createElement("div");
	root.innerHTML = "<h2>Title</h2>";
	getFirstChild(root as unknown as Node, "h1");
	expect(warn).toHaveBeenCalledTimes(1);
	expect(String(warn.mock.calls[0]?.[0])).toContain("expected <h1> but found <h2>");
	getNextSibling(root.firstChild as unknown as Node, "p");
	expect(String(warn.mock.calls[1]?.[0])).toContain("expected <p> but found nothing");
	warn.mockRestore();
});
