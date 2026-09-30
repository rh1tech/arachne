import { describe, expect, test } from "bun:test";
import { createServer, openapi, route } from "@arachne/server";
import { setup, verifiedUser } from "./fixtures/setup.ts";

const PASSWORD = "correct horse battery";
const ORIGIN = "https://app.test";

async function app(overrides = {}) {
	const ctx = await setup(overrides);
	const server = createServer({
		middleware: [ctx.auth.middleware()],
		routes: [
			...ctx.auth.routes(),
			route({
				method: "GET",
				path: "/public",
				handler: (c) => ({ user: c.state.user?.email ?? null }),
			}),
			route({
				method: "GET",
				path: "/private",
				meta: { auth: true },
				handler: (c) => ({ id: c.state.user?.id }),
			}),
			route({
				method: "GET",
				path: "/verified",
				meta: { auth: "verified" },
				handler: () => ({ ok: true }),
			}),
			route({
				method: "POST",
				path: "/moderate",
				meta: { permission: "users:block" },
				handler: () => ({ ok: true }),
			}),
			route({
				method: "GET",
				path: "/staff",
				meta: { level: "moderator" },
				handler: () => ({ ok: true }),
			}),
		],
	});
	/** Browser-like request: same-origin fetch metadata and a cookie jar. */
	let cookie = "";
	const call = async (
		method: string,
		path: string,
		body?: unknown,
		headers: Record<string, string> = {},
	) => {
		const response = await server.fetch(
			new Request(`${ORIGIN}${path}`, {
				method,
				headers: {
					"sec-fetch-site": "same-origin",
					origin: ORIGIN,
					...(cookie ? { cookie } : {}),
					...(body === undefined ? {} : { "content-type": "application/json" }),
					...headers,
				},
				...(body === undefined ? {} : { body: JSON.stringify(body) }),
			}),
		);
		for (const set of response.headers.getSetCookie()) {
			const pair = set.split(";")[0] ?? "";
			cookie = set.includes("Max-Age=0") ? "" : pair;
		}
		const type = response.headers.get("content-type") ?? "";
		return {
			status: response.status,
			body: type.includes("json") ? await response.json() : await response.text(),
			response,
		};
	};
	return { ...ctx, server, call, cookie: () => cookie };
}

describe("auth routes", () => {
	test("register → verify → login (cookie) → me → logout", async () => {
		const t = await app();
		const reg = await t.call("POST", "/auth/register", {
			email: "ada@example.com",
			password: PASSWORD,
			name: "Ada",
		});
		expect(reg.status).toBe(202);
		expect(
			(await t.call("POST", "/auth/verify-email", { token: t.tokenFrom("ada@example.com") }))
				.status,
		).toBe(200);
		const login = await t.call("POST", "/auth/login", {
			email: "ada@example.com",
			password: PASSWORD,
		});
		expect(login.status).toBe(200);
		expect(login.body.user.email).toBe("ada@example.com");
		expect(login.response.headers.getSetCookie()[0]).toMatch(
			/^__Host-arachne_session=[^;]+; Max-Age=\d+; Path=\/; HttpOnly; Secure; SameSite=Lax$/,
		);
		expect((await t.call("GET", "/auth/me")).body.user.email).toBe("ada@example.com");
		expect((await t.call("GET", "/public")).body.user).toBe("ada@example.com");
		expect((await t.call("POST", "/auth/logout")).status).toBe(204);
		expect(t.cookie()).toBe("");
		expect((await t.call("GET", "/auth/me")).status).toBe(401);
	});

	test("login errors use the envelope; validation is 422", async () => {
		const t = await app();
		const bad = await t.call("POST", "/auth/login", {
			email: "ada@example.com",
			password: "nope nope nope",
		});
		expect(bad.status).toBe(401);
		expect(bad.body.error.code).toBe("invalid_credentials");
		const invalid = await t.call("POST", "/auth/login", { email: "not-an-email" });
		expect(invalid.status).toBe(422);
	});

	test("forgot/reset password over HTTP", async () => {
		const t = await app();
		await verifiedUser(t);
		expect(
			(await t.call("POST", "/auth/password/forgot", { email: "ada@example.com" })).status,
		).toBe(202);
		const reset = await t.call("POST", "/auth/password/reset", {
			token: t.tokenFrom("ada@example.com"),
			password: "a brand new passphrase",
		});
		expect(reset.status).toBe(204);
		expect(
			(
				await t.call("POST", "/auth/login", {
					email: "ada@example.com",
					password: "a brand new passphrase",
				})
			).status,
		).toBe(200);
	});

	test("sessions and API tokens are manageable by their owner", async () => {
		const t = await app();
		await verifiedUser(t);
		await t.call("POST", "/auth/login", { email: "ada@example.com", password: PASSWORD });
		const sessions = await t.call("GET", "/auth/sessions");
		expect(sessions.body.sessions).toHaveLength(1);
		expect(sessions.body.sessions[0].current).toBe(true);
		const created = await t.call("POST", "/auth/tokens", { name: "CLI", scopes: ["posts:read"] });
		expect(created.status).toBe(201);
		expect(created.body.token).toStartWith("ara_");
		const listed = await t.call("GET", "/auth/tokens");
		expect(listed.body.tokens[0]).not.toHaveProperty("token");
		expect((await t.call("DELETE", `/auth/tokens/${created.body.record.id}`)).status).toBe(204);
	});
});

