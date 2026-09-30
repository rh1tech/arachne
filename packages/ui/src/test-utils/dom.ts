/**
 * Shared happy-dom + compiled-harness helpers for UI behaviour tests.
 *
 * ```ts
 * const dom = setupDom();            // in beforeEach
 * const h = await mountHarness<Api>("overlays");
 * h.api.open.set(true);
 * press("Escape");
 * h.dispose(); dom.teardown();       // in afterEach
 * ```
 */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents, delegateEvents } from "@arachnejs/render";
import { bunPlugin } from "@arachnejs/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../../.test-out");
const builds = new Map<string, Promise<string>>();
let importCounter = 0;

const GLOBALS = [
	"Node",
	"Element",
	"HTMLElement",
	"HTMLInputElement",
	"HTMLButtonElement",
	"HTMLSelectElement",
	"HTMLTextAreaElement",
	"SVGElement",
	"Comment",
	"Text",
	"Event",
	"KeyboardEvent",
	"MouseEvent",
	"PointerEvent",
	"FocusEvent",
	"InputEvent",
	"MutationObserver",
	"customElements",
	"getComputedStyle",
	"requestAnimationFrame",
	"cancelAnimationFrame",
	"matchMedia",
] as const;

export type Dom = { window: Window; teardown: () => void };

export function setupDom(): Dom {
	const window = new Window({ url: "https://localhost/", width: 1024, height: 768 });
	const g = globalThis as unknown as Record<string, unknown>;
	const w = window as unknown as Record<string, unknown>;
	const saved = new Map<string, unknown>();
	for (const key of ["window", "document", ...GLOBALS]) saved.set(key, g[key]);
	g["window"] = window;
	g["document"] = window.document;
	for (const key of GLOBALS) {
		const value = w[key];
		g[key] = typeof value === "function" && /^[a-z]/.test(key) ? value.bind(window) : value;
	}
	return {
		window,
		teardown: () => {
			clearDelegatedEvents(window.document as unknown as Document);
			window.close();
			for (const [key, value] of saved) g[key] = value;
		},
	};
}

function build(name: string): Promise<string> {
	let pending = builds.get(name);
	if (!pending) {
		pending = (async () => {
			mkdirSync(outdir, { recursive: true });
			const result = await Bun.build({
				entrypoints: [join(import.meta.dir, `../fixtures/${name}-harness.tsx`)],
				outdir,
				target: "browser",
				format: "esm",
				plugins: [bunPlugin({ hydratable: false })],
				external: ["@arachnejs/render", "@arachnejs/signals"],
			});
			if (!result.success) throw new Error(result.logs.map(String).join("\n"));
			const out = result.outputs[0];
			if (!out) throw new Error(`no bundle for ${name}`);
			return out.path;
		})();
		builds.set(name, pending);
	}
	return pending;
}

export type Mounted<Api> = { root: HTMLElement; api: Api; dispose: () => void };

/**
 * Build `fixtures/<name>-harness.tsx` once per test file and mount a fresh
 * module instance (isolated module state) into a new root.
 * The harness must export `run(root) => Api & { dispose(): void }`.
 */
export async function mountHarness<Api>(
	name: string,
	events: string[] = ["click", "input", "keydown", "pointerdown"],
): Promise<Mounted<Api>> {
	const path = await build(name);
	// Clear first: each fresh module instance re-registers its compiled
	// `delegateEvents([...])` against the current document on import.
	clearDelegatedEvents();
	const mod = (await import(`${path}?i=${++importCounter}`)) as {
		run: (root: HTMLElement) => Api & { dispose: () => void };
	};
	delegateEvents(events);
	const root = document.createElement("div");
	document.body.appendChild(root);
	const api = mod.run(root);
	return {
		root,
		api,
		dispose: () => {
			api.dispose();
			root.remove();
		},
	};
}

/** `querySelector` that throws, so a wrong selector can't pass silently. */
export function $(selector: string, root: ParentNode = document): HTMLElement {
	const el = root.querySelector<HTMLElement>(selector);
	if (!el) throw new Error(`no element matches ${selector}`);
	return el;
}

export function click(target: string | HTMLElement, root?: ParentNode): void {
	(typeof target === "string" ? $(target, root) : target).click();
}

export function press(
	key: string,
	target: EventTarget = document.activeElement ?? document.body,
	init: KeyboardEventInit = {},
): void {
	target.dispatchEvent(
		new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }),
	);
}

export function pointerDown(target: EventTarget): void {
	target.dispatchEvent(new Event("pointerdown", { bubbles: true, cancelable: true }));
}

export function typeInto(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
	el.value = value;
	el.dispatchEvent(new Event("input", { bubbles: true }));
}

/** Poll until `pred()` holds (microtasks + macrotasks), failing after `timeout` ms. */
export async function waitFor(pred: () => boolean, timeout = 500): Promise<void> {
	const start = Date.now();
	while (!pred()) {
		if (Date.now() - start > timeout) throw new Error("waitFor timed out");
		await new Promise<void>((r) => setTimeout(r, 0));
	}
}
