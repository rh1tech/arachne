import type { Core } from "./core.ts";
import { AuthError } from "./errors.ts";
import type { Mfa } from "./mfa.ts";
import type { NewSession, Sessions } from "./sessions.ts";
import type { AuthUser, RequestMeta } from "./types.ts";

/** Result of {@link Accounts.login}: a session, or a second step for two-factor users. */
export type LoginResult =
	| { status: "ok"; user: AuthUser; session: NewSession }
	| { status: "mfa_required"; mfaToken: string };

/** Sign-up, sign-in and credential flows. */
export interface Accounts {
	/**
	 * Create an account and email a verification link. For an existing email
	 * the result is the same (no `user`) and the owner gets a notice instead,
	 * so sign-up can't be used to discover accounts.
	 */
	register: (
		input: { email: string; password: string; name?: string | undefined },
		meta?: RequestMeta,
	) => Promise<{ user?: AuthUser }>;
	/** Email (again) a verification link. */
	sendVerification: (userId: string) => Promise<void>;
	/** Confirm an email address with a link token. */
	verifyEmail: (token: string, meta?: RequestMeta) => Promise<AuthUser>;
	/** Check credentials and start a session (or ask for a second factor). */
	login: (input: { email: string; password: string }, meta?: RequestMeta) => Promise<LoginResult>;
	/** Finish a two-factor login with a TOTP or recovery code. */
	verifyMfa: (
		input: { mfaToken: string; code: string },
		meta?: RequestMeta,
	) => Promise<{ user: AuthUser; session: NewSession }>;
	/** End the session that owns `token`. */
	logout: (token: string, meta?: RequestMeta) => Promise<void>;
	/** Email a reset link if the account exists (always resolves). */
	requestPasswordReset: (email: string, meta?: RequestMeta) => Promise<void>;
	/** Set a new password with a reset token; signs out every session. */
	resetPassword: (token: string, password: string, meta?: RequestMeta) => Promise<void>;
	/** Change the password (needs the current one); other sessions are signed out. */
	changePassword: (
		userId: string,
		current: string,
		next: string,
		options?: { keepSessionId?: string; meta?: RequestMeta },
	) => Promise<void>;
	/** Start an email change: a link to the new address, a notice to the old one. */
	requestEmailChange: (
		userId: string,
		email: string,
		password: string,
		meta?: RequestMeta,
	) => Promise<void>;
	/** Finish an email change with the link token. */
	confirmEmailChange: (token: string, meta?: RequestMeta) => Promise<AuthUser>;
}

const HOUR = 3_600_000;
const MFA_ATTEMPTS = 5;

