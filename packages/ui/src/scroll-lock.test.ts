import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { lockBodyScroll } from "./scroll-lock.ts";
import { type Dom, setupDom } from "./test-utils/dom.ts";

let dom: Dom;

function fakeScrollbar(width: number): void {
	Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
	Object.defineProperty(document.documentElement, "clientWidth", {
		configurable: true,
		value: 1000 - width,
	});
}

beforeEach(() => {
	dom = setupDom();
});

afterEach(() => dom.teardown());

describe("lockBodyScroll", () => {
	test("adds the scrollbar width to existing body padding and restores it", () => {
		fakeScrollbar(15);
		document.body.style.paddingRight = "10px";
		const unlock = lockBodyScroll();
		expect(document.body.style.overflow).toBe("hidden");
		expect(document.body.style.paddingRight).toBe("25px");
		expect(document.documentElement.style.getPropertyValue("--a-scrollbar-gap")).toBe("15px");
		unlock();
		expect(document.body.style.paddingRight).toBe("10px");
		expect(document.body.style.overflow).toBe("");
		expect(document.documentElement.style.getPropertyValue("--a-scrollbar-gap")).toBe("");
	});

	test("is ref-counted for stacked overlays", () => {
		fakeScrollbar(0);
		const a = lockBodyScroll();
		const b = lockBodyScroll();
		a();
		expect(document.body.style.overflow).toBe("hidden");
		b();
		expect(document.body.style.overflow).toBe("");
		a();
		expect(document.documentElement.classList.contains("a-scroll-locked")).toBe(false);
	});
});
