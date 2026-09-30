import { describe, expect, test } from "bun:test";
import { setup, verifiedUser } from "./fixtures/setup.ts";
import { AuthError } from "./index.ts";

const PASSWORD = "correct horse battery";
const meta = { ip: "203.0.113.7", userAgent: "test" };

describe("registration and verification", () => {
	test("register creates an unverified user in the default groups and emails a link", async () => {
		const ctx = await setup();
		const { user } = await ctx.auth.register({
			email: " Ada@Example.com ",
			password: PASSWORD,
			name: "Ada",
		});
		expect(user).toMatchObject({
			email: "ada@example.com",
			name: "Ada",
			emailVerified: false,
			status: "active",
			groups: ["user"],
		});
		expect(user).not.toHaveProperty("passwordHash");
		const mail = ctx.inbox.last("ada@example.com");
		expect(mail?.subject).toBe("Confirm your email for Arachne Test");
		expect(ctx.inbox.links("ada@example.com")[0]).toStartWith(
			"https://app.test/auth/verify-email?token=",
		);
	});

	test("verifyEmail marks the address verified once", async () => {
		const ctx = await setup();
		await ctx.auth.register({ email: "ada@example.com", password: PASSWORD });
		const token = ctx.tokenFrom("ada@example.com");
		const user = await ctx.auth.verifyEmail(token);
		expect(user.emailVerified).toBe(true);
		await expect(ctx.auth.verifyEmail(token)).rejects.toMatchObject({ code: "invalid_token" });
	});

	test("verification links expire", async () => {
		const ctx = await setup();
		await ctx.auth.register({ email: "ada@example.com", password: PASSWORD });
		ctx.clock.advance(25 * 3600_000);
		await expect(ctx.auth.verifyEmail(ctx.tokenFrom("ada@example.com"))).rejects.toMatchObject({
			code: "invalid_token",
		});
	});

	test("duplicate emails don't reveal accounts: same result, a notice to the owner", async () => {
		const ctx = await setup();
		await verifiedUser(ctx);
		ctx.inbox.clear();
		const again = await ctx.auth.register({
			email: "ada@example.com",
			password: "another password!",
		});
		expect(again.user).toBeUndefined();
		expect(ctx.inbox.last("ada@example.com")?.subject).toBe(
			"Someone tried to sign up with your email",
		);
		expect(await ctx.auth.admin.countUsers()).toBe(1);
	});

	test("weak or invalid input is rejected with field errors", async () => {
		const ctx = await setup();
		await expect(ctx.auth.register({ email: "nope", password: PASSWORD })).rejects.toMatchObject({
			code: "invalid_email",
		});
		await expect(ctx.auth.register({ email: "a@b.co", password: "short" })).rejects.toMatchObject({
			code: "weak_password",
		});
		const custom = await setup({
			password: {
				minLength: 10,
				check: (p) => (p.includes("password") ? "too common" : undefined),
			},
		});
		await expect(
			custom.auth.register({ email: "a@b.co", password: "mypassword123" }),
		).rejects.toThrow("too common");
	});

	test("closed registration refuses sign-ups", async () => {
		const ctx = await setup({ registration: "closed" });
		await expect(ctx.auth.register({ email: "a@b.co", password: PASSWORD })).rejects.toMatchObject({
			code: "registration_closed",
		});
	});
});

describe("login and sessions", () => {
	test("login returns a session token that authenticates", async () => {
		const ctx = await setup();
		await verifiedUser(ctx);
		const result = await ctx.auth.login({ email: "ADA@example.com", password: PASSWORD }, meta);
		if (result.status !== "ok") throw new Error("expected ok");
		expect(result.session.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
		const found = await ctx.auth.sessions.authenticate(result.session.token);
		expect(found?.user.email).toBe("ada@example.com");
		expect(found?.session.ip).toBe("203.0.113.7");
		const list = await ctx.auth.sessions.list(found?.user.id ?? "");
		expect(list).toHaveLength(1);
		expect(list[0]).not.toHaveProperty("token");
	});

	test("wrong credentials give one generic error", async () => {
		const ctx = await setup();
		await verifiedUser(ctx);
		const wrongPassword = await ctx.auth
			.login({ email: "ada@example.com", password: "nope nope nope" }, meta)
			.catch((e) => e);
		const unknownUser = await ctx.auth
			.login({ email: "who@example.com", password: "nope nope nope" }, meta)
			.catch((e) => e);
		expect(wrongPassword).toBeInstanceOf(AuthError);
		expect(wrongPassword.message).toBe(unknownUser.message);
		expect(wrongPassword.code).toBe("invalid_credentials");
	});

	test("repeated failures lock the account temporarily", async () => {
		const ctx = await setup({ lockout: { maxAttempts: 3, minutes: 15 } });
		await verifiedUser(ctx);
		for (let i = 0; i < 3; i += 1) {
			await ctx.auth
				.login({ email: "ada@example.com", password: "wrong wrong wrong" }, meta)
				.catch(() => {});
		}
		await expect(
			ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta),
		).rejects.toMatchObject({
			code: "account_locked",
		});
		ctx.clock.advance(16 * 60_000);
		expect(
			(await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta)).status,
		).toBe("ok");
	});

	test("sessions expire, slide on use, and can be revoked", async () => {
		const ctx = await setup({ session: { ttlDays: 1 } });
		await verifiedUser(ctx);
		const result = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (result.status !== "ok") throw new Error("expected ok");
		ctx.clock.advance(20 * 3600_000);
		expect(await ctx.auth.sessions.authenticate(result.session.token)).toBeDefined(); // slides expiry
		ctx.clock.advance(20 * 3600_000);
		const found = await ctx.auth.sessions.authenticate(result.session.token);
		expect(found).toBeDefined();
		await ctx.auth.logout(result.session.token);
		expect(await ctx.auth.sessions.authenticate(result.session.token)).toBeUndefined();
		const second = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (second.status !== "ok") throw new Error("expected ok");
		ctx.clock.advance(25 * 3600_000);
		expect(await ctx.auth.sessions.authenticate(second.session.token)).toBeUndefined();
	});

	test("requireEmailVerification blocks unverified logins", async () => {
		const ctx = await setup({ requireEmailVerification: true });
		await ctx.auth.register({ email: "ada@example.com", password: PASSWORD });
		await expect(
			ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta),
		).rejects.toMatchObject({
			code: "email_not_verified",
		});
	});
});

