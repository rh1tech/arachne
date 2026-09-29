/**
 * Surfaces, chrome, icons, widgets smoke test.
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
	const entry = join(import.meta.dir, "fixtures/widgets-harness.tsx");
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
	if (!out) throw new Error("no widgets bundle");
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
}

describe("widgets catalog", () => {
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

	test("mounts card panel hero media message icons timeline", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-card")).toBeTruthy();
		expect(api.get(".a-card-header-title")?.textContent).toContain("Card");
		expect(api.get(".a-panel")).toBeTruthy();
		expect(api.get(".a-tile-ancestor")).toBeTruthy();
		expect(api.get(".a-hero")).toBeTruthy();
		expect(api.get(".a-footer")).toBeTruthy();
		expect(api.get(".a-media")).toBeTruthy();
		expect(api.get(".a-message")).toBeTruthy();
		expect(api.get(".a-icon")).toBeTruthy();
		expect(api.get(".a-timeline")).toBeTruthy();
		expect(api.get(".a-list-group")).toBeTruthy();
		expect(api.get(".a-ring")).toBeTruthy();
		expect(api.get(".a-navlink")).toBeTruthy();
		expect(api.get(".a-indicator")).toBeTruthy();
		expect(api.get(".a-group")).toBeTruthy();
	});

	test("close button and spoiler toggle", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-message-header .a-delete")).toBeTruthy();
		api.click(".a-spoiler-toggle");
		expect(api.get(".a-spoiler-open")).toBeTruthy();
	});
});
