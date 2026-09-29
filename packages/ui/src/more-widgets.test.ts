/**
 * Newer widgets: tree, carousel, calendar, dropzone shell, hovercard host.
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
	const entry = join(import.meta.dir, "fixtures/more-widgets-harness.tsx");
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
	if (!out) throw new Error("no more-widgets bundle");
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

describe("more widgets", () => {
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

	test("mounts tree carousel calendar burger hovercard dropzone", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-tree")).toBeTruthy();
		expect(api.get(".a-carousel")).toBeTruthy();
		expect(api.get(".a-calendar")).toBeTruthy();
		expect(api.get(".a-burger")).toBeTruthy();
		expect(api.get(".a-hovercard")).toBeTruthy();
		expect(api.get(".a-dropzone")).toBeTruthy();
		expect(api.get(".a-subnav")).toBeTruthy();
		expect(api.get(".a-datepicker")).toBeTruthy();
		expect(api.get(".a-swatch")).toBeTruthy();
	});

	test("carousel next advances status", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		expect(api.get(".a-carousel-status")?.textContent).toContain("1 /");
		api.click('.a-carousel-controls button[aria-label="Next"]');
		expect(api.get(".a-carousel-status")?.textContent).toContain("2 /");
	});
});
