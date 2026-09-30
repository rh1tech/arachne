/**
 * Kit-ops widgets: callouts, status, team, billing.
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
	const entry = join(import.meta.dir, "fixtures/kit-ops-harness.tsx");
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
	if (!out) throw new Error("no kit-ops bundle");
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

describe("kit-ops widgets", () => {
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

	test("mounts callout status team billing ops", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get(".a-callout")).toBeTruthy();
		expect(api.get(".a-changelog")).toBeTruthy();
		expect(api.get(".a-version-tag")).toBeTruthy();
		expect(api.get(".a-http")).toBeTruthy();
		expect(api.get(".a-endpoint")).toBeTruthy();
		expect(api.get(".a-json-tree")).toBeTruthy();
		expect(api.get(".a-log")).toBeTruthy();
		expect(api.get(".a-service")).toBeTruthy();
		expect(api.get(".a-uptime")).toBeTruthy();
		expect(api.get(".a-usage")).toBeTruthy();
		expect(api.get(".a-upgrade")).toBeTruthy();
		expect(api.get(".a-profile")).toBeTruthy();
		expect(api.get(".a-member")).toBeTruthy();
		expect(api.get(".a-priority")).toBeTruthy();
		expect(api.get(".a-severity")).toBeTruthy();
		expect(api.get(".a-commit")).toBeTruthy();
		expect(api.get(".a-branch")).toBeTruthy();
		expect(api.get(".a-build")).toBeTruthy();
		expect(api.get(".a-pipeline")).toBeTruthy();
		expect(api.get(".a-sync")).toBeTruthy();
		expect(api.get(".a-cc")).toBeTruthy();
		expect(api.get(".a-invoice")).toBeTruthy();
		expect(api.get(".a-ftree")).toBeTruthy();
		expect(api.get(".a-gauge")).toBeTruthy();
		expect(api.get(".a-invite")).toBeTruthy();
	});
});