describe("middleware", () => {
	test("route meta guards: auth, verified, permission and level", async () => {
		const t = await app();
		expect((await t.call("GET", "/private")).status).toBe(401);
		await t.auth.register({ email: "ada@example.com", password: PASSWORD });
		await t.call("POST", "/auth/login", { email: "ada@example.com", password: PASSWORD });
		expect((await t.call("GET", "/private")).status).toBe(200);
		const unverified = await t.call("GET", "/verified");
		expect(unverified.status).toBe(403);
		expect(unverified.body.error.code).toBe("email_not_verified");
		expect((await t.call("POST", "/moderate")).status).toBe(403);
		expect((await t.call("GET", "/staff")).status).toBe(403);
		const user = await t.auth.admin.findUserByEmail("ada@example.com");
		await t.auth.admin.setGroups(null, user?.id ?? "", ["moderator"]);
		expect((await t.call("POST", "/moderate")).status).toBe(200);
		expect((await t.call("GET", "/staff")).status).toBe(200);
	});

	test("CSRF: cross-site unsafe requests with a session cookie are refused", async () => {
		const t = await app();
		await verifiedUser(t);
		await t.call("POST", "/auth/login", { email: "ada@example.com", password: PASSWORD });
		const forged = await t.call("POST", "/auth/logout", undefined, {
			"sec-fetch-site": "cross-site",
			origin: "https://evil.test",
		});
		expect(forged.status).toBe(403);
		expect(forged.body.error.code).toBe("csrf_failed");
		const noMetadata = await t.server.fetch(
			new Request(`${ORIGIN}/auth/logout`, { method: "POST", headers: { cookie: t.cookie() } }),
		);
		expect(noMetadata.status).toBe(403);
		const me = await t.call("GET", "/auth/me");
		const withToken = await t.server.fetch(
			new Request(`${ORIGIN}/auth/logout`, {
				method: "POST",
				headers: { cookie: t.cookie(), "x-csrf-token": me.body.csrfToken },
			}),
		);
		expect(withToken.status).toBe(204);
	});

	test("CSRF: foreign origins can't post to login either (login CSRF)", async () => {
		const t = await app();
		await verifiedUser(t);
		const forged = await t.server.fetch(
			new Request(`${ORIGIN}/auth/login`, {
				method: "POST",
				headers: { origin: "https://evil.test", "content-type": "application/json" },
				body: JSON.stringify({ email: "ada@example.com", password: PASSWORD }),
			}),
		);
		expect(forged.status).toBe(403);
		const trusted = await app({ trustedOrigins: ["https://admin.app.test"] });
		await verifiedUser(trusted);
		const allowed = await trusted.server.fetch(
			new Request(`${ORIGIN}/auth/login`, {
				method: "POST",
				headers: { origin: "https://admin.app.test", "content-type": "application/json" },
				body: JSON.stringify({ email: "ada@example.com", password: PASSWORD }),
			}),
		);
		expect(allowed.status).toBe(200);
	});

	test("bearer API tokens authenticate without CSRF and respect scopes", async () => {
		const t = await app();
		const ada = await verifiedUser(t);
		await t.auth.admin.setGroups(null, ada.id, ["moderator"]);
		const { token } = await t.auth.apiTokens.create(ada.id, {
			name: "bot",
			scopes: ["users:block"],
		});
		const bearer = (path: string, method = "GET") =>
			t.server.fetch(
				new Request(`${ORIGIN}${path}`, { method, headers: { authorization: `Bearer ${token}` } }),
			);
		expect((await bearer("/moderate", "POST")).status).toBe(200);
		expect((await bearer("/private")).status).toBe(200);
		expect((await bearer("/staff")).status).toBe(200);
		const narrow = await t.auth.apiTokens.create(ada.id, { name: "read", scopes: ["posts:read"] });
		const denied = await t.server.fetch(
			new Request(`${ORIGIN}/moderate`, {
				method: "POST",
				headers: { authorization: `Bearer ${narrow.token}` },
			}),
		);
		expect(denied.status).toBe(403);
		const wrong = await t.server.fetch(
			new Request(`${ORIGIN}/private`, { headers: { authorization: "Bearer ara_nope" } }),
		);
		expect(wrong.status).toBe(401);
	});

	test("admin routes: block a user and list users", async () => {
		const t = await app();
		const root = await verifiedUser(t, "root@example.com");
		await t.auth.admin.setGroups(null, root.id, ["admin"]);
		const ada = await verifiedUser(t, "ada@example.com");
		await t.call("POST", "/auth/login", { email: "root@example.com", password: PASSWORD });
		const list = await t.call("GET", "/auth/admin/users?search=ada%40");
		expect(list.body.users.map((u: { email: string }) => u.email)).toEqual(["ada@example.com"]);
		const block = await t.call("POST", `/auth/admin/users/${ada.id}/block`, { reason: "spam" });
		expect(block.status).toBe(200);
		expect(block.body.user.status).toBe("blocked");
		const groups = await t.call("PUT", `/auth/admin/users/${ada.id}/groups`, {
			groups: ["moderator"],
		});
		expect(groups.body.user.groups).toEqual(["moderator"]);
	});

	test("admin routes require permissions", async () => {
		const t = await app();
		await verifiedUser(t);
		await t.call("POST", "/auth/login", { email: "ada@example.com", password: PASSWORD });
		expect((await t.call("GET", "/auth/admin/users")).status).toBe(403);
	});

	test("routes are documented in OpenAPI", async () => {
		const t = await app();
		const doc = openapi({ info: { title: "x", version: "1" }, routes: t.auth.routes() }) as {
			paths: Record<string, unknown>;
		};
		expect(Object.keys(doc.paths)).toContain("/auth/login");
		expect(Object.keys(doc.paths)).toContain("/auth/admin/users/{id}/block");
	});
});
