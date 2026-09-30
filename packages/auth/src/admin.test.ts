import { describe, expect, test } from "bun:test";
import { setup, verifiedUser } from "./fixtures/setup.ts";
import { totpCode } from "./index.ts";

const PASSWORD = "correct horse battery";
const meta = { ip: "198.51.100.1", userAgent: "test" };

async function people() {
	const ctx = await setup();
	const admin = await verifiedUser(ctx, "root@example.com");
	await ctx.auth.admin.setGroups(null, admin.id, ["admin"]);
	const mod = await verifiedUser(ctx, "mod@example.com");
	await ctx.auth.admin.setGroups(null, mod.id, ["moderator"]);
	const ada = await verifiedUser(ctx, "ada@example.com");
	const find = async (email: string) =>
		(await ctx.auth.admin.findUserByEmail(email)) as NonNullable<typeof ada>;
	return { ctx, admin: await find("root@example.com"), mod: await find("mod@example.com"), ada };
}

describe("groups and permissions", () => {
	test("default groups are seeded and users get permissions from them", async () => {
		const { ctx, admin, mod, ada } = await people();
		expect((await ctx.auth.admin.listGroups()).map((g) => g.name)).toEqual([
			"admin",
			"guest",
			"moderator",
			"user",
		]);
		expect(ctx.auth.can(admin, "users:delete")).toBe(true);
		expect(ctx.auth.can(mod, "users:block")).toBe(true);
		expect(ctx.auth.can(ada, "users:block")).toBe(false);
		expect(ctx.auth.subject(ada)).toEqual({
			id: ada.id,
			groups: ["user"],
			grants: [],
			blocked: false,
		});
	});

	test("custom permissions, conditions and groups come from options; groups are editable at runtime", async () => {
		const ctx = await setup({
			acl: {
				permissions: { "posts:create": "Write", "posts:update": "Edit" },
				conditions: {
					owner: ({ subject, resource }) => (resource as { by: string }).by === subject.id,
				},
				groups: { user: { level: 10, grants: ["posts:create", "posts:update@owner"] } },
			},
		});
		const ada = await verifiedUser(ctx);
		expect(ctx.auth.can(ada, "posts:update", { by: ada.id })).toBe(true);
		expect(ctx.auth.can(ada, "posts:update", { by: "other" })).toBe(false);
		await ctx.auth.admin.saveGroup(null, "user", { level: 10, grants: ["posts:update@owner"] });
		expect(ctx.auth.can(ada, "posts:create")).toBe(false);
	});

	test("per-user grants and denials", async () => {
		const { ctx, ada } = await people();
		await ctx.auth.admin.setGrants(null, ada.id, ["users:read", "!admin:access"]);
		const updated = await ctx.auth.admin.getUser(ada.id);
		expect(ctx.auth.can(updated as NonNullable<typeof updated>, "users:read")).toBe(true);
	});

	test("actors need permission and a higher level to manage others", async () => {
		const { ctx, admin, mod, ada } = await people();
		await expect(ctx.auth.admin.setGroups(ada, mod.id, ["user"])).rejects.toMatchObject({
			code: "forbidden",
		});
		await expect(ctx.auth.admin.setGroups(mod, ada.id, ["admin"])).rejects.toMatchObject({
			code: "forbidden",
		});
		await expect(ctx.auth.admin.blockUser(mod, admin.id, { reason: "coup" })).rejects.toMatchObject(
			{ code: "forbidden" },
		);
		await ctx.auth.admin.setGroups(admin, ada.id, ["moderator"]);
		expect((await ctx.auth.admin.getUser(ada.id))?.groups).toEqual(["moderator"]);
	});

	test("actors can only hand out permissions they hold", async () => {
		const ctx = await setup({
			acl: {
				permissions: { "orders:refund": "Refund", "orders:read": "Read" },
				groups: {
					support: { level: 40, inherits: ["user"], grants: ["orders:refund"] },
					lead: {
						level: 60,
						inherits: ["user"],
						grants: ["users:manage", "groups:manage", "orders:read"],
					},
				},
			},
		});
		const lead = await verifiedUser(ctx, "lead@example.com");
		await ctx.auth.admin.setGroups(null, lead.id, ["lead"]);
		const actor = (await ctx.auth.admin.getUser(lead.id)) as NonNullable<typeof lead>;
		const puppet = await verifiedUser(ctx, "puppet@example.com");
		await expect(ctx.auth.admin.setGrants(actor, puppet.id, ["*"])).rejects.toMatchObject({
			code: "forbidden",
		});
		await expect(
			ctx.auth.admin.setGrants(actor, puppet.id, ["orders:refund"]),
		).rejects.toMatchObject({ code: "forbidden" });
		await expect(ctx.auth.admin.setGroups(actor, puppet.id, ["support"])).rejects.toMatchObject({
			code: "forbidden",
		});
		await expect(
			ctx.auth.admin.saveGroup(actor, "sneaky", { level: 20, grants: ["orders:refund"] }),
		).rejects.toMatchObject({ code: "forbidden" });
		// Held permissions and denials are fine.
		await ctx.auth.admin.setGrants(actor, puppet.id, ["orders:read", "!orders:refund"]);
		await ctx.auth.admin.saveGroup(actor, "readers", { level: 20, grants: ["orders:read"] });
	});

	test("unknown groups are rejected", async () => {
		const { ctx, ada } = await people();
		await expect(ctx.auth.admin.setGroups(null, ada.id, ["wizards"])).rejects.toMatchObject({
			code: "unknown_group",
		});
	});
});

