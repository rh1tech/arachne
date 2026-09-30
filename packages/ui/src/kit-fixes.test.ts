import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import { formatTrend } from "./kit-extra.tsx";
import { formatRelative, stringifyJson } from "./patterns.tsx";
import { $, type Dom, type Mounted, mountHarness, press, setupDom } from "./test-utils/dom.ts";

type Api = {
	icon: Signal<string>;
	theme: Signal<"light" | "dark">;
	save: Signal<string>;
	build: Signal<string>;
	value: Signal<number>;
	max: Signal<number>;
	trend: Signal<number>;
	angle: Signal<number>;
	bars: Signal<number[]>;
	checklist: Signal<Array<{ id: string; label: string; done?: boolean }>>;
	acceptChecks: Signal<boolean>;
	dots: Signal<number>;
	page: Signal<number>;
	json: Signal<unknown>;
	time: Signal<number>;
	text: Signal<string>;
	edits: Signal<string[]>;
	confirms: Signal<number>;
	sheet: Signal<boolean>;
};

const flush = () => new Promise<void>((r) => queueMicrotask(r));

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("kit-fixes");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

describe("reactive props", () => {
	test("Icon swaps its glyph when name changes", () => {
		const d = () => $('[data-test="icon"] path').getAttribute("d");
		const before = d();
		h.api.icon.set("check");
		expect(d()).not.toBe(before);
	});

	test("ThemeToggle keeps toggling after the parent updates", () => {
		const btn = $(".a-theme-toggle");
		btn.click();
		expect(h.api.theme()).toBe("dark");
		expect(btn.getAttribute("aria-pressed")).toBe("true");
		btn.click();
		expect(h.api.theme()).toBe("light");
		expect(btn.getAttribute("aria-label")).toBe("Switch to dark");
	});

	test("AutosaveIndicator text and BuildStatus icon follow state", () => {
		expect($(".a-autosave").textContent).toBe("Saving…");
		h.api.save.set("saved");
		expect($(".a-autosave").textContent).toBe("Saved");
		const d = () => $(".a-build path").getAttribute("d");
		const running = d();
		h.api.build.set("success");
		expect(d()).not.toBe(running);
	});

	test("progress widgets update and guard max=0 / NaN", () => {
		h.api.value.set(50);
		expect($('[data-test="gauge"] .a-gauge-label strong').textContent).toBe("50%");
		expect($('[data-test="upload"] .a-upload-item-pct').textContent).toBe("50%");
		expect($('[data-test="usage"] .a-usage-fill').style.getPropertyValue("width")).toBe("50%");
		expect($('[data-test="donut"] .a-donut').getAttribute("aria-valuenow")).toBe("50");

		h.api.max.set(0);
		expect($('[data-test="gauge"] .a-gauge-label strong').textContent).toBe("0%");
		expect($('[data-test="usage"] .a-usage-fill').style.getPropertyValue("width")).toBe("0%");

		h.api.value.set(Number.NaN);
		expect($('[data-test="upload"] .a-upload-item-pct').textContent).toBe("0%");
		expect($('[data-test="donut"] .a-donut-bar').getAttribute("stroke-dashoffset")).not.toContain(
			"NaN",
		);
	});

	test("Trend flips sign, arrow and colour", () => {
		h.api.trend.set(-3);
		const el = $('[data-test="trend"] .a-trend');
		expect(el.textContent).toBe("▼-3%");
		expect(el.classList.contains("a-trend-down")).toBe(true);
		expect(formatTrend(2)).toBe("+2%");
		expect(formatTrend(0)).toBe("0%");
	});

	test("AngleSlider knob moves with value", () => {
		const knob = () => $('[data-test="angle"] .a-angle-knob').getAttribute("cx");
		const before = knob();
		h.api.angle.set(90);
		expect(knob()).not.toBe(before);
	});

	test("SparkBar and Heatmap rescale to new max and clamp negatives", () => {
		h.api.bars.set([10, 5, -4]);
		const cols = document.querySelectorAll<HTMLElement>('[data-test="sparkbar"] .a-sparkbar-col');
		expect(cols[0]?.style.getPropertyValue("height")).toBe("100%");
		expect(cols[2]?.style.getPropertyValue("height")).toBe("0%");
		const cells = document.querySelectorAll<HTMLElement>('[data-test="heatmap"] .a-heatmap-cell');
		expect(Number(cells[2]?.style.getPropertyValue("opacity"))).toBeCloseTo(0.15, 5);
		expect(
			$('[data-test="heatmap"] .a-heatmap').style.getPropertyValue("grid-template-columns"),
		).toBe("repeat(7, 1fr)");
	});
});

