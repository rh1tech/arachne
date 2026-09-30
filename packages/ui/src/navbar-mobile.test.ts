/**
 * Mobile navbar behavior — burger drawer, nested click expand, dismiss.
 * Viewport is forced to phone width so media-query CSS paths apply when available.
 */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents } from "@arachnejs/render";
import { bunPlugin } from "@arachnejs/vite";
import { Window } from "happy-dom";

const outdir = join(import.meta.dir, "../.test-out");

type Api = {
	ctrl: {
		mobileOpen: () => boolean;
		isOpen: (id: string) => boolean;
		openPath: () => string[];
		setMobileOpen: (open: boolean) => void;
		dispose: () => void;
	};
	selected: () => string | null;
	get: (sel: string) => Element | null;
	all: (sel: string) => NodeListOf<Element>;
	click: (sel: string) => void;
	dispose: () => void;
};

async function loadHarness(): Promise<{
	run: (root: HTMLElement, opts?: { trigger?: "hover" | "click" }) => Api;
}> {
	mkdirSync(outdir, { recursive: true });
	const entry = join(import.meta.dir, "fixtures/navbar-harness.tsx");
	const result = await Bun.build({
		entrypoints: [entry],
		outdir,
		target: "browser",
		format: "esm",
		plugins: [bunPlugin({ hydratable: false })],
		external: ["@arachnejs/render", "@arachnejs/signals", "@arachnejs/ui"],
	});
	if (!result.success) {
		throw new Error(result.logs.map(String).join("\n"));
	}
	const out = result.outputs[0];
	if (!out) throw new Error("no navbar bundle");
	return import(`${out.path}?t=${Date.now()}`) as Promise<{
		run: (root: HTMLElement, opts?: { trigger?: "hover" | "click" }) => Api;
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
	g["KeyboardEvent"] = win.KeyboardEvent;
	g["MouseEvent"] = win.MouseEvent;
	g["Event"] = win.Event;
	g["MutationObserver"] = win.MutationObserver;
	g["customElements"] = win.customElements;
	g["requestAnimationFrame"] = win.requestAnimationFrame.bind(win);
	g["cancelAnimationFrame"] = win.cancelAnimationFrame.bind(win);

	const happy = win as unknown as {
		happyDOM?: { setViewport?: (v: { width: number; height: number }) => void };
	};
	happy.happyDOM?.setViewport?.({ width: 375, height: 667 });
	Object.defineProperty(win, "innerWidth", { configurable: true, value: 375 });
	Object.defineProperty(win, "innerHeight", { configurable: true, value: 667 });
}

async function flush(): Promise<void> {
	await Promise.resolve();
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
	await Promise.resolve();
	// happy-dom MutationObserver callbacks settle on a later turn
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => resolve());
	});
	await Promise.resolve();
}

describe("navbar mobile", () => {
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
		api.dispose();
		clearDelegatedEvents(document);
		window.close();
	});

	test("burger opens and closes the mobile drawer", async () => {
		expect(api.ctrl.mobileOpen()).toBe(false);
		expect(api.get(".a-navbar-mobile")).toBeNull();

		api.click(".a-navbar-burger");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(true);
		expect(api.get(".a-navbar-mobile")).toBeTruthy();
		expect(api.get(".a-navbar-mobile-panel")).toBeTruthy();
		expect(api.get(".a-nav-list-mobile")).toBeTruthy();

		api.click(".a-navbar-mobile-close");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(false);
		expect(api.get(".a-navbar-mobile")).toBeNull();
		expect(document.querySelector("[data-a-portal]")).toBeNull();
	});

	test("backdrop dismisses the mobile drawer", async () => {
		api.click(".a-navbar-burger");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(true);

		api.click(".a-navbar-mobile-backdrop");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(false);
		expect(api.get(".a-navbar-mobile")).toBeNull();
	});

	test("Escape closes the mobile drawer", async () => {
		api.click(".a-navbar-burger");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(true);

		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(false);
	});

	test("nested submenus expand by click and leaf closes drawer", async () => {
		api.click(".a-navbar-burger");
		await flush();
		expect(api.ctrl.mobileOpen()).toBe(true);

		const product = [...api.all(".a-navbar-mobile .a-nav-link")].find((el) =>
			el.textContent?.includes("Product"),
		) as HTMLElement | undefined;
		expect(product).toBeTruthy();
		product?.click();
		await flush();
		expect(api.ctrl.isOpen("product")).toBe(true);
		expect(document.querySelector(".a-nav-flyout")).toBeNull();
		expect(api.get(".a-navbar-mobile .a-nav-sub")).toBeTruthy();

		const core = [...api.all(".a-navbar-mobile .a-nav-link")].find((el) =>
			el.textContent?.includes("Core"),
		) as HTMLElement | undefined;
		expect(core).toBeTruthy();
		core?.click();
		await flush();
		expect(api.ctrl.isOpen("core")).toBe(true);

		const signals = [...api.all(".a-navbar-mobile .a-nav-link")].find((el) =>
			el.textContent?.includes("Signals"),
		) as HTMLElement | undefined;
		expect(signals).toBeTruthy();
		signals?.click();
		await flush();

		expect(api.selected()).toBe("signals");
		expect(api.ctrl.mobileOpen()).toBe(false);
	});

	test("desktop click-trigger still works for nested menus", async () => {
		api.dispose();
		clearDelegatedEvents(document);
		const root = document.createElement("div");
		document.body.appendChild(root);
		api = harness.run(root, { trigger: "click" });

		const product = [...api.all(".a-navbar-desktop .a-nav-link")].find((el) =>
			el.textContent?.includes("Product"),
		) as HTMLElement | undefined;
		expect(product).toBeTruthy();
		product?.click();
		await flush();
		expect(api.ctrl.isOpen("product")).toBe(true);
		expect(api.get(".a-nav-flyout") ?? api.get(".a-navbar-desktop .a-nav-sub")).toBeTruthy();

		const core = [...document.querySelectorAll(".a-nav-flyout .a-nav-link")].find((el) =>
			el.textContent?.includes("Core"),
		) as HTMLElement | undefined;
		expect(core).toBeTruthy();
		core?.click();
		await flush();
		expect(api.ctrl.openPath()).toEqual(["product", "core"]);
		expect(api.ctrl.isOpen("core")).toBe(true);
	});
});
