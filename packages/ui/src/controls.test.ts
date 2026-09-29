/**
 * Compiles Arachne JSX via bunPlugin so controls get reactive DOM bindings.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachne/render";
import { bunPlugin } from "@arachne/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../.test-out");

async function loadHarness(): Promise<{
	run: (root: HTMLElement) => {
		get: (sel: string) => Element | null;
		all: (sel: string) => NodeListOf<Element>;
		click: (sel: string) => void;
		setInput: (sel: string, value: string) => void;
		signals: Record<string, { (): unknown; set: (v: unknown) => void }>;
	};
}> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/controls-harness.tsx");
	const result = await Bun.build({
		entrypoints: [entry],
		outdir,
		target: "browser",
		format: "esm",
		plugins: [bunPlugin({ hydratable: false })],
		external: ["@arachne/render", "@arachne/signals", "@arachne/ui"],
	});
	if (!result.success) {
		throw new Error(result.logs.map(String).join("\n"));
	}
	const out = result.outputs[0];
	if (!out) throw new Error("no bundle");
	return import(`${out.path}?t=${Date.now()}`) as Promise<{
		run: (root: HTMLElement) => {
			get: (sel: string) => Element | null;
			all: (sel: string) => NodeListOf<Element>;
			click: (sel: string) => void;
			setInput: (sel: string, value: string) => void;
			signals: Record<string, { (): unknown; set: (v: unknown) => void }>;
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
	g["HTMLInputElement"] = win.HTMLInputElement;
	g["HTMLButtonElement"] = win.HTMLButtonElement;
	g["HTMLSelectElement"] = win.HTMLSelectElement;
	g["HTMLTextAreaElement"] = win.HTMLTextAreaElement;
	g["Event"] = win.Event;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);
}

describe("form controls", () => {
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

	test("mounts all controls and exercises interactions", () => {
		const root = document.createElement("div");
		document.body.appendChild(root);
		const api = harness.run(root);

		expect(api.get("input.a-input-text")).toBeTruthy();
		expect(api.get("textarea")).toBeTruthy();
		expect(api.all("select").length).toBeGreaterThanOrEqual(1);
		expect(api.get('input[type="checkbox"]')).toBeTruthy();
		expect(api.get('input[role="switch"]')).toBeTruthy();
		expect(api.get('input[type="radio"]')).toBeTruthy();
		expect(api.get('input[type="file"]')).toBeTruthy();
		expect(api.get(".a-password input")).toBeTruthy();
		expect(api.all(".a-pin-cell").length).toBe(4);
		expect(api.get('input[type="range"]')).toBeTruthy();
		expect(api.get(".a-search")).toBeTruthy();
		expect(api.get('input[type="color"]')).toBeTruthy();
		expect(api.get('input[type="date"]')).toBeTruthy();
		expect(api.get('input[type="time"]')).toBeTruthy();
		expect(api.get(".a-json, textarea.a-json, .a-textarea")).toBeTruthy();
		expect(api.get("fieldset")).toBeTruthy();
		expect(api.all(".a-chip").length).toBeGreaterThan(0);
		expect(api.all(".a-rating-star").length).toBe(5);
		expect(api.get(".a-multiselect")).toBeTruthy();
		expect(api.get(".a-tags-input")).toBeTruthy();
		expect(api.get(".a-autocomplete")).toBeTruthy();
		expect(api.get(".a-segmented")).toBeTruthy();
		expect(api.all('input[type="range"]').length).toBeGreaterThanOrEqual(3);

		api.click(".a-password button");
		expect((api.get(".a-password input") as HTMLInputElement).type).toBe("text");
		expect(api.get(".a-password button")?.getAttribute("aria-label")).toBe("Hide password");
		expect(api.get(".a-password .a-icon")?.querySelector("path")?.getAttribute("d")).toContain(
			"M12,9A3",
		);

		api.click(".a-password button");
		expect((api.get(".a-password input") as HTMLInputElement).type).toBe("password");
		expect(api.get(".a-password .a-icon")?.querySelector("path")?.getAttribute("d")).toContain(
			"M11.83,9",
		);

		api.click(".a-rating-star:nth-child(5)");
		expect(api.signals["rating"]?.()).toBe(5);

		api.click(".a-segment:nth-child(2)");
		expect(api.signals["seg"]?.()).toBe("b");

		api.click(".a-number button:last-of-type");
		expect(api.signals["qty"]?.()).toBe(3);
	});
});
