/** WAI-ARIA menubar keyboard model for the desktop Navbar. */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachne/signals";
import { type Dom, type Mounted, mountHarness, press, setupDom } from "./test-utils/dom.ts";

type Api = { ctrl: { openPath: () => string[] }; picked: Signal<string> };

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("navbar-keys");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const item = (label: string) => {
	const el = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')].find(
		(e) => e.textContent?.trim().replace(/[▾▸]/g, "") === label,
	);
	if (!el) throw new Error(`no menuitem ${label}`);
	return el;
};
const active = () => document.activeElement?.textContent?.trim().replace(/[▾▸]/g, "");

describe("Navbar menubar keyboard", () => {
	test("menubar is one tab stop with ← → Home End (wrapping)", () => {
		const bar = [
			...document.querySelectorAll<HTMLElement>('[role="menubar"] > li > [role="menuitem"]'),
		];
		expect(bar.map((b) => b.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
		item("Docs").focus();
		press("ArrowRight");
		expect(active()).toBe("Product");
		expect(bar.map((b) => b.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
		press("End");
		expect(active()).toBe("Blog");
		press("ArrowRight");
		expect(active()).toBe("Docs");
		press("ArrowLeft");
		expect(active()).toBe("Blog");
		press("Home");
		expect(active()).toBe("Docs");
	});

	test("↓ opens a submenu and focuses its first item; ↑ ↓ move inside it", () => {
		item("Product").focus();
		press("ArrowDown");
		expect(h.api.ctrl.openPath()).toEqual(["product"]);
		expect(active()).toBe("Signals");
		press("ArrowDown");
		expect(active()).toBe("JSX");
		press("ArrowDown");
		expect(active()).toBe("Signals");
		press("End");
		expect(active()).toBe("JSX");
	});

	test("→ opens nested menus or moves to the next top item; ← walks back", () => {
		item("Product").focus();
		press("ArrowDown");
		press("End");
		press("ArrowRight");
		expect(h.api.ctrl.openPath()).toEqual(["product", "jsx"]);
		expect(active()).toBe("Deep");
		press("ArrowLeft");
		expect(h.api.ctrl.openPath()).toEqual(["product"]);
		expect(active()).toBe("JSX");
		press("Home");
		press("ArrowRight");
		expect(h.api.ctrl.openPath()).toEqual([]);
		expect(active()).toBe("Blog");
	});

	test("Escape closes and returns focus to the top-level trigger", () => {
		item("Product").focus();
		press("ArrowDown");
		press("Escape");
		expect(h.api.ctrl.openPath()).toEqual([]);
		expect(active()).toBe("Product");
	});
});
