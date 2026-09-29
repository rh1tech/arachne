/**
 * Kit-app widgets: commerce, chrome, inbox, compare.
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
	const entry = join(import.meta.dir, "fixtures/kit-app-harness.tsx");
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
	if (!out) throw new Error("no kit-app bundle");
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

describe("kit-app widgets", () => {
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

	test("mounts announce commerce inbox compare frames", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-announce")).toBeTruthy();
		expect(api.get(".a-command-bar")).toBeTruthy();
		expect(api.get(".a-toc")).toBeTruthy();
		expect(api.get(".a-props")).toBeTruthy();
		expect(api.get(".a-stat-card")).toBeTruthy();
		expect(api.get(".a-qty")).toBeTruthy();
		expect(api.get(".a-price")).toBeTruthy();
		expect(api.get(".a-product")).toBeTruthy();
		expect(api.get(".a-cart-line")).toBeTruthy();
		expect(api.get(".a-order")).toBeTruthy();
		expect(api.get(".a-copy-id")).toBeTruthy();
		expect(api.get(".a-env-badge")).toBeTruthy();
		expect(api.get(".a-locale")).toBeTruthy();
		expect(api.get(".a-org")).toBeTruthy();
		expect(api.get(".a-inbox-item")).toBeTruthy();
		expect(api.get(".a-reactions")).toBeTruthy();
		expect(api.get(".a-mention")).toBeTruthy();
		expect(api.get(".a-browser")).toBeTruthy();
		expect(api.get(".a-phone")).toBeTruthy();
		expect(api.get(".a-feature-compare")).toBeTruthy();
		expect(api.get(".a-view-toggle")).toBeTruthy();
		expect(api.get(".a-bulk-bar")).toBeTruthy();
		expect(api.get(".a-live")).toBeTruthy();
		expect(api.get(".a-secret")).toBeTruthy();
	});

	test("quantity increases", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);
		const before = api.get(".a-qty-value")?.textContent;
		api.click('.a-qty-btn[aria-label="Increase"]');
		expect(api.get(".a-qty-value")?.textContent).not.toBe(before);
	});
});
