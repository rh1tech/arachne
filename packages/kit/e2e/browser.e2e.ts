/**
 * Real-browser checks (Chromium via Playwright): hydration, client-side
 * navigation, titles, loader data and history, for static and server builds.
 * Run: bun run e2e (in packages/kit).
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { build, createAppServer, type DevServer, preview, startDevServer } from "../src/index.ts";

const root = join(import.meta.dir, "../src/fixtures/notes");
const outDir = join(root, "dist-e2e");
let browser: Browser;

beforeAll(async () => {
	browser = await chromium.launch();
});
afterAll(async () => {
	await browser.close();
	rmSync(outDir, { recursive: true, force: true });
});

async function journey(page: Page, origin: string) {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		// Dev builds warn about hydration mismatches; treat those as failures too.
		if (message.type() === "error" || message.text().includes("hydration mismatch"))
			errors.push(message.text());
	});
	await page.goto(`${origin}/`);
	await expect(page.title()).resolves.toBe("Home · Notes");
	// Hydrated: the server-rendered button reacts to clicks.
	await page.click("#inc");
	await page.click("#inc");
	await expect(page.textContent("#inc")).resolves.toBe("Clicked 2 times");
	await page.evaluate(() => {
		(window as unknown as { marker: number }).marker = 42;
	});
	// Client-side navigation: no reload (marker survives), title and aria-current update.
	await page.click("nav >> text=About");
	await page.waitForURL(`${origin}/about`);
	await expect(page.textContent("main h1")).resolves.toBe("About this app");
	await expect(page.title()).resolves.toBe("About · Notes");
	await expect(page.getAttribute("nav >> text=About", "aria-current")).resolves.toBe("page");
	await expect(
		page.evaluate(() => (window as unknown as { marker?: number }).marker),
	).resolves.toBe(42);
	// A route with loader data, fetched on navigation.
	await page.click("nav >> text=First note");
	await page.waitForURL(`${origin}/notes/1`);
	await expect(page.textContent("main h1")).resolves.toBe("First <note>");
	await expect(page.title()).resolves.toBe("First <note> · Notes");
	// History.
	await page.goBack();
	await page.waitForURL(`${origin}/about`);
	await expect(page.textContent("main h1")).resolves.toBe("About this app");
	await expect(
		page.evaluate(() => (window as unknown as { marker?: number }).marker),
	).resolves.toBe(42);
	// Direct load of a data route renders on the server/at build time and hydrates.
	await page.goto(`${origin}/notes/2`);
	await expect(page.textContent("main h1")).resolves.toBe("Second note");
	expect(errors).toEqual([]);
}

describe("static build in a browser", () => {
	let site: ReturnType<typeof preview>;
	beforeAll(async () => {
		await build(root, { mode: "static", outDir });
		site = preview({ dir: outDir, port: 0 });
	});
	afterAll(() => site.stop());

	test("hydrates, routes on the client and loads prerendered data", async () => {
		const page = await browser.newPage();
		await journey(page, site.url);
		const missing = await page.goto(`${site.url}/nope`);
		expect(missing?.status()).toBe(404);
		await expect(page.textContent("h1")).resolves.toBe("Nothing here");
		await page.close();
	}, 30_000);
});

describe("server mode in a browser", () => {
	let app: Awaited<ReturnType<typeof createAppServer>>;
	let url: string;
	beforeAll(async () => {
		app = await createAppServer({ root });
		url = app.listen(0).url;
	});
	afterAll(() => app.close());

	test("hydrates, routes on the client and loads data from the server", async () => {
		const page = await browser.newPage();
		await journey(page, url);
		await page.close();
	}, 30_000);
});

describe("dev server in a browser", () => {
	let dev: DevServer;
	beforeAll(async () => {
		dev = await startDevServer({ root, port: 0 });
	});
	afterAll(() => dev.stop());

	test("dev bundles hydrate without mismatch warnings", async () => {
		const page = await browser.newPage();
		await journey(page, dev.url.replace(/\/$/, ""));
		await page.close();
	}, 30_000);
});
