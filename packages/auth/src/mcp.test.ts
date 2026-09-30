import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

const tool = (name: string) => {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
};
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

test("routes lists endpoints with their guards", async () => {
	const out = parse(await tool("arachne_auth_routes").handler({}));
	expect(out).toContainEqual({
		method: "POST",
		path: "/auth/login",
		summary: "Sign in",
		guard: null,
	});
	expect(out).toContainEqual({
		method: "POST",
		path: "/auth/admin/users/:id/block",
		summary: "Block a user",
		guard: { permission: "users:block" },
	});
});

test("policy shows default groups and permissions", async () => {
	const out = parse(await tool("arachne_auth_policy").handler({}));
	expect(Object.keys(out.permissions)).toContain("users:block");
	expect(out.groups.admin.grants).toEqual(["*"]);
});

test("password_check applies the policy", async () => {
	expect(
		parse(
			await tool("arachne_auth_password_check").handler({ password: "short", email: "a@b.co" }),
		),
	).toEqual({
		ok: false,
		message: "Password must be at least 12 characters",
	});
	expect(
		parse(
			await tool("arachne_auth_password_check").handler({
				password: "a long enough passphrase",
				email: "a@b.co",
			}),
		),
	).toEqual({
		ok: true,
	});
});
