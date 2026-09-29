/**
 * Kit-more widgets: cookie, checklist, pricing, kanban, heatmap.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachne/render";
import { bunPlugin } from "@arachne/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../.test-out");

type Api = {
	get: (sel: string) => Element | null;
	all: (sel: string) => NodeListOf<Element>;
	click: (sel: string) => void;
};

async function loadHarness(): Promise<{ run: (root: HTMLElement) => Api }> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/kit-more-harness.tsx");
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
	if (!out) throw new Error("no kit-more bundle");
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
	g["SVGElement"] = win.SVGElement;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);
	g["performance"] = win.performance;
	g["navigator"] = win.navigator;
}

describe("kit-more widgets", () => {
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

	test("mounts cookie checklist pricing kanban heatmap", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-cookie")).toBeTruthy();
		expect(api.get(".a-hotkey")).toBeTruthy();
		expect(api.get(".a-back-link")).toBeTruthy();
		expect(api.get(".a-inline-edit")).toBeTruthy();
		expect(api.get(".a-copy-field")).toBeTruthy();
		expect(api.get(".a-checklist")).toBeTruthy();
		expect(api.get(".a-pricing")).toBeTruthy();
		expect(api.get(".a-stepped")).toBeTruthy();
		expect(api.get(".a-dots")).toBeTruthy();
		expect(api.get(".a-file-card")).toBeTruthy();
		expect(api.get(".a-heatmap")).toBeTruthy();
		expect(api.get(".a-angle")).toBeTruthy();
		expect(api.get(".a-kanban")).toBeTruthy();
	});

	test("cookie accept dismisses", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		expect(api.get(".a-cookie")).toBeTruthy();
		api.click(".a-cookie .a-btn");
		expect(api.get(".a-cookie")).toBeNull();
	});
});
