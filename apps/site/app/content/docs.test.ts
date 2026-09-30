import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ENTRIES } from "../nav.ts";
import { loadDoc, loadHome, REPO_ROOT, searchIndex } from "./docs.ts";

describe("documentation sources", () => {
	test("every sidebar entry has a Markdown source in the repository", () => {
		const missing = ENTRIES.filter((entry) => !existsSync(join(REPO_ROOT, entry.source)));
		expect(missing.map((entry) => entry.source)).toEqual([]);
	});

	test("paths are unique", () => {
		const paths = ENTRIES.map((entry) => entry.path);
		expect(new Set(paths).size).toBe(paths.length);
	});
});

describe("loadDoc", () => {
	test("renders a page with its title, outline, source and neighbours", async () => {
		const doc = await loadDoc("/docs/packages/kit/");
		expect(doc?.title).toBe("@arachnejs/kit");
		expect(doc?.source).toBe("packages/kit/README.md");
		expect(doc?.section).toBe("Pages");
		expect(doc?.headings.map((h) => h.id)).toContain("build-and-deploy");
		expect(doc?.prev).toEqual({ title: "Progress log", path: "/docs/progress" });
		expect(doc?.next).toEqual({ title: "router", path: "/docs/packages/router" });
		expect(doc?.html).toContain('<a href="/docs/adr/0015-universal-framework">ADR 0015</a>');
		expect(doc?.html).toContain("--hl-");
	});

	test("component pages get live preview slots; other pages don't", async () => {
		const actions = await loadDoc("/docs/ui/components/actions");
		expect(actions?.previews).toBe(true);
		expect(actions?.html).toContain('<div class="ui-preview" data-example="Button"');
		expect((await loadDoc("/docs/packages/kit"))?.previews).toBe(false);
		expect((await loadDoc("/docs/ui/components"))?.previews).toBe(false);
	});

	test("links repository files to GitHub on the default branch, in a new tab", async () => {
		const doc = await loadDoc("/docs/packages/kit");
		expect(doc?.html).toContain(
			'href="https://github.com/rh1tech/arachne/blob/master/packages/kit/templates/static" target="_blank"',
		);
		expect(doc?.html).not.toContain("/blob/main/");
	});

	test("returns undefined for unknown paths", async () => {
		expect(await loadDoc("/docs/nope")).toBeUndefined();
	});

	test("links between pages always resolve to a page that exists", async () => {
		const known = new Set(ENTRIES.map((entry) => entry.path));
		const broken: string[] = [];
		for (const entry of ENTRIES) {
			const doc = await loadDoc(entry.path);
			for (const [, href] of doc?.html.matchAll(/<a href="(\/[^"#]*)[^"]*"/g) ?? []) {
				if (!known.has(href ?? "") && href !== "/") broken.push(`${entry.source} → ${href}`);
			}
		}
		expect(broken).toEqual([]);
	});
});

describe("loadHome", () => {
	test("lists every package once with its description", async () => {
		const home = await loadHome();
		const names = home.groups.flatMap((group) => group.packages.map((p) => p.name));
		expect(names).toContain("kit");
		expect(new Set(names).size).toBe(names.length);
		expect(home.version).toMatch(/^\d+\.\d+\.\d+/);
		expect(home.groups[0]?.packages[0]?.description).not.toBe("");
	});
});

describe("searchIndex", () => {
	test("has a record per page and per h2/h3", async () => {
		const index = await searchIndex();
		const kit = index.find((record) => record.url === "/docs/packages/kit");
		expect(kit).toMatchObject({ title: "@arachnejs/kit", section: "Pages" });
		expect(kit?.text).toStartWith("Build static sites");
		expect(index).toContainEqual({
			title: "Build and deploy",
			page: "@arachnejs/kit",
			section: "Pages",
			url: "/docs/packages/kit#build-and-deploy",
		});
	});
});
