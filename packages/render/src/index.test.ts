import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { signal } from "@arachne/signals";
import { Window } from "happy-dom";
import { For, Show, Suspense } from "../src/control-flow.ts";
import {
	For as ForSSR,
	Show as ShowSSR,
	Suspense as SuspenseSSR,
} from "../src/control-flow-ssr.ts";
import {
	createComponent,
	delegateEvents,
	insert,
	render,
	setAttribute,
	template,
} from "../src/dom.ts";
import { island } from "../src/islands.ts";
import {
	escape,
	renderToString,
	resolveSSRNode,
	ssr,
	ssrAttribute,
	wrapIsland,
} from "../src/ssr.ts";

describe("ssr", () => {
	test("escapes text and attributes", () => {
		expect(escape(`<script>"x"&`)).toBe('&lt;script&gt;"x"&amp;');
		expect(escape(`a"b`, true)).toBe("a&quot;b");
	});

	test("passes through SSR nodes without double-escaping", () => {
		const node = ssr(["<p>", "</p>"], escape("hi") as string);
		expect(escape(node)).toEqual(node);
		expect(resolveSSRNode(escape(node))).toBe("<p>hi</p>");
	});

	test("ssr template holes", () => {
		const html = ssr(["<p", ">", "</p>"], ssrAttribute("class", "x"), escape("hi") as string);
		expect(html.t).toBe('<p class="x">hi</p>');
	});

	test("renderToString", () => {
		const html = renderToString(() => ssr(["<h1>", "</h1>"], escape("Title") as string));
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

describe("ssr control flow", () => {
	test("Show renders children or fallback", () => {
		expect(
			resolveSSRNode(
				ShowSSR({
					when: true,
					fallback: ssr(["<span>", "</span>"], "off"),
					children: ssr(["<span>", "</span>"], "on"),
				}),
			),
		).toBe("<span>on</span>");
		expect(
			resolveSSRNode(
				ShowSSR({
					when: false,
					fallback: ssr(["<span>", "</span>"], "off"),
					children: ssr(["<span>", "</span>"], "on"),
				}),
			),
		).toBe("<span>off</span>");
	});

	test("For maps items", () => {
		const out = ForSSR({
			each: [1, 2],
			children: (n) => ssr(["<li>", "</li>"], escape(n) as string),
		});
		expect(resolveSSRNode(escape(out))).toBe("<li>1</li><li>2</li>");
	});

	test("Suspense passes children through", () => {
		expect(
			resolveSSRNode(
				SuspenseSSR({
					fallback: "loading",
					children: ssr(["<em>", "</em>"], "ready"),
				}),
			),
		).toBe("<em>ready</em>");
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

	test("delegated handlers see node as this", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const input = document.createElement("input");
		root.appendChild(input);
		let seen: EventTarget | null = null;
		(input as unknown as { $$input: (e: Event) => void }).$$input = function (this: EventTarget) {
			seen = this;
		};
		delegateEvents(["input"]);
		input.dispatchEvent(new window.Event("input", { bubbles: true }));
		expect(seen).toBe(input);
	});

	test("setAttribute removes on false", () => {
		const el = document.createElement("button");
		setAttribute(el, "disabled", true);
		expect(el.hasAttribute("disabled")).toBe(true);
		setAttribute(el, "disabled", false);
		expect(el.hasAttribute("disabled")).toBe(false);
	});

	test("Show toggles with signal", () => {
		const visible = signal(true);
		const root = document.createElement("div");
		document.body.appendChild(root);

		render(
			() =>
				createComponent(Show, {
					get when() {
						return visible();
					},
					get fallback() {
						const el = document.createElement("span");
						el.textContent = "off";
						return el;
					},
					get children() {
						const el = document.createElement("span");
						el.textContent = "on";
						return el;
					},
				}),
			root,
		);

		expect(root.textContent).toBe("on");
		visible.set(false);
		expect(root.textContent).toBe("off");
		visible.set(true);
		expect(root.textContent).toBe("on");
	});

	test("For adds removes and reorders", () => {
		const items = signal(["a", "b"]);
		const root = document.createElement("div");
		document.body.appendChild(root);

		render(() => {
			const ul = document.createElement("ul");
			insert(
				ul,
				createComponent(For<string>, {
					get each() {
						return items();
					},
					children: (item) => {
						const li = document.createElement("li");
						li.textContent = item;
						return li;
					},
				}),
			);
			return ul;
		}, root);

		expect([...root.querySelectorAll("li")].map((el) => el.textContent)).toEqual(["a", "b"]);

		items.set(["a", "b", "c"]);
		expect([...root.querySelectorAll("li")].map((el) => el.textContent)).toEqual(["a", "b", "c"]);

		items.set(["c", "a"]);
		expect([...root.querySelectorAll("li")].map((el) => el.textContent)).toEqual(["c", "a"]);

		items.set([]);
		expect(root.querySelectorAll("li").length).toBe(0);
	});

	test("Suspense renders children", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const tmpl = template(`<span>ready`);
		render(
			() =>
				createComponent(Suspense, {
					fallback: "loading",
					get children() {
						return tmpl();
					},
				}),
			root,
		);
		expect(root.textContent).toBe("ready");
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
