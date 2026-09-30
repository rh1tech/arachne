import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import {
	$,
	type Dom,
	type Mounted,
	mountHarness,
	press,
	setupDom,
	typeInto,
} from "./test-utils/dom.ts";

type Opt = { value: string; label: string };
type Api = {
	err: Signal<string | undefined>;
	pin: Signal<string>;
	text: Signal<string>;
	checked: Signal<boolean>;
	opts: Signal<Opt[]>;
	sel: Signal<string>;
	num: Signal<number>;
	ac: Signal<string>;
	rating: Signal<number>;
	count: Signal<number>;
	tags: Signal<string[]>;
	semi: Signal<number>;
	spark: Signal<number[]>;
};

let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("forms-fixes", [
		"click",
		"input",
		"change",
		"keydown",
		"focusin",
		"blur",
		"paste",
		"mousedown",
	]);
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const blur = (el: HTMLElement) => el.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));

describe("FormSection", () => {
	test("heading level defaults to 3 and follows `order`", () => {
		expect($('[data-test="section-default"] .a-form-section-title').tagName).toBe("H3");
		expect($('[data-test="section-h2"] .a-form-section-title').tagName).toBe("H2");
	});
});

describe("FormField", () => {
	test("shows errors that appear after mount and links them to the control", () => {
		const input = $("#email");
		expect($(".a-help").textContent).toBe("We never share it");
		h.api.err.set("Required");
		const help = $(".a-help");
		expect(help.textContent).toBe("Required");
		expect(help.classList.contains("a-help-danger")).toBe(true);
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.getAttribute("aria-describedby")).toBe(help.id);
		h.api.err.set(undefined);
		expect(input.getAttribute("aria-invalid")).toBeNull();
		expect($(".a-help").textContent).toBe("We never share it");
	});
});

describe("PinInput", () => {
	test("keeps cells stable and auto-advances focus", () => {
		const cells = [...document.querySelectorAll<HTMLInputElement>('[data-test="pin"] input')];
		cells[0]?.focus();
		typeInto(cells[0] as HTMLInputElement, "7");
		expect(h.api.pin()).toBe("7");
		const after = [...document.querySelectorAll<HTMLInputElement>('[data-test="pin"] input')];
		expect(after[0]).toBe(cells[0] as HTMLInputElement);
		expect(document.activeElement).toBe(cells[1] as HTMLInputElement);
		press("Backspace", cells[1] as HTMLInputElement);
		expect(document.activeElement).toBe(cells[0] as HTMLInputElement);
	});

	test("each Backspace deletes exactly one digit", () => {
		const cells = [...document.querySelectorAll<HTMLInputElement>('[data-test="pin"] input')];
		typeInto(cells[0] as HTMLInputElement, "1234");
		cells[3]?.focus();
		press("Backspace", cells[3] as HTMLInputElement);
		expect(h.api.pin()).toBe("123");
		// The focused cell is now empty: the next press clears the previous digit.
		press("Backspace", cells[3] as HTMLInputElement);
		expect(h.api.pin()).toBe("12");
		expect(document.activeElement).toBe(cells[2] as HTMLInputElement);
		press("Backspace", cells[2] as HTMLInputElement);
		expect(h.api.pin()).toBe("1");
	});

	test("paste fills multiple cells", () => {
		const cells = [...document.querySelectorAll<HTMLInputElement>('[data-test="pin"] input')];
		typeInto(cells[0] as HTMLInputElement, "1234");
		expect(h.api.pin()).toBe("1234");
		expect(cells.map((c) => c.value)).toEqual(["1", "2", "3", "4"]);
	});
});

describe("controlled inputs", () => {
	test("text input snaps back when the parent rejects a value", () => {
		const el = $('[data-test="reject"]') as HTMLInputElement;
		typeInto(el, "abcd");
		expect(h.api.text()).toBe("abc");
		expect(el.value).toBe("abc");
	});

	test("checkbox snaps back when the parent keeps it unchecked", () => {
		const el = $("#locked") as HTMLInputElement;
		el.click();
		expect(el.checked).toBe(false);
	});

	test("selects apply value once async options arrive", async () => {
		h.api.opts.set([
			{ value: "a", label: "A" },
			{ value: "b", label: "B" },
		]);
		await Promise.resolve();
		expect(($("#async-select") as HTMLSelectElement).value).toBe("b");
		expect(($("#async-native") as HTMLSelectElement).value).toBe("b");
	});
});