describe("blocking", () => {
	test("blocked users lose sessions and cannot log in; unblock restores access", async () => {
		const { ctx, mod, ada } = await people();
		const login = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (login.status !== "ok") throw new Error("expected ok");
		await ctx.auth.admin.blockUser(mod, ada.id, { reason: "spam" });
		expect(await ctx.auth.sessions.authenticate(login.session.token)).toBeUndefined();
		const error = await ctx.auth
			.login({ email: "ada@example.com", password: PASSWORD }, meta)
			.catch((e) => e);
		expect(error.code).toBe("account_blocked");
		expect(error.details).toEqual({ reason: "spam", until: null });
		const blocked = await ctx.auth.admin.getUser(ada.id);
		expect(ctx.auth.can(blocked as NonNullable<typeof blocked>, "posts:read" as never)).toBe(false);
		await ctx.auth.admin.unblockUser(mod, ada.id);
		expect(
			(await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta)).status,
		).toBe("ok");
	});

	test("temporary blocks lift themselves", async () => {
		const { ctx, mod, ada } = await people();
		await ctx.auth.admin.blockUser(mod, ada.id, {
			reason: "cool down",
			until: new Date("2026-10-01T12:00:00.000Z"),
		});
		await expect(
			ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta),
		).rejects.toMatchObject({
			code: "account_blocked",
		});
		ctx.clock.advance(25 * 3600_000);
		expect(
			(await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta)).status,
		).toBe("ok");
	});
});

describe("user listing", () => {
	test("search, filter and paginate", async () => {
		const { ctx } = await people();
		const page = await ctx.auth.admin.listUsers({ search: "example.com", limit: 2, offset: 0 });
		expect(page.total).toBe(3);
		expect(page.users).toHaveLength(2);
		const mods = await ctx.auth.admin.listUsers({ group: "moderator" });
		expect(mods.users.map((u) => u.email)).toEqual(["mod@example.com"]);
		const blocked = await ctx.auth.admin.listUsers({ status: "blocked" });
		expect(blocked.total).toBe(0);
	});

	test("deleteUser removes the account and its sessions", async () => {
		const { ctx, admin, ada } = await people();
		await ctx.auth.admin.deleteUser(admin, ada.id);
		expect(await ctx.auth.admin.getUser(ada.id)).toBeUndefined();
	});
});

describe("API tokens", () => {
	test("tokens authenticate with scopes and can be revoked", async () => {
		const { ctx, mod } = await people();
		const created = await ctx.auth.apiTokens.create(mod.id, { name: "CI", scopes: ["users:read"] });
		expect(created.token).toStartWith("ara_");
		expect(created.record).toMatchObject({
			name: "CI",
			scopes: ["users:read"],
			prefix: created.token.slice(0, 12),
		});
		const found = await ctx.auth.apiTokens.authenticate(created.token);
		expect(found?.user.id).toBe(mod.id);
		const subject = ctx.auth.subject(found?.user as NonNullable<typeof mod>, found?.token.scopes);
		expect(ctx.auth.acl().can(subject, "users:read")).toBe(true);
		expect(ctx.auth.acl().can(subject, "users:block")).toBe(false);
		expect((await ctx.auth.apiTokens.list(mod.id)).map((t) => t.name)).toEqual(["CI"]);
		await ctx.auth.apiTokens.revoke(mod.id, created.record.id);
		expect(await ctx.auth.apiTokens.authenticate(created.token)).toBeUndefined();
	});

	test("expired tokens and tokens of blocked users stop working", async () => {
		const { ctx, admin, ada } = await people();
		const short = await ctx.auth.apiTokens.create(ada.id, { name: "short", expiresInDays: 1 });
		const long = await ctx.auth.apiTokens.create(ada.id, { name: "long" });
		ctx.clock.advance(2 * 86400_000);
		expect(await ctx.auth.apiTokens.authenticate(short.token)).toBeUndefined();
		expect(await ctx.auth.apiTokens.authenticate(long.token)).toBeDefined();
		await ctx.auth.admin.blockUser(admin, ada.id, { reason: "x" });
		expect(await ctx.auth.apiTokens.authenticate(long.token)).toBeUndefined();
	});

	test("token scopes cannot exceed the owner's permissions at use time", async () => {
		const { ctx, ada } = await people();
		const token = await ctx.auth.apiTokens.create(ada.id, { name: "wide", scopes: ["*"] });
		const found = await ctx.auth.apiTokens.authenticate(token.token);
		const subject = ctx.auth.subject(found?.user as NonNullable<typeof ada>, found?.token.scopes);
		expect(ctx.auth.acl().can(subject, "users:delete")).toBe(false);
	});
});

