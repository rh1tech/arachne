/**
 * Every component must forward attributes, merge `class`/`style`, accept theme
 * slot classes and honour `unstyled`. Groups register cases in
 * `fixtures/contract-<group>-harness.tsx`.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { THEME_CLASS } from "./test-utils/contract.tsx";
import { type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

const GROUPS = ["core", "ops", "app", "widgets", "surfaces", "forms", "data"] as const;

type Api = { cases: Array<{ name: string }> };

function probeTarget(key: string): HTMLElement {
	const el = document.querySelector<HTMLElement>(`[data-probe="${key}"]`);
	if (!el) throw new Error(`${key}: forwarded data-probe attribute not found in the DOM`);
	return el;
}

const builtIn = (el: Element) => [...el.classList].filter((c) => c.startsWith("a-"));

/** Every customization guarantee for one registered component, as failure messages. */
function contractFailures(name: string): string[] {
	let el: HTMLElement;
	let bare: HTMLElement;
	try {
		el = probeTarget(name);
		bare = probeTarget(`${name}:unstyled`);
	} catch (e) {
		return [(e as Error).message];
	}
	const checks: Array<[boolean, string]> = [
		[el.id === `probe-${name}`, "id not forwarded"],
		[el.classList.contains("probe-class"), "class not merged"],
		[el.classList.contains(THEME_CLASS), "theme class missing"],
		[el.style.getPropertyValue("--probe") === "1", "style not applied"],
		[builtIn(el).length > 0, "no built-in a-* class"],
		[
			el.getAttribute("aria-label") === `label-${name}`,
			`caller aria-label overridden (${el.getAttribute("aria-label")})`,
		],
		[builtIn(bare).length === 0, `unstyled kept ${builtIn(bare).join(" ")}`],
	];
	return checks.filter(([ok]) => !ok).map(([, message]) => `${name}: ${message}`);
}

for (const group of GROUPS) {
	describe(`customization contract: ${group}`, () => {
		let dom: Dom;
		let h: Mounted<Api>;

		beforeEach(async () => {
			dom = setupDom();
			h = await mountHarness<Api>(`contract-${group}`);
		});

		afterEach(() => {
			h.dispose();
			dom.teardown();
		});

		test("forwards attrs, merges class/style/theme, honours unstyled", () => {
			expect(h.api.cases.flatMap(({ name }) => contractFailures(name))).toEqual([]);
		});
	});
}
