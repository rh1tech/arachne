import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { compile } from "@arachnejs/jsx";
import { signal } from "@arachnejs/signals";
import { Window } from "happy-dom";
import * as render from "../src/index.ts";
import * as ssr from "../src/ssr.ts";

const fixture = `
export function App(props) {
  return (
    <div class="app">
      <Show when={props.show()} fallback={<span>hidden</span>}>
        <p>visible</p>
      </Show>
      <ul>
        <For each={props.items()}>{(n) => <li>{n}</li>}</For>
      </ul>
      <Suspense fallback={<div>loading</div>}>
        <span>ready</span>
      </Suspense>
    </div>
  );
}
`;

function loadCompiled(
	code: string,
	moduleSpecifier: "@arachnejs/render" | "@arachnejs/render/ssr",
	runtime: Record<string, unknown>,
): { App: (props: { show: () => boolean; items: () => number[] }) => unknown } {
	const imports: Array<{ name: string; alias: string }> = [];
	const re =
		moduleSpecifier === "@arachnejs/render"
			? /import\s*\{([^}]+)\}\s*from\s*"@arachnejs\/render"\s*;?/g
			: /import\s*\{([^}]+)\}\s*from\s*"@arachnejs\/render\/ssr"\s*;?/g;

	let match: RegExpExecArray | null = re.exec(code);
	while (match) {
		const group = match[1];
		if (!group) {
			match = re.exec(code);
			continue;
		}
		for (const part of group.split(",")) {
			const m = part.trim().match(/([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?/);
			if (!m) continue;
			const name = m[1];
			if (!name) continue;
			imports.push({ name, alias: m[2] ?? name });
		}
		match = re.exec(code);
	}

	const prelude = imports
		.map(({ name, alias }) => `const ${alias} = __rt[${JSON.stringify(name)}];`)
		.join("\n");
	const body = code.replace(re, "").replace(/^export\s+/gm, "");
	const factory = new Function("__rt", `${prelude}\n${body}\nreturn { App };`);
	return factory(runtime) as {
		App: (props: { show: () => boolean; items: () => number[] }) => unknown;
	};
}

describe("compile-run Show/For/Suspense", () => {
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

	test("DOM compile links and reacts", () => {
		const { code } = compile(fixture, {
			filename: "App.tsx",
			target: "dom",
			hydratable: false,
		});
		expect(code).toContain("Show");
		expect(code).toContain("For");
		expect(code).toContain("Suspense");

		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		);

		const show = signal(true);
		const items = signal([1, 2]);
		const root = document.createElement("div");
		document.body.appendChild(root);
		render.render(() => App({ show, items }) as Node, root);

		expect(root.textContent).toContain("visible");
		expect(root.textContent).toContain("12");
		expect(root.textContent).toContain("ready");

		show.set(false);
		expect(root.textContent).toContain("hidden");
		expect(root.textContent).not.toContain("visible");

		items.set([3]);
		expect(root.textContent).toContain("3");
		expect(root.textContent).not.toContain("1");
	});

	test("classList toggles classes next to a static class, and keeps other classes", () => {
		const { code } = compile(
			`export function App(props) {
				return <div class="docs" classList={{ "menu-open": props.show(), wide: props.items().length > 1 }} aria-expanded={props.show()} />;
			}`,
			{ filename: "ClassList.tsx", target: "dom", hydratable: false },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		);
		const show = signal(false);
		const items = signal([1, 2]);
		const root = document.createElement("div");
		render.render(() => App({ show, items }) as Node, root);
		const el = root.firstElementChild as Element;
		expect(el.className).toBe("docs wide");
		expect(el.hasAttribute("classlist")).toBe(false);
		show.set(true);
		expect(el.className).toBe("docs wide menu-open");
		expect(el.getAttribute("aria-expanded")).toBe("true");
		el.classList.add("external");
		items.set([1]);
		show.set(false);
		expect(el.className).toBe("docs external");
	});

	test("DOM compile renders anchor tags via claimElement", () => {
		const { code } = compile(
			`export function App() {
				return (
					<nav class="toc">
						<a class="link" href="#one">One</a>
						<a class="link" href="#two">Two</a>
					</nav>
				);
			}`,
			{ filename: "Toc.tsx", target: "dom", hydratable: false },
		);
		expect(code).toContain("claimElement");

		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		);
		const root = document.createElement("div");
		document.body.appendChild(root);
		render.render(() => (App as () => Node)(), root);

		const links = root.querySelectorAll("a.link");
		expect(links.length).toBe(2);
		expect(links[0]?.getAttribute("href")).toBe("#one");
		expect(links[1]?.getAttribute("href")).toBe("#two");
		expect(root.textContent).toContain("One");
		expect(root.textContent).toContain("Two");
	});

	test("SSR compile renders matching markup", () => {
		const { code } = compile(fixture, {
			filename: "App.tsx",
			target: "ssr",
			hydratable: true,
		});

		const { App } = loadCompiled(
			code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		);

		const html = ssr.renderToString(
			() =>
				App({
					show: () => true,
					items: () => [1, 2],
				}) as ssr.SSRPayload,
		);

		expect(html).toContain("visible");
		expect(html).toContain("<li");
		expect(html).toContain("1");
		expect(html).toContain("2");
		expect(html).toContain("ready");
		expect(html).not.toContain("&lt;");
	});

	test("SSR omits boolean attributes that are false, like the DOM does", () => {
		const { code } = compile(
			`export function App(props) {
				return (
					<details open={props.show()} data-on={props.show()} aria-expanded={props.show()}>
						<button disabled={props.show()}>b</button>
						<input checked={!props.show()} />
					</details>
				);
			}`,
			{ filename: "Booleans.tsx", target: "ssr", hydratable: true },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		);
		const off = ssr.renderToString(
			() => App({ show: () => false, items: () => [] }) as ssr.SSRPayload,
		);
		expect(off).not.toContain("open");
		expect(off).not.toContain("disabled");
		expect(off).not.toContain("data-on");
		expect(off).toContain('aria-expanded="false"');
		expect(off).toMatch(/<input[^>]* checked[ >]/);
		const on = ssr.renderToString(
			() => App({ show: () => true, items: () => [] }) as ssr.SSRPayload,
		);
		expect(on).toMatch(/<details[^>]* open[ >]/);
		expect(on).toMatch(/<button[^>]* disabled[ >]/);
		expect(on).toContain('aria-expanded="true"');
		expect(on).not.toContain('="false"');
	});

	test("SSR classList merges into the element's class attribute", () => {
		const { code } = compile(
			`export function App(props) {
				return (
					<ul class="docs" classList={{ "menu-open": props.show(), wide: true }}>
						<li classList={{ sub: props.show() }}>a</li>
						<li classList={{ sub: false }} title="x">b</li>
					</ul>
				);
			}`,
			{ filename: "ClassList.tsx", target: "ssr", hydratable: true },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		);
		const html = ssr.renderToString(
			() => App({ show: () => true, items: () => [] }) as ssr.SSRPayload,
		);
		expect(html).toMatch(/<ul[^>]* class="docs menu-open wide"[^>]*>/);
		expect(html).toMatch(/<li[^>]* class="sub"[^>]*>a<\/li>/);
		expect(html).toMatch(/<li(?![^>]*class)[^>]*title="x"[^>]*>b<\/li>/);
		expect(html.toLowerCase()).not.toContain("classlist");
		expect(html).not.toContain("\uE000");
	});

	test("DOM compile applies element and component spreads reactively", () => {
		const { code } = compile(
			`import { splitProps } from "@arachnejs/render";
			function Box(props) {
				const [own, rest] = splitProps(props, ["tone"]);
				return <div class={"box " + own.tone} {...rest} data-fixed="1">{props.children}</div>;
			}
			export function App(props) {
				return <Box tone="calm" id="b" title={props.title()} style={{ color: "red" }} onClick={props.onClick}>hi</Box>;
			}`,
			{ filename: "Spread.tsx", target: "dom", hydratable: false },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: { title: () => string; onClick: () => void }) => Node;
		};
		const title = signal("one");
		let clicks = 0;
		const root = document.createElement("div");
		document.body.appendChild(root);
		render.render(() => App({ title, onClick: () => clicks++ }), root);

		const box = root.querySelector("div") as HTMLElement;
		expect(box.getAttribute("id")).toBe("b");
		expect(box.getAttribute("data-fixed")).toBe("1");
		expect(box.getAttribute("title")).toBe("one");
		expect(box.style.getPropertyValue("color")).toBe("red");
		expect(box.hasAttribute("tone")).toBe(false);
		expect(box.hasAttribute("children")).toBe(false);
		expect(box.textContent).toBe("hi");

		title.set("two");
		expect(box.getAttribute("title")).toBe("two");

		box.dispatchEvent(new window.Event("click", { bubbles: true }));
		expect(clicks).toBe(1);
	});

	test("DOM compile calls element refs with the node", () => {
		const { code } = compile(
			`export function App(props) {
				return <section><p ref={(el) => props.seen(el)} class="r">x</p><i ref={[props.seen, props.seen]} /></section>;
			}`,
			{ filename: "Ref.tsx", target: "dom", hydratable: false },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: { seen: (el: Element) => void }) => Node;
		};
		const seen: string[] = [];
		const root = document.createElement("div");
		render.render(() => App({ seen: (el) => seen.push(el.tagName.toLowerCase()) }), root);
		expect(seen).toEqual(["p", "i", "i"]);
	});

	test("omitProps returns a live remainder without the omitted keys", () => {
		const title = signal("a");
		const props = {
			get title() {
				return title();
			},
			tone: "x",
			id: "i",
		};
		const rest = render.omitProps(props, ["tone"]) as Record<string, unknown>;
		expect(Object.keys(rest).sort()).toEqual(["id", "title"]);
		expect(rest["tone"]).toBeUndefined();
		expect("tone" in rest).toBe(false);
		title.set("b");
		expect(rest["title"]).toBe("b");
	});

	test("mergeProps resolves function sources and skips undefined overrides", () => {
		const extra = signal<Record<string, unknown>>({ a: 1 });
		const merged = render.mergeProps({ a: 0, b: 2 }, () => extra(), { c: undefined }) as Record<
			string,
			unknown
		>;
		expect(merged["a"]).toBe(1);
		expect(merged["b"]).toBe(2);
		extra.set({ a: 5, d: 4 });
		expect(merged["a"]).toBe(5);
		expect(merged["d"]).toBe(4);
		expect(Object.keys(merged).sort()).toEqual(["a", "b", "c", "d"]);
		expect(render.mergeProps({ size: "md" }, { size: undefined }).size).toBe("md");
	});

	test("SSR spread omits handlers and serializes style objects", () => {
		const html = ssr.resolveSSRNode(
			ssr.ssrElement(
				"div",
				ssr.mergeProps({ class: "x" }, () => ({
					id: "a",
					onClick: () => {},
					style: { color: "red", "--gap": "2px" },
					hidden: false,
				})),
				"hi",
			),
		);
		expect(html).toBe('<div class="x" id="a" style="color:red;--gap:2px">hi</div>');
	});

	test("SSR compile renders dynamic class, style and grouped holes once-escaped", () => {
		const { code } = compile(
			`export function App(props) {
				return (
					<div class={props.cls} style={{ color: props.color, "--gap": props.gap }} title={props.title}>
						<span style={props.spanStyle} class={"a " + props.k}>{props.text}</span>
					</div>
				);
			}`,
			{ filename: "Group.tsx", target: "ssr", hydratable: false },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: Record<string, unknown>) => ssr.SSRPayload;
		};
		const html = ssr.renderToString(() =>
			App({
				cls: "box",
				color: "red",
				gap: undefined,
				title: 'Tom & "Jerry"',
				spanStyle: { "margin-top": "2px", paddingLeft: "1px" },
				k: "b",
				text: "<x> & y",
			}),
		);
		expect(html).toBe(
			'<div class="box" style="color:red" title="Tom &amp; &quot;Jerry&quot;"><span style="margin-top:2px;padding-left:1px" class="a b">&lt;x&gt; &amp; y</span></div>',
		);
	});

	test("hydrate adopts SSR markup with dynamic holes, Show and For (no duplication)", () => {
		const src = `export function App(props) {
			return (
				<div class="app">
					<b>{props.name()}</b>
					<Show when={props.show()}><i>shown</i></Show>
					<ul><For each={props.items()}>{(n) => <li>{n}</li>}</For></ul>
					<button type="button" onClick={props.onClick}>go</button>
				</div>
			);
		}`;
		const server = compile(src, { filename: "H.tsx", target: "ssr", hydratable: true });
		const client = compile(src, { filename: "H.tsx", target: "dom", hydratable: true });
		const { App: ServerApp } = loadCompiled(
			server.code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: Record<string, unknown>) => ssr.SSRPayload;
		};
		const { App: ClientApp } = loadCompiled(
			client.code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: Record<string, unknown>) => Node;
		};
		const name = signal("ada");
		const show = signal(true);
		const items = signal([1, 2]);
		let clicks = 0;
		const props = { name, show, items, onClick: () => clicks++ };

		const root = document.createElement("div");
		root.innerHTML = ssr.renderToString(() => ServerApp(props));
		document.body.appendChild(root);
		const serverButton = root.querySelector("button");
		// Delegation is module-global; earlier tests registered it on an older document.
		render.clearDelegatedEvents();
		render.delegateEvents(["click"]);
		render.hydrate(() => ClientApp(props), root);

		expect(root.querySelectorAll(".app").length).toBe(1);
		expect(root.querySelector("b")?.textContent).toBe("ada");
		expect(root.querySelectorAll("i").length).toBe(1);
		expect([...root.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["1", "2"]);
		// Claimed, not recreated: the server's element is the live one.
		expect(root.querySelector("button")).toBe(serverButton);

		root.querySelector("button")?.click();
		expect(clicks).toBe(1);
		name.set("grace");
		expect(root.querySelector("b")?.textContent).toBe("grace");
		show.set(false);
		expect(root.querySelectorAll("i").length).toBe(0);
		items.set([3]);
		expect([...root.querySelectorAll("li")].map((li) => li.textContent)).toEqual(["3"]);
	});

	test("SSR spread elements keep hydration markers and void tags", () => {
		const { code } = compile(
			`export function App(props) {
				return <div {...props.rest} class="f"><Show when={props.on}><b>x</b></Show><input {...props.input} /></div>;
			}`,
			{ filename: "Spread.tsx", target: "ssr", hydratable: true },
		);
		const { App } = loadCompiled(
			code,
			"@arachnejs/render/ssr",
			ssr as unknown as Record<string, unknown>,
		) as unknown as {
			App: (p: Record<string, unknown>) => ssr.SSRPayload;
		};
		const html = ssr.renderToString(() =>
			App({ rest: { id: "r" }, on: true, input: { value: "a&b" } }),
		);
		expect(html).not.toContain("&lt;!--");
		expect(html).toContain("<!--$-->");
		expect(html).not.toContain("</input>");
		expect(html).toContain('value="a&amp;b"');
	});

	test("dynamic children inside fragments and Show update locally", () => {
		const source = `
function Toggle(props) {
  props.renders.count++;
  return (
    <>
      <button type="button">toggle</button>
      {props.open() ? <em class="panel">open</em> : null}
    </>
  );
}
export function App(props) {
  props.renders.app++;
  return (
    <div>
      <Toggle open={props.open} renders={props.renders} />
      <Show when={props.show()}>{props.open() ? <b class="inner">inner</b> : null}</Show>
    </div>
  );
}
`;
		const { code } = compile(source, { filename: "Toggle.tsx", target: "dom", hydratable: false });
		const { App } = loadCompiled(
			code,
			"@arachnejs/render",
			render as unknown as Record<string, unknown>,
		) as unknown as {
			App: (props: Record<string, unknown>) => unknown;
		};
		const open = signal(false);
		const show = signal(true);
		const renders = { app: 0, count: 0 };
		const root = document.createElement("div");
		document.body.appendChild(root);
		render.render(() => App({ open, show, renders }) as Node, root);
		expect(root.querySelector(".panel")).toBeNull();

		open.set(true);
		// The fragment's ternary and the Show child update in place…
		expect(root.querySelector(".panel")?.textContent).toBe("open");
		expect(root.querySelector(".inner")?.textContent).toBe("inner");
		// …without re-running either component.
		expect(renders).toEqual({ app: 1, count: 1 });

		open.set(false);
		expect(root.querySelector(".panel")).toBeNull();
		expect(root.querySelector(".inner")).toBeNull();
	});
});
