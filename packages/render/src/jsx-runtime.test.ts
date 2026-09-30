/** The non-compiled JSX runtime (used by tsc/Bun paths that skip @arachnejs/jsx). */
import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { Fragment, jsx } from "./jsx-runtime.ts";

let window: Window;
beforeEach(() => {
	window = new Window();
	const g = globalThis as unknown as Record<string, unknown>;
	g["document"] = window.document;
});
afterEach(() => window.close());

test("creates elements with props, events and flattened children", () => {
	let clicks = 0;
	const child = jsx("b", { children: "bold" }) as Element;
	const el = jsx("input", {
		class: "a",
		style: "color: red",
		checked: true,
		disabled: false,
		value: 7,
		"data-x": "1",
		hidden: true,
		onClick: () => clicks++,
	}) as HTMLInputElement;
	expect(el.className).toBe("a");
	expect(el.style.getPropertyValue("color")).toBe("red");
	expect(el.checked).toBe(true);
	expect(el.disabled).toBe(false);
	expect(el.value).toBe("7");
	expect(el.getAttribute("data-x")).toBe("1");
	expect(el.hasAttribute("hidden")).toBe(true);
	el.dispatchEvent(new window.Event("click"));
	expect(clicks).toBe(1);

	const div = jsx("div", { children: ["a", [1, null, [child, false]], undefined] }) as Element;
	expect(div.textContent).toBe("a1bold");
	expect(div.querySelector("b")).toBe(child);
	expect(Fragment({ children: "x" })).toBe("x");
});
