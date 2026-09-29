/**
 * Showcase navigation + code highlight.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachne/render";
import { bunPlugin } from "@arachne/vite";
import { Window } from "happy-dom";
import { highlightCode } from "./highlight.ts";

const outdir = join(import.meta.dir, "../.test-out");

function installDomGlobals(win: Window): void {
	const g = globalThis as unknown as Record<string, unknown>;
	g["window"] = win;
	g["document"] = win.document;
	g["Node"] = win.Node;
	g["HTMLElement"] = win.HTMLElement;
	g["Element"] = win.Element;
	g["Comment"] = win.Comment;
	g["Text"] = win.Text;
	g["SVGElement"] = win.SVGElement;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);
	g["performance"] = win.performance;
}

describe("highlightCode", () => {
	test("wraps keywords strings and tags", () => {
		const html = highlightCode(`const x = <Button>Hi</Button>;`, "tsx");
		expect(html).toContain("a-tok-keyword");
		expect(html).toContain("const");
		expect(html).toContain("a-tok-tag");
		expect(html).toContain("Button");
		expect(html).not.toContain("<Button>"); // escaped
		expect(html).toContain("&lt;");
	});
});

describe("docs nav reactivity", () => {
	let window: Window;

	beforeEach(() => {
		window = new Window({ url: "https://localhost/" });
		installDomGlobals(window);
		clearDelegatedEvents();
	});

	afterEach(() => {
		clearDelegatedEvents(document);
		window.close();
	});

	test("Show page switch updates content", async () => {
		mkdirSync(outdir, { recursive: true });
		const entry = join(import.meta.dir, "fixtures/docs-nav-harness.tsx");

		const result = await Bun.build({
			entrypoints: [entry],
			outdir,
			target: "browser",
			format: "esm",
			plugins: [bunPlugin({ hydratable: false })],
			external: ["@arachne/render", "@arachne/signals", "@arachne/ui"],
		});
		if (!result.success) throw new Error(result.logs.map(String).join("\n"));
		const out = result.outputs[0];
		if (!out) throw new Error("no bundle");
		const mod = (await import(`${out.path}?t=${Date.now()}`)) as {
			run: (root: HTMLElement) => {
				clickLabel: (label: string) => void;
				page: () => string | null | undefined;
			};
		};

		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = mod.run(root);
		expect(api.page()).toBe("overview");
		api.clickLabel("Button");
		expect(api.page()).toBe("button");
	});
});