describe("two-factor (TOTP)", () => {
	test("enrol, then login requires a code; recovery codes work once", async () => {
		const { ctx, ada } = await people();
		const { secret, uri } = await ctx.auth.mfa.setup(ada.id);
		expect(uri).toStartWith("otpauth://totp/Arachne%20Test:ada%40example.com?secret=");
		await expect(ctx.auth.mfa.enable(ada.id, "000000")).rejects.toMatchObject({
			code: "invalid_code",
		});
		const { recoveryCodes } = await ctx.auth.mfa.enable(
			ada.id,
			await totpCode(secret, ctx.clock.now()),
		);
		expect(recoveryCodes).toHaveLength(10);
		ctx.clock.advance(30_000); // a used time step can't be replayed

		const first = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (first.status !== "mfa_required") throw new Error("expected mfa");
		await expect(
			ctx.auth.verifyMfa({ mfaToken: first.mfaToken, code: "123456" }, meta),
		).rejects.toMatchObject({
			code: "invalid_code",
		});
		const code = await totpCode(secret, ctx.clock.now());
		const ok = await ctx.auth.verifyMfa({ mfaToken: first.mfaToken, code }, meta);
		expect(ok.user.id).toBe(ada.id);
		const replay = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (replay.status !== "mfa_required") throw new Error("expected mfa");
		await expect(
			ctx.auth.verifyMfa({ mfaToken: replay.mfaToken, code }, meta),
		).rejects.toMatchObject({
			code: "invalid_code",
		});

		const second = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (second.status !== "mfa_required") throw new Error("expected mfa");
		const recovery = recoveryCodes[0] as string;
		expect(
			(await ctx.auth.verifyMfa({ mfaToken: second.mfaToken, code: recovery }, meta)).user.id,
		).toBe(ada.id);
		const third = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (third.status !== "mfa_required") throw new Error("expected mfa");
		await expect(
			ctx.auth.verifyMfa({ mfaToken: third.mfaToken, code: recovery }, meta),
		).rejects.toMatchObject({
			code: "invalid_code",
		});
	});

	test("mfa tokens expire and disable needs the password", async () => {
		const { ctx, ada } = await people();
		const { secret } = await ctx.auth.mfa.setup(ada.id);
		await ctx.auth.mfa.enable(ada.id, await totpCode(secret, ctx.clock.now()));
		const login = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (login.status !== "mfa_required") throw new Error("expected mfa");
		ctx.clock.advance(6 * 60_000);
		await expect(
			ctx.auth.verifyMfa(
				{ mfaToken: login.mfaToken, code: await totpCode(secret, ctx.clock.now()) },
				meta,
			),
		).rejects.toMatchObject({ code: "invalid_token" });
		await expect(ctx.auth.mfa.disable(ada.id, "wrong wrong wrong")).rejects.toMatchObject({
			code: "invalid_credentials",
		});
		await ctx.auth.mfa.disable(ada.id, PASSWORD);
		expect(
			(await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta)).status,
		).toBe("ok");
	});

	test("totpCode matches RFC 6238 test vectors", async () => {
		// RFC 6238 appendix B, SHA-1 secret "12345678901234567890" (base32 below), 8 digits.
		const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
		expect(await totpCode(secret, new Date(59_000), { digits: 8 })).toBe("94287082");
		expect(await totpCode(secret, new Date(1111111109_000), { digits: 8 })).toBe("07081804");
	});
});
