import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

const tool = (name: string) => {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
};
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

const groups = {
	user: { level: 10, grants: ["posts:create", "posts:update@owner"] },
	moderator: { level: 50, inherits: ["user"], grants: ["users:block"] },
};

test("check explains a decision, with assumed condition results", async () => {
	const owner = parse(
		await tool("arachne_acl_check").handler({
			groups,
			subject: { id: "ada", groups: ["user"] },
			permission: "posts:update",
			assume: { owner: true },
		}),
	);
	expect(owner).toEqual({ allowed: true, rule: "posts:update@owner", source: "group:user" });
	const notOwner = parse(
		await tool("arachne_acl_check").handler({
			groups,
			subject: { id: "ada", groups: ["user"] },
			permission: "posts:update",
			assume: { owner: false },
		}),
	);
	expect(notOwner.allowed).toBe(false);
});

test("permissions lists effective grants and levels", async () => {
	const out = parse(
		await tool("arachne_acl_permissions").handler({
			groups,
			subject: { id: "m", groups: ["moderator"] },
		}),
	);
	expect(out).toEqual({
		level: 50,
		always: ["posts:create", "users:block"],
		conditional: { "posts:update": ["owner"] },
	});
});
