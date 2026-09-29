/**
 * Deterministic performance guard: DOM cost per component. Timing tests are
 * flaky in CI; node counts are not, and they catch the regressions that
 * matter (wrapper elements, duplicated layers). Lower is fine; raising a
 * budget should be a deliberate change.
 */
import { afterEach, beforeEach, expect, test } from "bun:test";
import { type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

/** Max elements / max total nodes (elements + text + range markers). */
const BUDGET: Record<string, { elements: number; nodes: number }> = {
	Button: { elements: 3, nodes: 5 },
	"Button (start+end)": { elements: 7, nodes: 10 },
	TextInput: { elements: 1, nodes: 1 },
	Badge: { elements: 1, nodes: 2 },
	Checkbox: { elements: 3, nodes: 4 },
	Card: { elements: 1, nodes: 2 },
	Tooltip: { elements: 3, nodes: 6 },
	Tabs: { elements: 9, nodes: 30 },
};

type Api = { counts: Record<string, { elements: number; nodes: number }> };
let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("budget");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

test("components stay within their DOM budget", () => {
	const over = Object.entries(h.api.counts).flatMap(([name, got]) => {
		const max = BUDGET[name];
		if (!max) return [`${name}: no budget`];
		return got.elements > max.elements || got.nodes > max.nodes
			? [
					`${name}: ${got.elements} elements / ${got.nodes} nodes (budget ${max.elements} / ${max.nodes})`,
				]
			: [];
	});
	expect(over).toEqual([]);
});

test("no layout wrapper elements are rendered", () => {
	const wrappers = [...document.querySelectorAll<HTMLElement>("[style]")].filter(
		(el) => el.style.display === "contents",
	);
	expect(wrappers.length).toBe(0);
});
