import type { Acl, Subject } from "@arachne/acl";
import type { AnyRoute, Context, Middleware } from "@arachne/server";
import { type Accounts, createAccounts } from "./accounts.ts";
import { type Admin, createAdmin } from "./admin.ts";
import { createCore } from "./core.ts";
import { AuthError } from "./errors.ts";
import { createMiddleware, requireAuth } from "./http.ts";
import { createMfa, type Mfa } from "./mfa.ts";
import { type AuthRoutesOptions, createRoutes } from "./routes.ts";
import { type ApiTokens, createApiTokens, createSessions, type Sessions } from "./sessions.ts";
import type { AuthTables } from "./tables.ts";
import type { AuthOptions, AuthUser } from "./types.ts";

/** The auth service: account flows plus sessions, tokens, 2FA, admin and HTTP glue. */
export interface Auth extends Accounts {
	/** Table definitions (for migrations or `createDb`). */
	readonly tables: AuthTables;
	/** Create tables (if missing) and seed default groups. Run once at boot. */
	setup: () => Promise<void>;
	/** Session management. */
	readonly sessions: Sessions;
	/** API token management. */
	readonly apiTokens: ApiTokens;
	/** Two-factor (TOTP). */
	readonly mfa: Mfa;
	/** User and group administration. */
	readonly admin: Admin;
	/** The current ACL (rebuilt when groups change). */
	acl: () => Acl;
	/** ACL subject for a user (pass API token scopes to narrow it). */
	subject: (user: AuthUser, scopes?: readonly string[] | null) => Subject;
	/** May `user` do `permission` (on `resource`)? */
	can: (user: AuthUser, permission: string, resource?: unknown) => boolean;
	/**
	 * In a handler: throw 401 unless signed in, 403 unless the request's
	 * subject (scopes applied) has `permission` on `resource`; returns the user.
	 */
	authorize: (ctx: Context, permission: string, resource?: unknown) => AuthUser;
	/** In a handler: the signed-in user, or throw 401. */
	user: (ctx: Context) => AuthUser;
	/** Middleware: authenticate (cookie or bearer), check CSRF, enforce route meta. */
	middleware: () => Middleware;
	/** The `/auth/*` routes. */
	routes: (options?: AuthRoutesOptions) => AnyRoute[];
}

/**
 * Create the auth service.
 *
 * @example
 * ```ts
 * const auth = createAuth({ db, mailer, baseUrl: "https://app.example", secret: process.env.AUTH_SECRET });
 * await auth.setup();
 * createServer({ middleware: [auth.middleware()], routes: [...auth.routes(), ...appRoutes] });
 * ```
 */
export function createAuth(options: AuthOptions): Auth {
	const core = createCore(options);
	const sessions = createSessions(core);
	const apiTokens = createApiTokens(core);
	const mfa = createMfa(core);
	const accounts = createAccounts(core, sessions, mfa);
	const admin = createAdmin(core, sessions);
	const deps = { core, accounts, sessions, apiTokens, mfa, admin };

	return {
		...accounts,
		tables: core.tables,
		setup: core.setup,
		sessions,
		apiTokens,
		mfa,
		admin,
		acl: core.acl,
		subject: core.subject,
		can: (user, permission, resource) => core.acl().can(core.subject(user), permission, resource),
		authorize(ctx, permission, resource) {
			const user = requireAuth(ctx);
			const subject = ctx.state.subject ?? core.subject(user);
			if (!core.acl().can(subject, permission, resource)) {
				throw new AuthError("forbidden", "You are not allowed to do that");
			}
			return user;
		},
		user: (ctx) => requireAuth(ctx),
		middleware: () => createMiddleware(core, sessions, apiTokens),
		routes: (routeOptions) => createRoutes(deps, routeOptions),
	};
}
