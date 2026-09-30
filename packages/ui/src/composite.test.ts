/**
 * Composite widgets: groups, nav, sortable, splitter, datatable.
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
	click: (sel: string) => void;
};

async function loadHarness(): Promise<{ run: (root: HTMLElement) => Api }> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/composite-harness.tsx");
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
	if (!out) throw new Error("no composite bundle");
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

describe("composite widgets", () => {
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

	test("mounts groups nav meter sortable splitter year", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-btn-group")).toBeTruthy();
		expect(api.get(".a-toggle-group")).toBeTruthy();
		expect(api.get(".a-avatar-group")).toBeTruthy();
		expect(api.get(".a-notification")).toBeTruthy();
		expect(api.get(".a-bottom-nav")).toBeTruthy();
		expect(api.get(".a-sortable")).toBeTruthy();
		expect(api.get(".a-pw-strength")).toBeTruthy();
		expect(api.get(".a-meter")).toBeTruthy();
		expect(api.get(".a-comment")).toBeTruthy();
		expect(api.get(".a-leader")).toBeTruthy();
		expect(api.get(".a-barlist")).toBeTruthy();
		expect(api.get(".a-splitter")).toBeTruthy();
		expect(api.get(".a-year-picker")).toBeTruthy();
		expect(api.get(".a-datatable")).toBeTruthy();
	});

	test("sortable moves item down", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		expect(api.get(".a-sortable-label")?.textContent).toBe("One");
		api.click('.a-sortable-item:first-child button[aria-label="Move down"]');
		expect(api.get(".a-sortable-label")?.textContent).toBe("Two");
	});

	test("datatable sorts by column", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		const before = [...api.all(".a-datatable-td")].map((el) => el.textContent);
		expect(before[0]).toBe("B");
		api.click(".a-datatable-sort");
		const after = [...api.all(".a-datatable-td")].map((el) => el.textContent);
		expect(after[0]).toBe("A");
	});
});
