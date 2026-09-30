import { describe, expect, test } from "bun:test";
import { createSlugger, slugify } from "./slug.ts";

describe("slugify", () => {
	test("matches GitHub's anchors for plain headings", () => {
		expect(slugify("OpenAPI and the typed client")).toBe("openapi-and-the-typed-client");
		expect(slugify("Build and deploy")).toBe("build-and-deploy");
	});

	test("drops punctuation but keeps one hyphen per space, like GitHub", () => {
		expect(slugify("M11 — @arachnejs/kit (2026-09-30)")).toBe("m11--arachnejskit-2026-09-30");
		expect(slugify("What's new?")).toBe("whats-new");
		expect(slugify("snake_case stays")).toBe("snake_case-stays");
	});
});

describe("createSlugger", () => {
	test("suffixes repeated headings with -1, -2", () => {
		const slug = createSlugger();
		expect([slug("Pages"), slug("Pages"), slug("Pages")]).toEqual(["pages", "pages-1", "pages-2"]);
	});
});
