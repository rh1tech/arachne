import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachne/signals";
import {
	$,
	click,
	type Dom,
	type Mounted,
	mountHarness,
	pointerDown,
	press,
	setupDom,
} from "./test-utils/dom.ts";

type Api = {
	modalOpen: Signal<boolean>;
	modalClosed: Signal<number>;
	drawerOpen: Signal<boolean>;
	menuOpen: Signal<boolean>;
	selected: Signal<string>;
	popOpen: Signal<boolean>;
	tab: Signal<string>;
	acc: Signal<string | null>;
	accMany: Signal<string[]>;
	mounted: Signal<boolean>;
	toaster: {
		push: (t: { id?: string; message: string; tone?: string; durationMs?: number }) => string;
		dismiss: (id: string) => void;
		items: () => Array<{ id: string; message: string }>;
	};
};

const flush = () => new Promise<void>((r) => queueMicrotask(r));

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("overlays");
});

afterEach(() => {
	h.dispose();
	expect(document.querySelector("[data-a-portal] .a-modal")).toBeNull();
	expect(document.documentElement.classList.contains("a-scroll-locked")).toBe(false);
	dom.teardown();
});

describe("Modal", () => {
	test("labels itself, traps focus, closes on Escape and restores focus", async () => {
		const trigger = $('[data-test="modal-trigger"]');
		trigger.focus();
		h.api.modalOpen.set(true);
		await flush();

		const dialog = $('[role="dialog"]');
		expect(dialog.getAttribute("aria-labelledby")).toBe(
			$(".a-modal-title").getAttribute("id") as string,
		);
		expect(dialog.getAttribute("aria-describedby")).toBe(
			$(".a-modal-description").getAttribute("id") as string,
		);
		expect(document.activeElement).toBe($('[data-test="modal-input"]'));
		expect(document.documentElement.classList.contains("a-scroll-locked")).toBe(true);

		const save = [...dialog.querySelectorAll("button")].find((b) => b.textContent === "Save");
		save?.focus();
		press("Tab");
		expect(dialog.contains(document.activeElement)).toBe(true);

		press("Escape");
		expect(h.api.modalOpen()).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});

	test("forwards attributes and applies slot, theme and style customization", () => {
		h.api.modalOpen.set(true);
		const dialog = $('[data-test="modal"]');
		expect(dialog.id).toBe("profile-modal");
		expect(dialog.classList.contains("a-modal")).toBe(true);
		expect(dialog.classList.contains("theme-panel")).toBe(true);
		expect(dialog.style.getPropertyValue("--a-modal-width")).toBe("30rem");
		expect($(".a-modal-body").classList.contains("my-body")).toBe(true);
		expect($(".a-modal-root").getAttribute("data-state")).toBe("open");
		expect($(".a-modal-backdrop").getAttribute("tabindex")).toBe("-1");
	});

	test("backdrop click closes", () => {
		h.api.modalOpen.set(true);
		click(".a-modal-backdrop");
		expect(h.api.modalClosed()).toBe(1);
	});
});

describe("Drawer", () => {
	test("focuses content, Escape closes, releases scroll lock", async () => {
		h.api.drawerOpen.set(true);
		await flush();
		expect(document.activeElement).toBe($('[data-test="drawer-first"]'));
		press("Escape");
		expect(h.api.drawerOpen()).toBe(false);
	});

	test("Escape closes only the topmost layer", () => {
		h.api.drawerOpen.set(true);
		h.api.modalOpen.set(true);
		press("Escape");
		expect(h.api.modalOpen()).toBe(false);
		expect(h.api.drawerOpen()).toBe(true);
		press("Escape");
		expect(h.api.drawerOpen()).toBe(false);
	});
});

describe("Menu", () => {
	test("focuses first item, arrows skip disabled items, Enter selects and restores focus", async () => {
		const trigger = $('[data-test="menu-trigger"]');
		trigger.focus();
		h.api.menuOpen.set(true);
		await flush();
		const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
		expect(document.activeElement).toBe(items[0] as HTMLElement);
		press("ArrowDown");
		expect(document.activeElement).toBe(items[2] as HTMLElement);
		press("ArrowDown");
		expect(document.activeElement).toBe(items[0] as HTMLElement);
		press("End");
		expect(document.activeElement).toBe(items[2] as HTMLElement);
		(document.activeElement as HTMLElement).click();
		expect(h.api.selected()).toBe("delete");
		expect(h.api.menuOpen()).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});
});

