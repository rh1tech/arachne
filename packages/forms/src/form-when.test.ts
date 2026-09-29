/**
 * FormWhen + FormColumns via bunPlugin harness.
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
	setKind: (value: string) => void;
	kind: () => string;
};

async function loadHarness(): Promise<{ run: (root: HTMLElement) => Api }> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/form-when-harness.tsx");
	const result = await Bun.build({
		entrypoints: [entry],
		outdir,
		target: "browser",
		format: "esm",
		plugins: [bunPlugin({ hydratable: false })],
		external: ["@arachne/render", "@arachne/signals", "@arachne/schema"],
	});
	if (!result.success) throw new Error(result.logs.map(String).join("\n"));
	const out = result.outputs[0];
	if (!out) throw new Error("no form-when bundle");
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
	g["HTMLInputElement"] = win.HTMLInputElement;
	g["HTMLSelectElement"] = win.HTMLSelectElement;
	g["Event"] = win.Event;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);
}

describe("FormWhen relationships", () => {
	let window: Window;
	let harness: Awaited<ReturnType<typeof loadHarness>>;
	let api: Api;

	beforeEach(async () => {
		window = new Window({ url: "https://localhost/" });
		installDomGlobals(window);
		clearDelegatedEvents();
		harness = await loadHarness();
		const root = document.createElement("div");
		document.body.appendChild(root);
		api = harness.run(root);
	});

	afterEach(() => {
		clearDelegatedEvents(document);
		window.close();
	});

	test("hides related area until kind is business", () => {
		expect(api.get(".a-columns")).toBeTruthy();
		expect(api.get('[data-test="company-area"]')).toBeNull();

		api.setKind("business");
		expect(api.kind()).toBe("business");
		expect(api.get('[data-test="company-area"]')).toBeTruthy();
		expect(api.get('input[name="company"]')).toBeTruthy();

		api.setKind("personal");
		expect(api.get('[data-test="company-area"]')).toBeNull();
	});
});
