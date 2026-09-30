/**
 * The built site in Chromium: search, client-side navigation, the static
 * 404 page, the mobile drawer, and axe in light and dark themes.
 * Run: bun run e2e (in apps/site, after `bun run build`).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { preview } from "@arachnejs/kit";
import { type Browser, chromium, type Page } from "playwright";
import { ENTRIES } from "../app/nav.ts";

const dist = join(import.meta.dir, "..", "dist");
const axe = await Bun.file(Bun.resolveSync("axe-core/axe.min.js", import.meta.dir)).text();
let browser: Browser;
let site: ReturnType<typeof preview>;

beforeAll(async () => {
	if (!existsSync(join(dist, "index.html"))) throw new Error("run `bun run build` first");
	site = preview({ dir: dist, port: 0 });
	browser = await chromium.launch();
});
afterAll(async () => {
	await browser.close();
	site.stop();
});

/** Collect uncaught errors and console errors of a page. */
function watch(page: Page): string[] {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error" && !message.text().includes("404 (Not Found)"))
			errors.push(message.text());
	});
	return errors;
}

const marked = (page: Page) =>
	page.evaluate(() => (window as unknown as { marker?: number }).marker === 1);

describe("desktop", () => {
	test("search opens with /, filters, and follows a result without a reload", async () => {
		const page = await browser.newPage();
		const errors = watch(page);
		await page.goto(`${site.url}/`, { waitUntil: "networkidle" });
		await page.evaluate(() => {
			(window as unknown as { marker: number }).marker = 1;
		});
		await page.keyboard.press("/");
		await page.keyboard.type("build deploy");
		await page.waitForSelector("#search-results [role=option]");
		await expect(page.textContent("#search-results .hit-title")).resolves.toBe("Build and deploy");
		await page.keyboard.press("Enter");
		await page.waitForURL(/\/docs\/packages\/kit#build-and-deploy$/);
		expect(await page.$eval("dialog.search", (d) => (d as HTMLDialogElement).open)).toBe(false);
		expect(await marked(page)).toBe(true);
		// One Escape closes even with text typed, and `/` reopens afterwards.
		await page.keyboard.press("Control+k");
		await page.keyboard.type("zzqx");
		await expect(page.textContent(".search-note")).resolves.toBe("No matches for “zzqx”.");
		await page.keyboard.press("Escape");
		expect(await page.$eval("dialog.search", (d) => (d as HTMLDialogElement).open)).toBe(false);
		await page.keyboard.press("/");
		expect(await page.$eval("dialog.search", (d) => (d as HTMLDialogElement).open)).toBe(true);
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);

	test("sidebar, in-content links and the pager navigate on the client", async () => {
		const page = await browser.newPage();
		const errors = watch(page);
		await page.goto(`${site.url}/docs/packages/kit`, { waitUntil: "networkidle" });
		await page.evaluate(() => {
			(window as unknown as { marker: number }).marker = 1;
		});
		await page.click(".sidebar >> text=router");
		await page.waitForURL(/\/docs\/packages\/router$/);
		await expect(page.title()).resolves.toBe("@arachnejs/router · Arachne");
		await expect(
			page.getAttribute(".sidebar a[href='/docs/packages/router']", "aria-current"),
		).resolves.toBe("page");
		await page.click(".prose a[href^='/docs/adr/']");
		await page.waitForURL(/\/docs\/adr\//);
		// The folded "Decisions" section opens for the page inside it.
		expect(await page.$eval(".nav-section:last-child", (d) => (d as HTMLDetailsElement).open)).toBe(
			true,
		);
		await page.click(".pager-next");
		await page.waitForURL(/\/docs\/adr\/0010-server$/);
		expect(await marked(page)).toBe(true);
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);

	test("component pages mount live examples that work, and unmount them on navigation", async () => {
		const page = await browser.newPage();
		const errors = watch(page);
		await page.goto(`${site.url}/docs/ui/components/navigation`, { waitUntil: "networkidle" });
		const tabs = page.locator('.ui-preview[data-example="Tabs"]');
		await tabs.scrollIntoViewIfNeeded();
		await page.waitForSelector('.ui-preview[data-example="Tabs"].is-live');
		await tabs.locator("[role=tab]", { hasText: "Settings" }).click();
		await expect(tabs.locator("[role=tab][aria-selected=true]").textContent()).resolves.toBe(
			"Settings",
		);
		await page.goto(`${site.url}/docs/ui/components/actions`, { waitUntil: "networkidle" });
		const button = page.locator('.ui-preview[data-example="Button"]');
		await page.waitForSelector('.ui-preview[data-example="Button"].is-live');
		await button.locator("button").first().click();
		await expect(button.locator(".ui-preview-log").textContent()).resolves.toBe("onClick(click)");
		await page.click(".sidebar >> text=Getting started");
		await page.waitForURL(/\/docs$/);
		expect(await page.locator(".ui-preview").count()).toBe(0);
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);

	test("the sidebar keeps its scroll position and open sections across navigations", async () => {
		const page = await browser.newPage({ viewport: { width: 1440, height: 800 } });
		await page.goto(`${site.url}/docs/packages/kit`, { waitUntil: "networkidle" });
		await page.click(".sidebar summary >> text=UI components");
		await page.click(".sidebar summary >> text=Decisions");
		await page.$eval(".sidebar", (el) => {
			el.scrollTop = 600;
		});
		for (const [link, url] of [
			["Media", /media$/],
			["Overlays", /overlays$/],
		] as const) {
			await page.click(`.sidebar >> text=${link}`);
			await page.waitForURL(url);
			expect(await page.$eval(".sidebar", (el) => el.scrollTop)).toBe(600);
		}
		expect(
			await page.$$eval(".nav-section", (all) => all.every((d) => (d as HTMLDetailsElement).open)),
		).toBe(true);
		await page.close();
	}, 30_000);

	test("an unknown docs URL gets the 404 page, hydrated without errors", async () => {
		const page = await browser.newPage();
		const errors = watch(page);
		const response = await page.goto(`${site.url}/docs/no-such-page`, { waitUntil: "networkidle" });
		expect(response?.status()).toBe(404);
		await expect(page.textContent("h1")).resolves.toBe("No manual entry for /docs/no-such-page");
		expect(errors).toEqual([]);
		await page.close();
	}, 30_000);
});

test("every example on every component page mounts, without console errors", async () => {
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
	const errors = watch(page);
	const failed: string[] = [];
	const components = ENTRIES.filter((entry) => /^\/docs\/ui\/components\/./.test(entry.path));
	for (const entry of components) {
		await page.goto(`${site.url}${entry.path}`, { waitUntil: "networkidle" });
		// Examples mount as they near the viewport: scroll through the page.
		const height = await page.evaluate(() => document.body.scrollHeight);
		for (let y = 0; y < height + 900; y += 800) {
			await page.evaluate((top) => scrollTo(0, top), y);
			await page.waitForTimeout(30);
		}
		await page.waitForFunction(() =>
			[...document.querySelectorAll(".ui-preview-status")].every(
				(status) => !status.textContent?.startsWith("Loading"),
			),
		);
		const notLive = await page.$$eval(".ui-preview:not(.is-live)", (slots) =>
			slots.map((slot) => `${(slot as HTMLElement).dataset["example"]}: ${slot.textContent}`),
		);
		failed.push(...notLive.map((line) => `${entry.path} ${line}`));
	}
	expect(failed).toEqual([]);
	expect(errors).toEqual([]);
	await page.close();
}, 180_000);

test("component pages fit a 375px screen with every example mounted", async () => {
	// Previews don't clip their content (Safari would clip menus too), so
	// every example has to fit its frame on a phone.
	const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
	const wide: string[] = [];
	for (const entry of ENTRIES.filter((e) => /^\/docs\/ui\/components\/./.test(e.path))) {
		await page.goto(`${site.url}${entry.path}`, { waitUntil: "networkidle" });
		const height = await page.evaluate(() => document.body.scrollHeight);
		for (let y = 0; y < height + 800; y += 700) {
			await page.evaluate((top) => scrollTo(0, top), y);
			await page.waitForTimeout(20);
		}
		const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
		if (overflow > 0) wide.push(`${entry.path}: ${overflow}px`);
	}
	expect(wide).toEqual([]);
	await page.close();
}, 180_000);

test("mobile: the contents drawer opens, navigates and closes", async () => {
	const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
	const page = await context.newPage();
	const errors = watch(page);
	await page.goto(`${site.url}/docs/packages/kit`, { waitUntil: "networkidle" });
	const db = ".sidebar a[href='/docs/packages/db']";
	expect(await page.isVisible(db)).toBe(false);
	await page.click(".menu-toggle");
	await page.waitForSelector(db, { state: "visible" });
	// The drawer fits the viewport and scrolls its own list.
	const drawer = await page.$eval(".sidebar", (el) => ({
		height: el.clientHeight,
		content: el.scrollHeight,
		viewport: innerHeight,
	}));
	expect(drawer.height).toBeLessThanOrEqual(drawer.viewport);
	expect(drawer.content).toBeGreaterThan(drawer.height);
	await page.mouse.move(100, 400);
	await page.mouse.wheel(0, 400);
	await page.waitForFunction(() => (document.querySelector(".sidebar")?.scrollTop ?? 0) > 0);
	expect(await page.evaluate(() => scrollY)).toBe(0);
	await page.$eval(".sidebar", (el) => el.scrollTo(0, 0));
	await page.click(db);
	await page.waitForURL(/\/docs\/packages\/db$/);
	await page.waitForSelector(db, { state: "hidden" });
	for (const path of ["/", "/docs/packages/server", "/docs/ui/components/data"]) {
		await page.goto(`${site.url}${path}`, { waitUntil: "networkidle" });
		expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
	}
	expect(errors).toEqual([]);
	await context.close();
}, 30_000);

describe.each(["light", "dark"] as const)("axe (%s)", (colorScheme) => {
	test("key pages have no violations", async () => {
		const context = await browser.newContext({ colorScheme });
		const page = await context.newPage();
		const found: string[] = [];
		for (const path of [
			"/",
			"/docs",
			"/docs/packages/kit",
			"/docs/ui/components/data",
			"/docs/ui/components/layout",
			"/docs/nope",
		]) {
			await page.goto(`${site.url}${path}`, { waitUntil: "networkidle" });
			await page.addScriptTag({ content: axe });
			const result = await page.evaluate(() =>
				(
					window as unknown as { axe: { run: () => Promise<{ violations: { id: string }[] }> } }
				).axe.run(),
			);
			for (const violation of result.violations) found.push(`${path}: ${violation.id}`);
		}
		expect(found).toEqual([]);
		await context.close();
	}, 60_000);
});
