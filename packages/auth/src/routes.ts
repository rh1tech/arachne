import { s } from "@arachnejs/schema";
import {
	type AnyRoute,
	type Context,
	group,
	type Middleware,
	rateLimit,
	route,
} from "@arachnejs/server";
import type { Accounts } from "./accounts.ts";
import type { Admin } from "./admin.ts";
import type { Core } from "./core.ts";
import { requestMeta, requireAuth, sessionCookie } from "./http.ts";
import type { Mfa } from "./mfa.ts";
import type { ApiTokens, NewSession, Sessions } from "./sessions.ts";
import type { AuthUser } from "./types.ts";

/** Options for `auth.routes()`. */
export interface AuthRoutesOptions {
	/** Path prefix. Default `/auth`. */
	prefix?: string;
	/** Include `/admin/*` routes. Default `true`. */
	admin?: boolean;
}

/** Everything the route factory needs. */
export interface RouteDeps {
	core: Core;
	accounts: Accounts;
	sessions: Sessions;
	apiTokens: ApiTokens;
	mfa: Mfa;
	admin: Admin;
}

const email = s.email();
const password = s.string({ min: 1, max: 256 });
const token = s.string({ min: 20, max: 200 });
const idParams = s.object({ id: s.string({ min: 1 }) });

/** Build the auth HTTP routes. */
export function createRoutes(deps: RouteDeps, options: AuthRoutesOptions = {}): AnyRoute[] {
	const { core, accounts, sessions, apiTokens, mfa, admin } = deps;
	const limit = core.options.rateLimit ?? { windowMs: 60_000, max: 20 };
	const throttled: Middleware[] = limit
		? [
				rateLimit({
					...limit,
					prefix: "auth",
					key: (ctx) => `${ctx.ip ?? "unknown"}:${ctx.route?.path}`,
				}),
			]
		: [];
	const tags = ["auth"];

	const signedIn = (ctx: Context, user: AuthUser, session: NewSession) => {
		ctx.cookies.set(core.cookieName, session.token, sessionCookie(core));
		return { user, expiresAt: session.expiresAt };
	};

	const account = [
		route({
			method: "POST",
			path: "/register",
			summary: "Create an account",
			tags,
			middleware: throttled,
			body: s.object({ email, password, name: s.optional(s.string({ max: 100 })) }),
			handler: async (ctx) => {
				await accounts.register(ctx.body, requestMeta(ctx));
				ctx.status(202);
				return { message: "Check your email to confirm your address" };
			},
		}),
		route({
			method: "POST",
			path: "/verify-email",
			summary: "Confirm an email address",
			tags,
			body: s.object({ token }),
			handler: async (ctx) => ({
				user: await accounts.verifyEmail(ctx.body.token, requestMeta(ctx)),
			}),
		}),
		route({
			method: "POST",
			path: "/verify-email/resend",
			summary: "Send the verification email again",
			tags,
			meta: { auth: true },
			middleware: throttled,
			handler: async (ctx) => {
				await accounts.sendVerification(requireAuth(ctx).id);
				ctx.status(202);
				return { message: "Verification email sent" };
			},
		}),
		route({
			method: "POST",
			path: "/login",
			summary: "Sign in",
			tags,
			middleware: throttled,
			body: s.object({ email: s.string({ max: 320 }), password }),
			handler: async (ctx) => {
				const result = await accounts.login(ctx.body, requestMeta(ctx));
				if (result.status === "mfa_required")
					return { mfaRequired: true, mfaToken: result.mfaToken };
				return signedIn(ctx, result.user, result.session);
			},
		}),
		route({
			method: "POST",
			path: "/mfa/verify",
			summary: "Finish a two-factor sign-in",
			tags,
			middleware: throttled,
			body: s.object({ mfaToken: token, code: s.string({ min: 6, max: 20 }) }),
			handler: async (ctx) => {
				const { user, session } = await accounts.verifyMfa(ctx.body, requestMeta(ctx));
				return signedIn(ctx, user, session);
			},
		}),
		route({
			method: "POST",
			path: "/logout",
			summary: "Sign out",
			tags,
			handler: async (ctx) => {
				const cookie = ctx.cookies.get(core.cookieName);
				if (cookie) await accounts.logout(cookie, requestMeta(ctx));
				ctx.cookies.delete(core.cookieName);
				return undefined;
			},
		}),
		route({
			method: "GET",
			path: "/me",
			summary: "The signed-in user",
			tags,
			meta: { auth: true },
			handler: (ctx) => {
				const user = requireAuth(ctx);
				return {
					user,
					csrfToken: ctx.state.csrfToken ?? null,
					permissions: core.acl().permissions(ctx.state.subject ?? core.subject(user)),
				};
			},
		}),
		route({
			method: "POST",
			path: "/password/forgot",
			summary: "Email a password reset link",
			tags,
			middleware: throttled,
			body: s.object({ email: s.string({ max: 320 }) }),
			handler: async (ctx) => {
				await accounts.requestPasswordReset(ctx.body.email, requestMeta(ctx));
				ctx.status(202);
				return { message: "If the account exists, a reset link is on its way" };
			},
		}),
		route({
			method: "POST",
			path: "/password/reset",
			summary: "Set a new password with a reset token",
			tags,
			middleware: throttled,
			body: s.object({ token, password }),
			handler: async (ctx) => {
				await accounts.resetPassword(ctx.body.token, ctx.body.password, requestMeta(ctx));
				return undefined;
			},
		}),
		route({
			method: "POST",
			path: "/password/change",
			summary: "Change the password",
			tags,
			meta: { auth: true },
			body: s.object({ currentPassword: password, password }),
			handler: async (ctx) => {
				const user = requireAuth(ctx);
				await accounts.changePassword(user.id, ctx.body.currentPassword, ctx.body.password, {
					...(ctx.state.session ? { keepSessionId: ctx.state.session.id } : {}),
					meta: requestMeta(ctx),
				});
				return undefined;
			},
		}),
		route({
			method: "POST",
			path: "/email/change",
			summary: "Start changing the email address",
			tags,
			meta: { auth: true },
			body: s.object({ email, password }),
			handler: async (ctx) => {
				await accounts.requestEmailChange(
					requireAuth(ctx).id,
					ctx.body.email,
					ctx.body.password,
					requestMeta(ctx),
				);
				ctx.status(202);
				return { message: "Check the new address to confirm the change" };
			},
		}),
		route({
			method: "POST",
			path: "/email/confirm",
			summary: "Confirm a new email address",
			tags,
			body: s.object({ token }),
			handler: async (ctx) => ({
				user: await accounts.confirmEmailChange(ctx.body.token, requestMeta(ctx)),
			}),
		}),
	];

	const selfService = [
		route({
			method: "GET",
			path: "/sessions",
			summary: "List my sessions",
			tags,
			meta: { auth: true },
			handler: async (ctx) => ({
				sessions: (await sessions.list(requireAuth(ctx).id)).map((session) => ({
					...session,
					current: session.id === ctx.state.session?.id,
				})),
			}),
		}),
		route({
			method: "DELETE",
			path: "/sessions/:id",
			summary: "End one of my sessions",
			tags,
			meta: { auth: true },
			params: idParams,
			handler: async (ctx) => {
				await sessions.revoke(requireAuth(ctx).id, ctx.params.id);
				return undefined;
			},
		}),
		route({
			method: "GET",
			path: "/tokens",
			summary: "List my API tokens",
			tags,
			meta: { auth: true },
			handler: async (ctx) => ({ tokens: await apiTokens.list(requireAuth(ctx).id) }),
		}),
		route({
			method: "POST",
			path: "/tokens",
			summary: "Create an API token",
			tags,
			meta: { auth: true },
			body: s.object({
				name: s.string({ min: 1, max: 100 }),
				scopes: s.optional(s.array(s.string({ min: 1 }))),
				expiresInDays: s.optional(s.integer({ min: 1, max: 3650 })),
			}),
			handler: async (ctx) => {
				ctx.status(201);
				const { name, scopes, expiresInDays } = ctx.body;
				return apiTokens.create(requireAuth(ctx).id, {
					name,
					...(scopes ? { scopes } : {}),
					...(expiresInDays ? { expiresInDays } : {}),
				});
			},
		}),
		route({
			method: "DELETE",
			path: "/tokens/:id",
			summary: "Revoke an API token",
			tags,
			meta: { auth: true },
			params: idParams,
			handler: async (ctx) => {
				await apiTokens.revoke(requireAuth(ctx).id, ctx.params.id);
				return undefined;
			},
		}),
		route({
			method: "POST",
			path: "/mfa/totp/setup",
			summary: "Start two-factor enrolment",
			tags,
			meta: { auth: true },
			handler: (ctx) => mfa.setup(requireAuth(ctx).id),
		}),
		route({
			method: "POST",
			path: "/mfa/totp/enable",
			summary: "Confirm two-factor enrolment",
			tags,
			meta: { auth: true },
			body: s.object({ code: s.string({ min: 6, max: 8 }) }),
			handler: (ctx) => mfa.enable(requireAuth(ctx).id, ctx.body.code),
		}),
		route({
			method: "POST",
			path: "/mfa/totp/disable",
			summary: "Turn two-factor off",
			tags,
			meta: { auth: true },
			body: s.object({ password }),
			handler: async (ctx) => {
				await mfa.disable(requireAuth(ctx).id, ctx.body.password);
				return undefined;
			},
		}),
	];

	const adminTags = ["auth-admin"];
	const adminRoutes = [
		route({
			method: "GET",
			path: "/admin/users",
			summary: "Search users",
			tags: adminTags,
			meta: { permission: "users:read" },
			query: s.object({
				search: s.optional(s.string({ max: 100 })),
				status: s.optional(s.enum(["active", "blocked"])),
				group: s.optional(s.string()),
				limit: s.defaulted(s.coerce.integer({ min: 1, max: 200 }), 50),
				offset: s.defaulted(s.coerce.integer({ min: 0 }), 0),
			}),
			handler: (ctx) => {
				const { search, status, group: inGroup, limit: pageSize, offset } = ctx.query;
				return admin.listUsers({
					limit: pageSize,
					offset,
					...(search ? { search } : {}),
					...(status ? { status } : {}),
					...(inGroup ? { group: inGroup } : {}),
				});
			},
		}),
		route({
			method: "GET",
			path: "/admin/users/:id",
			summary: "One user",
			tags: adminTags,
			meta: { permission: "users:read" },
			params: idParams,
			handler: async (ctx) => ({ user: await core.requireUser(ctx.params.id) }),
		}),
		route({
			method: "POST",
			path: "/admin/users/:id/block",
			summary: "Block a user",
			tags: adminTags,
			meta: { permission: "users:block" },
			params: idParams,
			body: s.object({
				reason: s.string({ min: 1, max: 500 }),
				until: s.optional(s.coerce.date()),
			}),
			handler: async (ctx) => ({
				user: await admin.blockUser(
					requireAuth(ctx),
					ctx.params.id,
					{ reason: ctx.body.reason, until: ctx.body.until ?? null },
					requestMeta(ctx),
				),
			}),
		}),
		route({
			method: "POST",
			path: "/admin/users/:id/unblock",
			summary: "Unblock a user",
			tags: adminTags,
			meta: { permission: "users:block" },
			params: idParams,
			handler: async (ctx) => ({
				user: await admin.unblockUser(requireAuth(ctx), ctx.params.id, requestMeta(ctx)),
			}),
		}),
		route({
			method: "PUT",
			path: "/admin/users/:id/groups",
			summary: "Set a user's groups",
			tags: adminTags,
			meta: { permission: "users:manage" },
			params: idParams,
			body: s.object({ groups: s.array(s.string({ min: 1 })) }),
			handler: async (ctx) => ({
				user: await admin.setGroups(
					requireAuth(ctx),
					ctx.params.id,
					ctx.body.groups,
					requestMeta(ctx),
				),
			}),
		}),
		route({
			method: "PUT",
			path: "/admin/users/:id/grants",
			summary: "Set a user's direct permissions",
			tags: adminTags,
			meta: { permission: "users:manage" },
			params: idParams,
			body: s.object({ grants: s.array(s.string({ min: 1 })) }),
			handler: async (ctx) => ({
				user: await admin.setGrants(
					requireAuth(ctx),
					ctx.params.id,
					ctx.body.grants,
					requestMeta(ctx),
				),
			}),
		}),
		route({
			method: "DELETE",
			path: "/admin/users/:id",
			summary: "Delete a user",
			tags: adminTags,
			meta: { permission: "users:delete" },
			params: idParams,
			handler: async (ctx) => {
				await admin.deleteUser(requireAuth(ctx), ctx.params.id, requestMeta(ctx));
				return undefined;
			},
		}),
		route({
			method: "GET",
			path: "/admin/groups",
			summary: "List groups",
			tags: adminTags,
			meta: { permission: "users:read" },
			handler: async () => ({ groups: await admin.listGroups() }),
		}),
		route({
			method: "PUT",
			path: "/admin/groups/:name",
			summary: "Create or replace a group",
			tags: adminTags,
			meta: { permission: "groups:manage" },
			params: s.object({ name: s.string({ pattern: /^[a-z0-9_-]{1,64}$/ }) }),
			body: s.object({
				level: s.defaulted(s.integer(), 0),
				grants: s.array(s.string({ min: 1 })),
				inherits: s.optional(s.array(s.string())),
				description: s.optional(s.string({ max: 200 })),
			}),
			handler: async (ctx) => {
				const { level, grants, inherits, description } = ctx.body;
				return {
					group: await admin.saveGroup(
						requireAuth(ctx),
						ctx.params.name,
						{
							level,
							grants,
							...(inherits ? { inherits } : {}),
							...(description ? { description } : {}),
						},
						requestMeta(ctx),
					),
				};
			},
		}),
		route({
			method: "GET",
			path: "/admin/events",
			summary: "Audit log",
			tags: adminTags,
			meta: { permission: "users:read" },
			query: s.object({
				userId: s.optional(s.string()),
				type: s.optional(s.string()),
				limit: s.defaulted(s.coerce.integer({ min: 1, max: 500 }), 50),
			}),
			handler: async (ctx) => {
				const { userId, type, limit: count } = ctx.query;
				return {
					events: await admin.events({
						limit: count,
						...(userId ? { userId } : {}),
						...(type ? { type } : {}),
					}),
				};
			},
		}),
	];

	const all: AnyRoute[] = [
		...account,
		...selfService,
		...(options.admin === false ? [] : adminRoutes),
	];
	return group({ prefix: options.prefix ?? "/auth" }, all) as AnyRoute[];
}
