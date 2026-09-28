import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { compile } from "@arachne/jsx";
import { signal } from "@arachne/signals";
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
	moduleSpecifier: "@arachne/render" | "@arachne/render/ssr",
	runtime: Record<string, unknown>,
): { App: (props: { show: () => boolean; items: () => number[] }) => unknown } {
	const imports: Array<{ name: string; alias: string }> = [];
	const re =
		moduleSpecifier === "@arachne/render"
			? /import\s*\{([^}]+)\}\s*from\s*"@arachne\/render"\s*;?/g
			: /import\s*\{([^}]+)\}\s*from\s*"@arachne\/render\/ssr"\s*;?/g;

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
			"@arachne/render",
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

	test("SSR compile renders matching markup", () => {
		const { code } = compile(fixture, {
			filename: "App.tsx",
			target: "ssr",
			hydratable: true,
		});

		const { App } = loadCompiled(
			code,
			"@arachne/render/ssr",
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
});
