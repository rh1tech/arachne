import { describe, expect, test } from "bun:test";
import { rank } from "./search.ts";
import type { SearchRecord } from "./site.ts";

const index: SearchRecord[] = [
	{ title: "@arachnejs/router", section: "Pages", url: "/docs/packages/router" },
	{
		title: "Lazy routes",
		page: "@arachnejs/router",
		section: "Pages",
		url: "/docs/packages/router#lazy-routes",
	},
	{
		title: "Routes",
		page: "@arachnejs/server",
		section: "Server and data",
		url: "/docs/packages/server#routes",
	},
	{
		title: "@arachnejs/server",
		section: "Server and data",
		url: "/docs/packages/server",
		text: "HTTP server for Arachne: typed, schema-validated routes.",
	},
	{
		title: "Build and deploy",
		page: "@arachnejs/kit",
		section: "Pages",
		url: "/docs/packages/kit#build-and-deploy",
	},
];

const titles = (query: string) => rank(index, query).map((r) => r.title);

describe("rank", () => {
	test("returns nothing for an empty query", () => {
		expect(rank(index, "   ")).toEqual([]);
	});

	test("puts exact and prefix title matches before substring matches", () => {
		expect(titles("route")).toEqual([
			"Routes",
			"@arachnejs/router",
			"Lazy routes",
			"@arachnejs/server",
		]);
	});

	test("needs one word in the title or summary, and every word somewhere", () => {
		expect(titles("server routes")).toEqual(["Routes", "@arachnejs/server"]);
		expect(titles("deploy kit")).toEqual(["Build and deploy"]);
	});

	test("matches page summaries after every title match", () => {
		expect(titles("validated")).toEqual(["@arachnejs/server"]);
		expect(titles("routes")).toEqual(["Routes", "Lazy routes", "@arachnejs/server"]);
	});

	test("is case-insensitive and respects the limit", () => {
		expect(titles("ARACHNE")).toHaveLength(2);
		expect(rank(index, "arachne", 1)).toHaveLength(1);
	});
});
