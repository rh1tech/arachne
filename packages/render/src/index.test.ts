import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { effect, signal } from "@arachne/signals";
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
	memo,
	render,
	setAttribute,
	setStyleProperty,
	style,
	template,
} from "../src/dom.ts";
import { island } from "../src/islands.ts";
import {
	createUniqueId as createUniqueIdSSR,
	escape,
	Portal as PortalSSR,
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

describe("renderToString effects", () => {
	test("component effects do not run on the server", () => {
		let ran = 0;
		const html = renderToString(() => {
			effect(() => {
				ran++;
			});
			return ssr(["<i>", "</i>"], "x");
		});
		expect(html).toBe("<i>x</i>");
		expect(ran).toBe(0);
	});
});

describe("ssr Portal", () => {
	test("renders nothing on the server (content mounts on the client)", () => {
		expect(
			renderToString(() => ssr(["<div>", "</div>"], PortalSSR({ children: "secret" }) as string)),
		).toBe("<div></div>");
	});
});

describe("createUniqueId", () => {
	test("is deterministic per SSR render and matches hydration order", () => {
		const ids = () => [createUniqueIdSSR(), createUniqueIdSSR()].join(",");
		const first = renderToString(() => ids());
		const second = renderToString(() => ids());
		expect(first).toBe(second);
		expect(renderToString(() => ids(), { renderId: "r1-" })).toBe("r1-u1,r1-u2");
	});

	test("client-only renders get unique ids", () => {
		const a = createUniqueIdSSR();
		const b = createUniqueIdSSR();
		expect(a).not.toBe(b);
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

	test("insert updates text in place instead of recreating nodes", () => {
		const n = signal(1);
		const root = document.createElement("div");
		insert(root, () => n());
		const single = root.firstChild;
		n.set(2);
		expect(root.textContent).toBe("2");
		expect(root.firstChild).toBe(single);

		const mixed = document.createElement("div");
		insert(mixed, () => ["Row ", n(), "!"]);
		const nodes = [...mixed.childNodes];
		n.set(3);
		expect(mixed.textContent).toBe("Row 3!");
		expect([...mixed.childNodes]).toEqual(nodes);

		// Shape change falls back to replacement.
		const shape = signal<unknown>("a");
		const box = document.createElement("div");
		insert(box, () => shape());
		shape.set(["x", "y"]);
		expect(box.textContent).toBe("xy");
		shape.set(null);
		expect(box.childNodes.length).toBe(0);
	});

	test("template keeps table-part roots (tr / td / thead …)", () => {
		expect(template("<tr><td>x</td></tr>")().tagName).toBe("TR");
		expect(template("<td class=c>y</td>")().tagName).toBe("TD");
		expect(template("<th>h</th>")().tagName).toBe("TH");
		expect(template("<thead><tr></tr></thead>")().tagName).toBe("THEAD");
		expect(template("<tbody></tbody>")().tagName).toBe("TBODY");
		expect(template("<col span=2>")().tagName).toBe("COL");
		expect((template("<td class=c>y</td>")() as HTMLElement).className).toBe("c");
	});

	test("insert tracks nested memos inside arrays", () => {
		const tab = signal("jsx");
		const root = document.createElement("div");
		document.body.appendChild(root);
		insert(root, () => ["Active: ", memo(() => tab())]);
		expect(root.textContent).toBe("Active: jsx");
		tab.set("signals");
		expect(root.textContent).toBe("Active: signals");
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

	test("sibling Shows switch without stringifying accessors", () => {
		const tab = signal("a");
		const root = document.createElement("div");
		document.body.appendChild(root);

		render(() => {
			const wrap = document.createElement("div");
			insert(wrap, () => [
				createComponent(Show, {
					get when() {
						return tab() === "a";
					},
					fallback: null,
					get children() {
						const el = document.createElement("span");
						el.textContent = "panel-a";
						return el;
					},
				}),
				createComponent(Show, {
					get when() {
						return tab() === "b";
					},
					fallback: null,
					get children() {
						const el = document.createElement("span");
						el.textContent = "panel-b";
						return el;
					},
				}),
			]);
			return wrap;
		}, root);

		expect(root.textContent).toBe("panel-a");
		expect(root.textContent).not.toContain("inner");
		tab.set("b");
		expect(root.textContent).toBe("panel-b");
		tab.set("a");
		expect(root.textContent).toBe("panel-a");
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

	test("camelCase style keys are applied as CSS properties", () => {
		const el = document.createElement("div");
		setStyleProperty(el, "paddingLeft", "4px");
		expect(el.style.getPropertyValue("padding-left")).toBe("4px");
		const other = document.createElement("div");
		style(other, { marginTop: "2px", "--gap": "1px" });
		expect(other.style.getPropertyValue("margin-top")).toBe("2px");
		expect(other.style.getPropertyValue("--gap")).toBe("1px");
	});

	test("aria booleans serialize as true/false strings", () => {
		const el = document.createElement("button");
		setAttribute(el, "aria-selected", false);
		expect(el.getAttribute("aria-selected")).toBe("false");
		setAttribute(el, "aria-expanded", true);
		expect(el.getAttribute("aria-expanded")).toBe("true");
		setAttribute(el, "aria-expanded", undefined);
		expect(el.hasAttribute("aria-expanded")).toBe(false);
		expect(ssrAttribute("aria-pressed", false)).toBe(' aria-pressed="false"');
		expect(ssrAttribute("aria-pressed", true)).toBe(' aria-pressed="true"');
	});

	test("Show keeps children while the condition stays truthy", () => {
		const when = signal<number>(1);
		let creates = 0;
		const root = document.createElement("div");
		render(
			() =>
				createComponent(Show, {
					get when() {
						return when();
					},
					get children() {
						creates++;
						return document.createElement("input");
					},
				}),
			root,
		);
		when.set(2);
		when.set(3);
		expect(creates).toBe(1);
		when.set(0);
		when.set(4);
		expect(creates).toBe(2);
	});

	test("Show function children re-run per value; keyed element children recreate", () => {
		const when = signal<string>("a");
		const root = document.createElement("div");
		render(
			() =>
				createComponent(Show, {
					get when() {
						return when();
					},
					children: (value: string) => document.createTextNode(value),
				}),
			root,
		);
		when.set("b");
		expect(root.textContent).toBe("b");

		let creates = 0;
		const keyedRoot = document.createElement("div");
		render(
			() =>
				createComponent(Show, {
					keyed: true,
					get when() {
						return when();
					},
					get children() {
						creates++;
						return document.createElement("span");
					},
				}),
			keyedRoot,
		);
		when.set("c");
		expect(creates).toBe(2);
	});

	test("Show and For render without wrapper elements (valid inside <ul>)", () => {
		const items = signal(["a", "b"]);
		const on = signal(true);
		const root = document.createElement("div");
		render(() => {
			const ul = document.createElement("ul");
			insert(ul, [
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
				createComponent(Show, {
					get when() {
						return on();
					},
					get children() {
						const li = document.createElement("li");
						li.textContent = "tail";
						return li;
					},
				}),
			]);
			return ul;
		}, root);
		const ul = root.querySelector("ul") as HTMLUListElement;
		const elements = () => [...ul.children].map((el) => `${el.tagName}:${el.textContent}`);
		expect(elements()).toEqual(["LI:a", "LI:b", "LI:tail"]);
		items.set(["b", "c", "a"]);
		expect(elements()).toEqual(["LI:b", "LI:c", "LI:a", "LI:tail"]);
		on.set(false);
		expect(elements()).toEqual(["LI:b", "LI:c", "LI:a"]);
		on.set(true);
		items.set([]);
		expect(elements()).toEqual(["LI:tail"]);
		// Only list items and invisible range markers are direct children.
		expect(
			[...ul.childNodes].every((n) => n.nodeType === 8 || (n as Element).tagName === "LI"),
		).toBe(true);
	});

	test("component effects are disposed when Show hides them", () => {
		const visible = signal(true);
		const tick = signal(0);
		let runs = 0;
		let cleanups = 0;
		const Child = () => {
			effect(() => {
				tick();
				runs++;
				return () => {
					cleanups++;
				};
			});
			return document.createElement("span");
		};
		const root = document.createElement("div");
		render(
			() =>
				createComponent(Show, {
					get when() {
						return visible();
					},
					get children() {
						return createComponent(Child, {});
					},
				}),
			root,
		);
		expect(runs).toBe(1);
		visible.set(false);
		expect(cleanups).toBe(1);
		tick.set(1);
		expect(runs).toBe(1);
	});

	test("For row effects are disposed when the list unmounts", () => {
		const visible = signal(true);
		const tick = signal(0);
		let runs = 0;
		const root = document.createElement("div");
		render(
			() =>
				createComponent(Show, {
					get when() {
						return visible();
					},
					get children() {
						return createComponent(For<string>, {
							each: ["a", "b"],
							children: () => {
								effect(() => {
									tick();
									runs++;
								});
								return document.createElement("li");
							},
						});
					},
				}),
			root,
		);
		expect(runs).toBe(2);
		visible.set(false);
		tick.set(1);
		expect(runs).toBe(2);
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
