/**
 * Outside-click dismiss for Menu / DatePicker-style hosts.
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
	click: (sel: string) => void;
	menuOpen: () => boolean;
	dateOpen: () => boolean;
	pointerOutside: () => void;
};

async function loadHarness(): Promise<{ run: (root: HTMLElement) => Api }> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/dismiss-harness.tsx");
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
	if (!out) throw new Error("no dismiss bundle");
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
	// Floating dropdowns (autoPosition) measure computed styles.
	g["getComputedStyle"] = win.getComputedStyle.bind(win);
	g["PointerEvent"] =
		(win as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent ?? win.Event;
}

async function flush(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((r) => setTimeout(r, 0));
	await Promise.resolve();
}

describe("outside click dismiss", () => {
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

	test("menu closes on outside pointerdown", async () => {
		api.click('[data-test="menu-trigger"]');
		await flush();
		expect(api.menuOpen()).toBe(true);
		expect(api.get(".a-menu")).toBeTruthy();

		api.pointerOutside();
		await flush();
		expect(api.menuOpen()).toBe(false);
		expect(api.get(".a-menu")).toBeNull();
	});

	test("datepicker closes on outside pointerdown", async () => {
		api.click(".a-datepicker-trigger");
		await flush();
		expect(api.dateOpen()).toBe(true);
		expect(api.get(".a-datepicker-dropdown")).toBeTruthy();

		api.pointerOutside();
		await flush();
		expect(api.get(".a-datepicker-dropdown")).toBeNull();
	});
});
