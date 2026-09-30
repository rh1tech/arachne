/**
 * Advanced widgets: pickers, transfer, spotlight, confirm, context host.
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
	const entry = join(import.meta.dir, "fixtures/advanced-harness.tsx");
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
	if (!out) throw new Error("no advanced bundle");
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

describe("advanced widgets", () => {
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

	test("mounts pickers transfer spark code countdown", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-color-picker")).toBeTruthy();
		expect(api.get(".a-month-picker")).toBeTruthy();
		expect(api.get(".a-time-picker")).toBeTruthy();
		expect(api.get(".a-daterange")).toBeTruthy();
		expect(api.get(".a-transfer")).toBeTruthy();
		expect(api.get(".a-semi")).toBeTruthy();
		expect(api.get(".a-sparkline")).toBeTruthy();
		expect(api.get(".a-codeblock")).toBeTruthy();
		expect(api.get(".a-countdown")).toBeTruthy();
		expect(api.get(".a-context-host")).toBeTruthy();
	});

	test("spotlight and confirm open from buttons", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		api.click("[data-open-spotlight]");
		expect(api.get(".a-spotlight")).toBeTruthy();

		api.click("[data-open-confirm]");
		expect(api.get(".a-confirm")).toBeTruthy();
	});

	test("transfer moves selected item", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		const first = api.get(".a-transfer-pane .a-transfer-item") as HTMLElement | null;
		expect(first?.textContent).toBe("A");
		first?.click();
		api.click(".a-transfer-actions button");
		const rightItems = [...api.all(".a-transfer-pane:last-child .a-transfer-item")].map(
			(el) => el.textContent,
		);
		expect(rightItems).toContain("A");
	});
});
