/**
 * Pattern widgets: banner, sheet, chat, choice cards, page header.
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
	const entry = join(import.meta.dir, "fixtures/patterns-harness.tsx");
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
	if (!out) throw new Error("no patterns bundle");
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
}

describe("pattern widgets", () => {
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

	test("mounts banner pageheader chat choice status", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-banner")).toBeTruthy();
		expect(api.get(".a-page-header")).toBeTruthy();
		expect(api.get(".a-status-dot")).toBeTruthy();
		expect(api.get(".a-theme-toggle")).toBeTruthy();
		expect(api.get(".a-user-btn")).toBeTruthy();
		expect(api.get(".a-choice-card")).toBeTruthy();
		expect(api.get(".a-chat-bubble")).toBeTruthy();
		expect(api.get(".a-typing")).toBeTruthy();
		expect(api.get(".a-json-viewer")).toBeTruthy();
		expect(api.get(".a-relative-time")).toBeTruthy();
		expect(api.get(".a-countup")).toBeTruthy();
		expect(api.get(".a-activity")).toBeTruthy();
	});

	test("bottom sheet opens", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		expect(api.get(".a-bottom-sheet")).toBeNull();
		api.click("[data-open-sheet]");
		expect(api.get(".a-bottom-sheet")).toBeTruthy();
	});
});
