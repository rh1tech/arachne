/**
 * Pagination behavior + active-page class wiring.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachnejs/render";
import { bunPlugin } from "@arachnejs/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../.test-out");

async function loadHarness(): Promise<{
	run: (root: HTMLElement) => {
		get: (sel: string) => Element | null;
		all: (sel: string) => NodeListOf<Element>;
		click: (sel: string) => void;
		page: { (): number; set: (n: number) => void };
	};
}> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/pagination-harness.tsx");
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
	if (!out) throw new Error("no pagination bundle");
	return import(`${out.path}?t=${Date.now()}`) as Promise<{
		run: (root: HTMLElement) => {
			get: (sel: string) => Element | null;
			all: (sel: string) => NodeListOf<Element>;
			click: (sel: string) => void;
			page: { (): number; set: (n: number) => void };
		};
	}>;
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

describe("pagination", () => {
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

	test("marks the current page and keeps its label", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		const active = api.get(".a-pagination-page-active");
		expect(active).toBeTruthy();
		expect(active?.getAttribute("aria-current")).toBe("page");
		expect(active?.textContent?.trim()).toBe("3");
		expect(active?.className).toContain("a-pagination-page");
		expect(active?.className).toContain("a-pagination-page-active");
	});

	test("clicking a page updates the active button", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		api.click(".a-pagination-pages .a-pagination-page:first-child");
		expect(api.page()).toBe(1);
		expect(api.get(".a-pagination-page-active")?.textContent?.trim()).toBe("1");
	});
});