/** Build the account flows. */
export function createAccounts(core: Core, sessions: Sessions, mfa: Mfa): Accounts {
	const { db, tables, options } = core;
	const lockout = {
		maxAttempts: options.lockout?.maxAttempts ?? 5,
		minutes: options.lockout?.minutes ?? 15,
	};
	const invalid = () => new AuthError("invalid_credentials", "Invalid email or password");

	const startSession = async (user: AuthUser, meta: RequestMeta) => {
		const session = await sessions.create(user.id, meta);
		await db.update(tables.users).set({ lastLoginAt: core.now() }).where({ id: user.id }).run();
		await core.emit("login.succeeded", user.id, meta);
		return { user: { ...user, lastLoginAt: core.now() }, session };
	};

	const accounts: Accounts = {
		async register(input, meta = {}) {
			if (options.registration === "closed") {
				throw new AuthError("registration_closed", "Sign-up is closed");
			}
			const email = core.normalizeEmail(input.email);
			await core.checkPassword(input.password, email);
			const existing = await core.userRowByEmail(email);
			if (existing) {
				await core.mail("signupAttempt", email, { name: existing.name });
				await core.emit("user.signup_attempt", existing.id, meta);
				return {};
			}
			const at = core.now();
			const passwordHash = await core.hashPassword(input.password);
			const row = await db.transaction(async (tx) => {
				const created = await tx.insert(tables.users).values({
					email,
					name: input.name?.trim() || null,
					passwordHash,
					createdAt: at,
					updatedAt: at,
				});
				for (const group of options.defaultGroups ?? ["user"]) {
					await tx.insert(tables.memberships).values({ userId: created.id, group });
				}
				return created;
			});
			await core.emit("user.registered", row.id, meta);
			await accounts.sendVerification(row.id);
			return { user: await core.toUser(row) };
		},

		async sendVerification(userId) {
			const user = await core.requireUser(userId);
			if (user.emailVerified) return;
			const token = await core.issueToken(userId, "verify_email", 24 * HOUR);
			await core.mail("verifyEmail", user.email, {
				name: user.name,
				url: core.link("verifyEmail", token),
			});
		},

		async verifyEmail(token, meta = {}) {
			const { userId } = await core.consumeToken(token, "verify_email");
			await db
				.update(tables.users)
				.set({ emailVerifiedAt: core.now(), updatedAt: core.now() })
				.where({ id: userId })
				.run();
			await core.emit("email.verified", userId, meta);
			return core.requireUser(userId);
		},

		async login(input, meta = {}) {
			const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
			const row = email ? await core.userRowByEmail(email) : undefined;
			if (!row) {
				await core.verifyPassword(String(input.password ?? ""), null);
				await core.emit("login.failed", null, meta, { email });
				throw invalid();
			}
			const at = core.now();
			if (row.lockedUntil && row.lockedUntil.getTime() > at.getTime()) {
				const seconds = Math.ceil((row.lockedUntil.getTime() - at.getTime()) / 1000);
				throw new AuthError("account_locked", "Too many failed attempts. Try again later.", {
					headers: { "retry-after": String(seconds) },
				});
			}
			if (!(await core.verifyPassword(String(input.password ?? ""), row.passwordHash))) {
				const failures = row.failedLogins + 1;
				const lock = failures >= lockout.maxAttempts;
				await db
					.update(tables.users)
					.set(
						lock
							? { failedLogins: 0, lockedUntil: new Date(at.getTime() + lockout.minutes * 60_000) }
							: { failedLogins: failures },
					)
					.where({ id: row.id })
					.run();
				await core.emit(lock ? "login.locked" : "login.failed", row.id, meta);
				throw invalid();
			}
			if (row.failedLogins > 0 || row.lockedUntil) {
				await db
					.update(tables.users)
					.set({ failedLogins: 0, lockedUntil: null })
					.where({ id: row.id })
					.run();
			}
			if (core.isBlocked(row)) {
				await core.emit("login.blocked", row.id, meta);
				throw new AuthError("account_blocked", "This account is blocked", {
					details: { reason: row.blockedReason, until: row.blockedUntil?.toISOString() ?? null },
				});
			}
			if (options.requireEmailVerification && !row.emailVerifiedAt) {
				throw new AuthError("email_not_verified", "Confirm your email address before signing in");
			}
			if (row.mfaEnabled) {
				const mfaToken = await core.issueToken(row.id, "mfa", 5 * 60_000, { attempts: 0 });
				return { status: "mfa_required", mfaToken };
			}
			return { status: "ok", ...(await startSession(await core.toUser(row), meta)) };
		},

		async verifyMfa(input, meta = {}) {
			const pending = await core.consumeToken(input.mfaToken, "mfa", true);
			const row = await core.userRow(pending.userId);
			if (!row || core.isBlocked(row))
				throw new AuthError("invalid_token", "This sign-in has expired");
			if (!(await mfa.verify(row, String(input.code ?? "")))) {
				const attempts = Number(pending.data?.["attempts"] ?? 0) + 1;
				if (attempts >= MFA_ATTEMPTS) await core.consumeToken(input.mfaToken, "mfa");
				else await core.updateTokenData(input.mfaToken, { attempts });
				await core.emit("mfa.failed", row.id, meta);
				throw new AuthError("invalid_code", "That code is not valid");
			}
			await core.consumeToken(input.mfaToken, "mfa");
			return startSession(await core.toUser(row), meta);
		},

		async logout(token, meta = {}) {
			const found = await sessions.authenticate(token);
			await sessions.revokeToken(token);
			if (found) await core.emit("logout", found.user.id, meta);
		},

		async requestPasswordReset(email, meta = {}) {
			let normalized: string;
			try {
				normalized = core.normalizeEmail(email);
			} catch {
				return;
			}
			const row = await core.userRowByEmail(normalized);
			if (!row) return;
			const token = await core.issueToken(row.id, "reset_password", HOUR);
			await core.mail("resetPassword", row.email, {
				name: row.name,
				url: core.link("resetPassword", token),
			});
			await core.emit("password.reset_requested", row.id, meta);
		},

		async resetPassword(token, password, meta = {}) {
			const { userId } = await core.consumeToken(token, "reset_password");
			const row = await core.userRow(userId);
			if (!row) throw new AuthError("invalid_token", "This link is invalid or has expired");
			await core.checkPassword(password, row.email);
			const at = core.now();
			await db
				.update(tables.users)
				.set({
					passwordHash: await core.hashPassword(password),
					updatedAt: at,
					failedLogins: 0,
					lockedUntil: null,
					// Following the emailed link proves the address.
					emailVerifiedAt: row.emailVerifiedAt ?? at,
				})
				.where({ id: userId })
				.run();
			await sessions.revokeAll(userId);
			await core.emit("password.reset", userId, meta);
			await core.mail("passwordChanged", row.email, { name: row.name });
		},

		async changePassword(userId, current, next, changeOptions = {}) {
			const row = await core.userRow(userId);
			if (!row || !(await core.verifyPassword(current, row.passwordHash))) {
				throw new AuthError("invalid_credentials", "Current password is incorrect");
			}
			await core.checkPassword(next, row.email);
			await db
				.update(tables.users)
				.set({ passwordHash: await core.hashPassword(next), updatedAt: core.now() })
				.where({ id: userId })
				.run();
			await sessions.revokeAll(userId, changeOptions.keepSessionId);
			await core.emit("password.changed", userId, changeOptions.meta);
			await core.mail("passwordChanged", row.email, { name: row.name });
		},

		async requestEmailChange(userId, email, password, meta = {}) {
			const row = await core.userRow(userId);
			if (!row || !(await core.verifyPassword(password, row.passwordHash))) {
				throw new AuthError("invalid_credentials", "Password is incorrect");
			}
			const next = core.normalizeEmail(email);
			if (next === row.email) return;
			const token = await core.issueToken(userId, "change_email", 24 * HOUR, { email: next });
			// Taken addresses get the link too (no enumeration); confirmation re-checks.
			await core.mail("confirmEmailChange", next, {
				name: row.name,
				url: core.link("confirmEmail", token),
			});
			await core.mail("emailChangeRequested", row.email, { name: row.name, email: next });
			await core.emit("email.change_requested", userId, meta, { email: next });
		},

		async confirmEmailChange(token, meta = {}) {
			const { userId, data } = await core.consumeToken(token, "change_email");
			const email = String(data?.["email"] ?? "");
			if (!email || (await core.userRowByEmail(email))) {
				throw new AuthError("invalid_token", "This link is invalid or has expired");
			}
			const at = core.now();
			await db
				.update(tables.users)
				.set({ email, emailVerifiedAt: at, updatedAt: at })
				.where({ id: userId })
				.run();
			await core.emit("email.changed", userId, meta, { email });
			return core.requireUser(userId);
		},
	};
	return accounts;
}