describe("NumberInput", () => {
	test("does not clamp while typing; clamps on blur", () => {
		const el = $("#num") as HTMLInputElement;
		typeInto(el, "1");
		expect(h.api.num()).toBe(10);
		expect(el.value).toBe("1");
		typeInto(el, "15");
		expect(h.api.num()).toBe(15);
		typeInto(el, "99");
		blur(el);
		expect(h.api.num()).toBe(50);
		expect(el.value).toBe("50");
	});

	test("empty input does not emit NaN and restores on blur", () => {
		const el = $("#num") as HTMLInputElement;
		typeInto(el, "");
		expect(Number.isNaN(h.api.num())).toBe(false);
		blur(el);
		expect(el.value).toBe(String(h.api.num()));
	});

	test("stepping rounds to the step precision", () => {
		h.api.num.set(10.2);
		const plus = [...document.querySelectorAll<HTMLButtonElement>(".a-number button")].at(
			-1,
		) as HTMLButtonElement;
		plus.click();
		expect(h.api.num()).toBe(10.3);
	});
});

describe("Autocomplete", () => {
	test("combobox keyboard pattern", () => {
		const input = $("#ac") as HTMLInputElement;
		expect(input.getAttribute("role")).toBe("combobox");
		expect(input.getAttribute("aria-expanded")).toBe("false");
		input.focus();
		typeInto(input, "ap");
		expect(input.getAttribute("aria-expanded")).toBe("true");
		const listbox = $(`#${input.getAttribute("aria-controls")}`);
		expect(listbox.getAttribute("role")).toBe("listbox");
		press("ArrowDown", input);
		const active = input.getAttribute("aria-activedescendant") as string;
		expect($(`#${active}`).textContent).toBe("Apple");
		press("ArrowDown", input);
		expect($(`#${input.getAttribute("aria-activedescendant")}`).textContent).toBe("Apricot");
		press("Enter", input);
		expect(h.api.ac()).toBe("Apricot");
		expect(input.getAttribute("aria-expanded")).toBe("false");
		typeInto(input, "b");
		press("Escape", input);
		expect(input.getAttribute("aria-expanded")).toBe("false");
	});
});

describe("Rating", () => {
	test("reacts to count and supports arrow keys", () => {
		expect(document.querySelectorAll(".a-rating-star").length).toBe(5);
		h.api.count.set(3);
		expect(document.querySelectorAll(".a-rating-star").length).toBe(3);
		const stars = [...document.querySelectorAll<HTMLElement>(".a-rating-star")];
		expect(stars.map((s) => s.getAttribute("tabindex"))).toEqual(["-1", "0", "-1"]);
		stars[1]?.focus();
		press("ArrowRight", stars[1] as HTMLElement);
		expect(h.api.rating()).toBe(3);
		press("ArrowLeft");
		expect(h.api.rating()).toBe(2);
	});
});

describe("TagsInput", () => {
	test("splits pasted lists and dedupes case-insensitively", () => {
		const field = $(".a-tags-field") as HTMLInputElement;
		typeInto(field, "a, b,react, c");
		press("Enter", field);
		expect(h.api.tags()).toEqual(["React", "a", "b", "c"]);
	});
});

describe("charts", () => {
	test("SemiCircleProgress and Sparkline update and guard NaN", () => {
		const bar = $(".a-semi-bar");
		const before = bar.getAttribute("stroke-dashoffset");
		h.api.semi.set(80);
		expect(bar.getAttribute("stroke-dashoffset")).not.toBe(before);
		h.api.semi.set(Number.NaN);
		expect(bar.getAttribute("stroke-dashoffset")).not.toContain("NaN");

		const line = $(".a-sparkline polyline");
		const pts = line.getAttribute("points");
		h.api.spark.set([5, 1, 9, 2]);
		expect(line.getAttribute("points")).not.toBe(pts);
		h.api.spark.set([Number.NaN, 2]);
		expect(line.getAttribute("points")).not.toContain("NaN");
	});

	test("TimePicker tolerates minutesStep=0", () => {
		expect(document.querySelectorAll("[data-a-minute]").length).toBeGreaterThan(0);
	});
});
