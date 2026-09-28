import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { bunPlugin, vitePlugin } from "../src/index.ts";

describe("vitePlugin", () => {
	test("transforms jsx into @arachne/render imports", () => {
		const plugin = vitePlugin({ hydratable: false });
		const result = plugin.transform(
			`export function Hi() { return <span class="x">hi</span>; }`,
			"/tmp/Hi.tsx",
		);
		expect(result?.code).toContain("@arachne/render");
		expect(result?.code).toContain("template");
	});

	test("ignores non-jsx modules", () => {
		const plugin = vitePlugin();
		expect(plugin.transform("export const x = 1;", "/tmp/x.ts")).toBeUndefined();
	});
});

describe("bunPlugin", () => {
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

	test("bundles a tsx entry via Bun.build", async () => {
		const entry = new URL("./fixtures/hello.tsx", import.meta.url);
		const result = await Bun.build({
			entrypoints: [entry.pathname],
			target: "browser",
			format: "esm",
			plugins: [bunPlugin({ hydratable: false })],
			external: ["@arachne/render", "@arachne/signals"],
		});
		expect(result.success).toBe(true);
		const output = result.outputs[0];
		expect(output).toBeDefined();
		const code = await output?.text();
		expect(code).toContain("@arachne/render");
		expect(code).toContain("template");
	});
});
