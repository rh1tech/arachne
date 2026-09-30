import { expect, spyOn, test } from "bun:test";
import { join } from "node:path";
import { mcpModule } from "./mcp.ts";

const tool = (name: string) => {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
};
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");
const root = join(import.meta.dir, "fixtures/notes");

test("config reports the resolved configuration", async () => {
	const out = parse(await tool("arachne_kit_config").handler({ root }));
	expect(out).toMatchObject({
		mode: "server",
		base: "/",
		titleTemplate: "%s · Notes",
		hasRoutes: true,
		hasServer: true,
	});
});

test("routes lists pages (with loaders) and API routes", async () => {
	spyOn(console, "info").mockImplementation(() => {});
	const out = parse(await tool("arachne_kit_routes").handler({ root }));
	expect(out.pages).toContainEqual({
		pattern: "/notes/:id",
		id: "/notes/:id",
		dynamic: true,
		loader: true,
		prerender: true,
	});
	expect(out.api).toContainEqual({ method: "GET", path: "/api/notes", summary: null });
});

test("build and create refuse to run without confirm", async () => {
	const build = await tool("arachne_kit_build").handler({ root });
	expect(build.isError).toBe(true);
	expect(parse(build).error).toContain("confirm: true");
	const create = await tool("arachne_kit_create").handler({ dir: "/tmp/x", template: "static" });
	expect(create.isError).toBe(true);
});
