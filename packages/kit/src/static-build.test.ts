// Split from kit.test.ts: each test file runs in its own process, and fewer
// Bun.build calls per process avoid Bun's EISDIR flake on CI runners.
import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "./index.ts";

const root = join(import.meta.dir, "fixtures/notes");

describe("static build", () => {
	const outDir = join(root, "dist-test");
	afterAll(() => rmSync(outDir, { recursive: true, force: true }));

	test("prerenders every route, loader data, 404, sitemap and assets", async () => {
		const result = await build(root, { mode: "static", outDir });
		expect(result.pages.map((p) => p.url).sort()).toEqual(["/", "/about", "/notes/1", "/notes/2"]);
		const index = readFileSync(join(outDir, "index.html"), "utf8");
		expect(index).toContain("Welcome to Notes");
		expect(readFileSync(join(outDir, "notes/1/index.html"), "utf8")).toContain(
			"<h1>First &lt;note&gt;</h1>",
		);
		const data = JSON.parse(readFileSync(join(outDir, "_data/notes/2.json"), "utf8"));
		expect(data.data).toEqual({ id: "2", title: "Second note", body: "Another one." });
		expect(data.build).toMatch(/^[a-z0-9]+$/);
		expect(readFileSync(join(outDir, "notes/2/index.html"), "utf8")).toContain(
			`"build":"${data.build}"`,
		);
		const notFound = readFileSync(join(outDir, "404.html"), "utf8");
		expect(notFound).toContain("Nothing here");
		// Hosts serve 404.html at any URL, including ones a dynamic route matches.
		expect(notFound).toContain('"notFound":true');
		expect(index).not.toContain('"notFound"');
		expect(readFileSync(join(outDir, "robots.txt"), "utf8")).toContain("User-agent");
		const sitemap = readFileSync(join(outDir, "sitemap.xml"), "utf8");
		expect(sitemap).toContain("<loc>https://notes.test/notes/1</loc>");
		const assets = readdirSync(join(outDir, "assets"));
		expect(assets.some((f) => /^client-[a-z0-9]+\.js$/.test(f))).toBe(true);
		expect(assets.some((f) => /^styles-[a-z0-9]+\.css$/.test(f))).toBe(true);
		const js = assets.find((f) => f.startsWith("client-")) as string;
		expect(readFileSync(join(outDir, "assets", js), "utf8")).not.toContain("process.env");
	});

	test("hydrate: false ships zero JavaScript", async () => {
		const result = await build(root, { mode: "static", outDir, hydrate: false });
		expect(result.pages.length).toBe(4);
		expect(readFileSync(join(outDir, "about/index.html"), "utf8")).not.toContain(
			'<script type="module"',
		);
		expect(
			existsSync(join(outDir, "assets")) &&
				readdirSync(join(outDir, "assets")).some((f) => f.endsWith(".js")),
		).toBe(false);
	});

	test("base paths prefix links and assets", async () => {
		await build(root, { mode: "static", outDir, base: "/notes-app/" });
		const html = readFileSync(join(outDir, "about/index.html"), "utf8");
		expect(html).toContain('href="/notes-app/about"');
		expect(html).toMatch(/src="\/notes-app\/assets\/client-/);
	});
});
