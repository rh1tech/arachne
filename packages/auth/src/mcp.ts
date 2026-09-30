import { createDb } from "@arachnejs/db";
import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { z } from "zod";
import { createAuth } from "./auth.ts";
import { AUTH_PERMISSIONS, createCore, DEFAULT_GROUPS } from "./core.ts";

/** A throwaway instance; route metadata and policy don't touch the database. */
function describeAuth() {
	const db = createDb({ dialect: { exec: () => {}, all: () => [] }, tables: {} });
	return createAuth({ db, baseUrl: "https://example.test" });
}

/** MCP tools for exploring `@arachnejs/auth`. */
export const mcpModule = defineMcpModule({
	name: "auth",
	version: "0.0.1",
	tools: [
		{
			name: toolName("auth", "routes"),
			description:
				"List the /auth HTTP endpoints with summaries and the guard each requires (auth, permission, level).",
			inputSchema: { prefix: z.string().default("/auth") },
			handler: (args) =>
				jsonResult(
					describeAuth()
						.routes({ prefix: String(args["prefix"] ?? "/auth") })
						.map((r) => {
							const { auth, permission, level } = r.meta;
							const guard = {
								...(auth ? { auth } : {}),
								...(permission ? { permission } : {}),
								...(level ? { level } : {}),
							};
							return {
								method: r.method,
								path: r.path,
								summary: r.summary ?? "",
								guard: Object.keys(guard).length ? guard : null,
							};
						}),
				),
		},
		{
			name: toolName("auth", "policy"),
			description: "Built-in auth permissions and the default groups seeded on first setup.",
			handler: () => jsonResult({ permissions: AUTH_PERMISSIONS, groups: DEFAULT_GROUPS }),
		},
		{
			name: toolName("auth", "password_check"),
			description:
				"Check a password against the default policy (length, not the email). Nothing is stored or logged.",
			inputSchema: {
				password: z.string(),
				email: z.string(),
				minLength: z.number().int().optional(),
			},
			handler: async (args) => {
				const db = createDb({ dialect: { exec: () => {}, all: () => [] }, tables: {} });
				const minLength = args["minLength"] as number | undefined;
				const core = createCore({
					db,
					baseUrl: "https://example.test",
					...(minLength ? { password: { minLength } } : {}),
				});
				try {
					await core.checkPassword(String(args["password"]), String(args["email"]));
					return jsonResult({ ok: true });
				} catch (error) {
					return jsonResult({ ok: false, message: (error as Error).message });
				}
			},
		},
		{
			name: toolName("auth", "api_summary"),
			description: "Summarize @arachnejs/auth.",
			handler: () =>
				textResult(
					[
						"createAuth({ db, mailer, baseUrl, secret, acl, session, lockout, password, registration, requireEmailVerification })",
						"await auth.setup() — creates tables, seeds groups (guest, user, moderator, admin)",
						"createServer({ middleware: [auth.middleware()], routes: [...auth.routes(), ...app] })",
						"route meta: { auth: true | 'verified', permission: 'posts:update', level: 'moderator' }",
						"handlers: auth.user(ctx) · auth.authorize(ctx, 'posts:update', post) · ctx.state.user / session / subject",
						"flows: register · verifyEmail · login (→ mfa_required) · verifyMfa · logout · requestPasswordReset · resetPassword · changePassword · requestEmailChange · confirmEmailChange",
						"auth.sessions / apiTokens (Bearer ara_…, scopes) / mfa (TOTP + recovery codes) / admin (block, groups, grants, events)",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-auth-readme",
			uri: "arachne://auth/readme",
			mimeType: "text/markdown",
			read: async () => ({ text: await Bun.file(new URL("../README.md", import.meta.url)).text() }),
		},
	],
});

export default mcpModule;