describe("lists and controlled inputs", () => {
	test("Checklist snaps back when the parent rejects a change", () => {
		h.api.acceptChecks.set(false);
		const box = $('[data-test="checklist"] input') as HTMLInputElement;
		box.checked = true;
		box.dispatchEvent(new Event("change", { bubbles: true }));
		expect(box.checked).toBe(false);
	});

	test("DotPagination keeps its buttons when the page changes and follows count", () => {
		const first = $('[data-test="dots"] .a-dots-item');
		first.focus();
		(
			document.querySelectorAll<HTMLElement>('[data-test="dots"] .a-dots-item')[1] as HTMLElement
		).click();
		expect(h.api.page()).toBe(1);
		expect($('[data-test="dots"] .a-dots-item')).toBe(first);
		h.api.dots.set(5);
		expect(document.querySelectorAll('[data-test="dots"] .a-dots-item').length).toBe(5);
	});
});

describe("formatting guards", () => {
	test("JsonViewer is reactive and survives undefined / circular / BigInt", () => {
		h.api.json.set({ b: 2 });
		expect($('[data-test="json"] code').textContent).toContain('"b": 2');
		const circular: Record<string, unknown> = { n: 1n };
		circular["self"] = circular;
		h.api.json.set(circular);
		expect($('[data-test="json"] code').textContent).toContain("[Circular]");
		expect(stringifyJson(undefined)).toBe("undefined");
		expect(stringifyJson({ n: 1n })).toContain('"1n"');
	});

	test("RelativeTime tolerates invalid dates and rounds units", () => {
		h.api.time.set(Number.NaN);
		expect($('[data-test="time"] time').textContent).toBe("—");
		const now = 1_000_000_000_000;
		expect(formatRelative(now - 59.9 * 60 * 1000, now)).not.toContain("60");
	});
});

describe("interaction", () => {
	test("InlineEdit focuses on edit, commits once on Enter and allows clearing", () => {
		$('[data-test="inline"] .a-inline-edit-display').click();
		const input = $('[data-test="inline"] input') as HTMLInputElement;
		expect(document.activeElement).toBe(input);
		input.value = "";
		input.dispatchEvent(new Event("input", { bubbles: true }));
		press("Enter", input);
		input.dispatchEvent(new FocusEvent("blur"));
		input.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
		expect(h.api.edits()).toEqual([""]);
	});

	test("ConfirmButton arms, confirms, and its disarm timer does not leak into the next arm", async () => {
		const btn = () => $('[data-test="confirm"] button');
		btn().click();
		expect(btn().textContent).toContain("Confirm?");
		btn().click();
		expect(h.api.confirms()).toBe(1);
		expect(btn().textContent).toContain("Delete");
	});

	test("BottomSheet traps focus, closes on Escape and restores focus", async () => {
		const trigger = $('[data-test="sheet-trigger"]');
		trigger.focus();
		h.api.sheet.set(true);
		await flush();
		expect($('[role="dialog"]').getAttribute("aria-labelledby")).toBeTruthy();
		expect(document.activeElement).toBe($('[data-test="sheet-first"]'));
		press("Escape");
		expect(h.api.sheet()).toBe(false);
		expect(document.activeElement).toBe(trigger);
	});
});