describe("Popover", () => {
	test("wires aria-expanded/controls and closes on Escape", () => {
		const trigger = $(".a-popover-host button");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		trigger.click();
		expect(h.api.popOpen()).toBe(true);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const panel = $(".a-popover");
		expect(trigger.getAttribute("aria-controls")).toBe(panel.id);
		press("Escape");
		expect(h.api.popOpen()).toBe(false);
	});

	test("listeners are released after the popover unmounts while open", async () => {
		h.api.popOpen.set(true);
		await new Promise((r) => setTimeout(r, 5));
		h.api.mounted.set(false);
		press("Escape");
		pointerDown($('[data-test="outside"]'));
		expect(h.api.popOpen()).toBe(true);
	});
});

describe("Tabs", () => {
	test("roving tabindex, arrow keys skip disabled tabs, panels are linked", () => {
		const tabs = [...document.querySelectorAll<HTMLElement>('[role="tab"]')];
		expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["0", "-1", "-1"]);
		expect(tabs[0]?.getAttribute("aria-selected")).toBe("true");
		expect(tabs[2]?.getAttribute("aria-selected")).toBe("false");

		const panel = $('[role="tabpanel"]');
		expect(panel.id).toBe(tabs[0]?.getAttribute("aria-controls") as string);
		expect(panel.getAttribute("aria-labelledby")).toBe(tabs[0]?.id as string);
		expect(panel.textContent).toBe("Panel A");

		tabs[0]?.focus();
		press("ArrowRight");
		expect(h.api.tab()).toBe("c");
		expect(document.activeElement).toBe(tabs[2] as HTMLElement);
		expect(tabs.map((t) => t.getAttribute("tabindex"))).toEqual(["-1", "-1", "0"]);
		expect($('[role="tabpanel"]').textContent).toBe("Panel C");
		press("Home");
		expect(h.api.tab()).toBe("a");
	});
});

describe("Tooltip", () => {
	test("describes its trigger and hides on Escape", () => {
		const trigger = $('[data-test="tip-trigger"]');
		trigger.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
		const tip = $('[role="tooltip"]');
		expect($(".a-tooltip-target").getAttribute("aria-describedby")).toBe(tip.id);
		press("Escape");
		expect(document.querySelector('[role="tooltip"][data-state="open"]')).toBeNull();
	});
});

describe("Accordion", () => {
	test("keeps panel content mounted and focus stable while toggling", () => {
		const trigger = $(".a-accordion-trigger");
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
		trigger.focus();
		trigger.click();
		expect(h.api.acc()).toBe("one");
		expect(document.activeElement).toBe(trigger);
		expect(trigger.getAttribute("aria-expanded")).toBe("true");
		const panel = $(`#${trigger.getAttribute("aria-controls")}`);
		// A labelled <section> has the implicit ARIA role "region".
		expect(panel.tagName).toBe("SECTION");
		expect(panel.getAttribute("aria-labelledby")).toBe(trigger.id);
		expect(panel.getAttribute("data-state")).toBe("open");
		const input = $('[data-test="acc-input"]');
		trigger.click();
		expect(h.api.acc()).toBeNull();
		expect($('[data-test="acc-input"]')).toBe(input);
	});

	test("multiple mode toggles items independently", () => {
		const triggers = document.querySelectorAll<HTMLElement>(".acc-many .a-accordion-trigger");
		triggers[0]?.click();
		triggers[1]?.click();
		expect(h.api.accMany()).toEqual(["x", "y"]);
		triggers[0]?.click();
		expect(h.api.accMany()).toEqual(["y"]);
	});
});

describe("Toast", () => {
	test("keeps existing toasts' DOM when new ones arrive, replaces duplicate ids", () => {
		h.api.toaster.push({ id: "t1", message: "Saved", durationMs: 0 });
		const first = $(".a-toast");
		h.api.toaster.push({ message: "Another", durationMs: 0 });
		expect(document.querySelectorAll(".a-toast").length).toBe(2);
		expect($(".a-toast")).toBe(first);

		h.api.toaster.push({ id: "t1", message: "Saved again", durationMs: 0 });
		expect(h.api.toaster.items().length).toBe(2);
		expect(first.textContent).toContain("Saved again");
	});

	test("danger toasts are assertive alerts", () => {
		h.api.toaster.push({ message: "Failed", tone: "danger", durationMs: 0 });
		expect($(".a-toast").getAttribute("role")).toBe("alert");
	});

	test("dismiss removes the toast", () => {
		const id = h.api.toaster.push({ message: "Bye", durationMs: 0 });
		h.api.toaster.dismiss(id);
		expect(document.querySelector(".a-toast")).toBeNull();
	});
});
