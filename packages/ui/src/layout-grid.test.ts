/**
 * Layout + form structure primitives (columns, grid, form areas).
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachnejs/render";
import { bunPlugin } from "@arachnejs/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../.test-out");

type Api = {
	get: (sel: string) => Element | null;
	all: (sel: string) => NodeListOf<Element>;
};

async function loadHarness(): Promise<{ run: (root: HTMLElement) => Api }> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/layout-harness.tsx");
	const result = await Bun.build({
		entrypoints: [entry],
		outdir,
		target: "browser",
		format: "esm",
		plugins: [bunPlugin({ hydratable: false })],
		external: ["@arachnejs/render", "@arachnejs/signals", "@arachnejs/ui"],
	});
	if (!result.success) throw new Error(result.logs.map(String).join("\n"));
	const out = result.outputs[0];
	if (!out) throw new Error("no layout bundle");
	return import(`${out.path}?t=${Date.now()}`) as Promise<{ run: (root: HTMLElement) => Api }>;
}

function installDomGlobals(win: Window): void {
	const g = globalThis as unknown as Record<string, unknown>;
	g["window"] = win;
	g["document"] = win.document;
	g["Node"] = win.Node;
	g["HTMLElement"] = win.HTMLElement;
	g["Element"] = win.Element;
	g["Comment"] = win.Comment;
	g["Text"] = win.Text;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);
}

describe("layout grid + form areas", () => {
	let window: Window;
	let harness: Awaited<ReturnType<typeof loadHarness>>;

	beforeEach(async () => {
		window = new Window({ url: "https://localhost/" });
		installDomGlobals(window);
		clearDelegatedEvents();
		harness = await loadHarness();
	});

	afterEach(() => {
		clearDelegatedEvents(document);
		window.close();
	});

	test("renders columns, grid, form section/area, horizontal field", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-columns")).toBeTruthy();
		expect(api.all(".a-column").length).toBeGreaterThanOrEqual(2);
		expect(api.get(".a-column-6")).toBeTruthy();
		expect(api.get(".a-grid")).toBeTruthy();
		expect(api.get(".a-grid-item-span")).toBeTruthy();
		expect(api.get(".a-form-section")).toBeTruthy();
		expect(api.get(".a-form-section-title")?.textContent).toContain("Account");
		expect(api.get(".a-form-area")).toBeTruthy();
		expect(api.get(".a-form-field-horizontal")).toBeTruthy();
		expect(api.get(".a-help")).toBeTruthy();
		expect(api.get(".a-level")).toBeTruthy();
		expect(api.get(".a-container")).toBeTruthy();
	});
});