describe("password reset and change", () => {
	test("reset by email link sets a new password and revokes sessions", async () => {
		const ctx = await setup();
		await verifiedUser(ctx);
		const before = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (before.status !== "ok") throw new Error("expected ok");
		await ctx.auth.requestPasswordReset("ada@example.com");
		expect(ctx.inbox.last("ada@example.com")?.subject).toBe("Reset your Arachne Test password");
		await ctx.auth.resetPassword(ctx.tokenFrom("ada@example.com"), "a brand new passphrase");
		expect(await ctx.auth.sessions.authenticate(before.session.token)).toBeUndefined();
		await expect(
			ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta),
		).rejects.toThrow();
		expect(
			(await ctx.auth.login({ email: "ada@example.com", password: "a brand new passphrase" }, meta))
				.status,
		).toBe("ok");
	});

	test("reset requests for unknown emails succeed silently", async () => {
		const ctx = await setup();
		await ctx.auth.requestPasswordReset("nobody@example.com");
		expect(ctx.inbox.sent).toHaveLength(0);
	});

	test("reset tokens are single use and short lived", async () => {
		const ctx = await setup();
		await verifiedUser(ctx);
		await ctx.auth.requestPasswordReset("ada@example.com");
		const token = ctx.tokenFrom("ada@example.com");
		ctx.clock.advance(61 * 60_000);
		await expect(ctx.auth.resetPassword(token, "a brand new passphrase")).rejects.toMatchObject({
			code: "invalid_token",
		});
	});

	test("changePassword needs the current password and keeps the current session", async () => {
		const ctx = await setup();
		const user = await verifiedUser(ctx);
		const a = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		const b = await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		if (a.status !== "ok" || b.status !== "ok") throw new Error("expected ok");
		await expect(
			ctx.auth.changePassword(user.id, "wrong wrong wrong", "another good passphrase"),
		).rejects.toMatchObject({
			code: "invalid_credentials",
		});
		await ctx.auth.changePassword(user.id, PASSWORD, "another good passphrase", {
			keepSessionId: a.session.id,
		});
		expect(await ctx.auth.sessions.authenticate(a.session.token)).toBeDefined();
		expect(await ctx.auth.sessions.authenticate(b.session.token)).toBeUndefined();
		expect(ctx.inbox.last("ada@example.com")?.subject).toBe(
			"Your Arachne Test password was changed",
		);
	});
});

describe("email change", () => {
	test("confirmed by a link to the new address; the old address is notified", async () => {
		const ctx = await setup();
		const user = await verifiedUser(ctx);
		await ctx.auth.requestEmailChange(user.id, "ada.l@example.com", PASSWORD);
		expect(ctx.inbox.last("ada@example.com")?.subject).toBe("Your Arachne Test email is changing");
		const updated = await ctx.auth.confirmEmailChange(ctx.tokenFrom("ada.l@example.com"));
		expect(updated).toMatchObject({ email: "ada.l@example.com", emailVerified: true });
	});

	test("taken addresses are refused at confirmation", async () => {
		const ctx = await setup();
		const user = await verifiedUser(ctx);
		await ctx.auth.requestEmailChange(user.id, "bob@example.com", PASSWORD);
		await verifiedUser(ctx, "bob@example.com");
		await expect(
			ctx.auth.confirmEmailChange(ctx.tokenFrom("bob@example.com")),
		).rejects.toMatchObject({
			code: "invalid_token",
		});
	});
});

describe("audit events", () => {
	test("security-relevant actions are recorded", async () => {
		const events: string[] = [];
		const ctx = await setup({ onEvent: (event) => events.push(event.type) });
		await verifiedUser(ctx);
		await ctx.auth
			.login({ email: "ada@example.com", password: "wrong wrong wrong" }, meta)
			.catch(() => {});
		await ctx.auth.login({ email: "ada@example.com", password: PASSWORD }, meta);
		expect(events).toEqual([
			"user.registered",
			"email.verified",
			"login.failed",
			"login.succeeded",
		]);
		const stored = await ctx.auth.admin.events({ limit: 10 });
		expect(stored.map((e) => e.type)).toContain("login.failed");
		expect(stored.find((e) => e.type === "login.failed")?.ip).toBe("203.0.113.7");
	});
});
