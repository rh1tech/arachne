import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { signal } from "@arachne/signals";
import { Window } from "happy-dom";
import { delegateEvents, insert, render, setAttribute, template } from "../src/dom.ts";
import { island } from "../src/islands.ts";
import { escape, renderToString, ssr, ssrAttribute, wrapIsland } from "../src/ssr.ts";

describe("ssr", () => {
	test("escapes text and attributes", () => {
		expect(escape(`<script>"x"&`)).toBe('&lt;script&gt;"x"&amp;');
		expect(escape(`a"b`, true)).toBe("a&quot;b");
	});

	test("ssr template holes", () => {
		const html = ssr(["<p", ">", "</p>"], ssrAttribute("class", "x"), escape("hi"));
		expect(html).toBe('<p class="x">hi</p>');
	});

	test("renderToString", () => {
		const html = renderToString(() => ssr(["<h1>", "</h1>"], escape("Title")));
		expect(html).toBe("<h1>Title</h1>");
	});

	test("wrapIsland", () => {
		const out = wrapIsland("<div>c</div>", {
			chunkId: "Comments",
			propsJson: "{}",
			hydrate: "visible",
		});
		expect(out).toContain("<a-island");
		expect(out).toContain('data-c="Comments"');
		expect(out).toContain("<div>c</div>");
	});
});

describe("dom", () => {
	let window: Window;

	beforeEach(() => {
		window = new Window({ url: "https://localhost/" });
		const g = globalThis as unknown as Record<string, unknown>;
		g["window"] = window;
		g["document"] = window.document;
		g["Node"] = window.Node;
		g["HTMLElement"] = window.HTMLElement;
		g["Element"] = window.Element;
		g["Comment"] = window.Comment;
		g["Text"] = window.Text;
	});

	afterEach(() => {
		window.close();
	});

	test("template clone + reactive insert", () => {
		const tmpl = template(`<button class="btn">Count: <!$>`);
		const count = signal(0);
		const root = document.createElement("div");
		document.body.appendChild(root);

		const el = tmpl();
		const hole = el.firstChild?.nextSibling as Comment;
		insert(el, () => count(), hole);
		root.appendChild(el);
		delegateEvents(["click"]);
		(el as unknown as { $$click: () => void }).$$click = () => count.set(count() + 1);

		expect(el.textContent).toContain("0");
		count.set(1);
		expect(el.textContent).toContain("1");
	});

	test("render mounts component output", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const name = signal("ada");
		render(() => {
			const el = document.createElement("span");
			insert(el, () => name());
			return el;
		}, root);
		expect(root.textContent).toBe("ada");
		name.set("grace");
		expect(root.textContent).toBe("grace");
	});

	test("setAttribute removes on false", () => {
		const el = document.createElement("button");
		setAttribute(el, "disabled", true);
		expect(el.hasAttribute("disabled")).toBe(true);
		setAttribute(el, "disabled", false);
		expect(el.hasAttribute("disabled")).toBe(false);
	});
});

describe("island helper", () => {
	test("marks component metadata", () => {
		const Comp = (p: { n: number }) => p.n;
		const I = island(Comp, { hydrate: "idle" });
		expect((I as unknown as { __island: { hydrate: string } }).__island.hydrate).toBe("idle");
		expect(I({ n: 3 })).toBe(3);
	});
});
