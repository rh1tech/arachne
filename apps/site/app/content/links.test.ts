import { describe, expect, test } from "bun:test";
import { resolveLink } from "./links.ts";

const pages = new Map([
	["packages/kit/README.md", "/docs/packages/kit"],
	["packages/db/README.md", "/docs/packages/db"],
	["docs/adr/0015-universal-framework.md", "/docs/adr/0015-universal-framework"],
	["docs/framework/README.md", "/docs/guide"],
]);

describe("resolveLink", () => {
	test("maps a relative Markdown link to its page, keeping the anchor", () => {
		expect(
			resolveLink("../../packages/kit/README.md#pages", "docs/framework/README.md", pages),
		).toEqual({
			href: "/docs/packages/kit#pages",
		});
		expect(
			resolveLink("../adr/0015-universal-framework.md", "docs/framework/README.md", pages),
		).toEqual({
			href: "/docs/adr/0015-universal-framework",
		});
	});

	test("maps a directory link to the directory's README page", () => {
		expect(resolveLink("../db", "packages/kit/README.md", pages)).toEqual({
			href: "/docs/packages/db",
		});
		expect(resolveLink("packages/kit/", "README.md", pages)).toEqual({
			href: "/docs/packages/kit",
		});
	});

	test("keeps same-page anchors and external URLs", () => {
		expect(resolveLink("#build-and-deploy", "packages/kit/README.md", pages)).toEqual({
			href: "#build-and-deploy",
		});
		expect(resolveLink("https://github.com/stackblitz/alien-signals", "x.md", pages)).toEqual({
			href: "https://github.com/stackblitz/alien-signals",
			external: true,
		});
	});

	test("points files without a page at the source repository when one is configured", () => {
		expect(
			resolveLink(
				"templates/static",
				"packages/kit/README.md",
				pages,
				"https://git.example/arachne",
			),
		).toEqual({
			href: "https://git.example/arachne/blob/main/packages/kit/templates/static",
			external: true,
		});
	});

	test("links into the given branch", () => {
		expect(
			resolveLink(
				"templates/api",
				"packages/kit/README.md",
				pages,
				"https://github.com/o/r",
				"master",
			),
		).toEqual({
			href: "https://github.com/o/r/blob/master/packages/kit/templates/api",
			external: true,
		});
	});

	test("returns null for files without a page and no source repository", () => {
		expect(resolveLink("templates/static", "packages/kit/README.md", pages)).toBeNull();
		expect(resolveLink("../../../outside.md", "docs/adr/x.md", pages)).toBeNull();
	});
});
