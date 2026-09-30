import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

test("resolve reports the matched chain, params and head", async () => {
	const tool = mcpModule.tools?.find((t) => t.name === "arachne_router_resolve");
	const result = await tool?.handler({
		routes: [
			{
				path: "/",
				layout: true,
				title: "Site",
				children: [{ path: "blog/:slug", title: "Post" }, { path: "" }],
			},
		],
		path: "/blog/hello",
		titleTemplate: "%s · Docs",
	});
	const out = JSON.parse(result?.content[0]?.type === "text" ? result.content[0].text : "null");
	expect(out).toEqual({
		pattern: "/blog/:slug",
		chain: ["/", "blog/:slug"],
		params: { slug: "hello" },
		title: "Post · Docs",
	});
});
