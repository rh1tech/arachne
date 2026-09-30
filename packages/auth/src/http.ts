import type { Subject } from "@arachne/acl";
import type { Context, Middleware } from "@arachne/server";
import type { Core } from "./core.ts";
import { hmac, safeEqual } from "./crypto.ts";
import { AuthError } from "./errors.ts";
import type { ApiTokens, Sessions } from "./sessions.ts";
import type { ApiTokenInfo, AuthUser, RequestMeta, SessionInfo } from "./types.ts";

declare module "@arachne/server" {
	interface ContextState {
		/** Signed-in user (session cookie or API token). */
		user?: AuthUser;
		/** Current session (cookie authentication). */
		session?: SessionInfo;
		/** Current API token (bearer authentication). */
		apiToken?: ApiTokenInfo;
		/** ACL subject for the request (token scopes applied). */
		subject?: Subject;
		/** CSRF token for this session (send it as `X-CSRF-Token` when Fetch Metadata is unavailable). */
		csrfToken?: string;
		/** How the request was authenticated. */
		authMethod?: "session" | "token";
	}
	interface RouteMeta {
		/** Require a signed-in user (`"verified"`: with a confirmed email). */
		auth?: boolean | "verified";
		/** Require an ACL permission (implies `auth`). */
		permission?: string;
		/** Require at least this group's level (implies `auth`). */
		level?: string;
	}
}

const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Connection details for events and sessions. */
export function requestMeta(ctx: Context): RequestMeta {
	return { ip: ctx.ip, userAgent: ctx.request.headers.get("user-agent") ?? undefined };
}

function allowedOrigin(core: Core, origin: string): boolean {
	return (
		origin === new URL(core.options.baseUrl).origin ||
		(core.options.trustedOrigins ?? []).includes(origin)
	);
}

/**
 * Cookie-authenticated unsafe requests must come from our origin. Browsers
 * send Fetch Metadata (`Sec-Fetch-Site`) and `Origin`; clients that send
 * neither must present the session's CSRF token in `X-CSRF-Token`.
 */
function checkCsrf(core: Core, ctx: Context): void {
	const site = ctx.request.headers.get("sec-fetch-site");
	const origin = ctx.request.headers.get("origin");
	if (origin) {
		if (!allowedOrigin(core, origin))
			throw new AuthError("csrf_failed", "Cross-site request refused");
		return;
	}
	if (site) {
		if (site !== "same-origin" && site !== "none")
			throw new AuthError("csrf_failed", "Cross-site request refused");
		return;
	}
	const token = ctx.request.headers.get("x-csrf-token") ?? "";
	if (!ctx.state.csrfToken || !safeEqual(token, ctx.state.csrfToken)) {
		throw new AuthError("csrf_failed", "Missing or invalid CSRF token");
	}
}

/** The CSRF token bound to a session. */
export function csrfTokenFor(core: Core, sessionId: string): string {
	return hmac(core.secret, `csrf:${sessionId}`);
}

/** Session cookie attributes. */
export function sessionCookie(core: Core) {
	return {
		httpOnly: true,
		secure: core.secureCookie,
		sameSite: core.options.session?.sameSite ?? "lax",
		path: "/",
		maxAge: Math.floor(core.sessionTtlMs / 1000),
	} as const;
}

/** Throw unless the request is signed in; returns the user. */
export function requireAuth(ctx: Context, verified = false): AuthUser {
	const user = ctx.state.user;
	if (!user) {
		throw new AuthError("unauthorized", "Sign in to continue", {
			headers: { "www-authenticate": "Bearer" },
		});
	}
	if (verified && !user.emailVerified)
		throw new AuthError("email_not_verified", "Confirm your email address first");
	return user;
}

async function enforceMeta(core: Core, ctx: Context): Promise<void> {
	const meta = ctx.route?.meta;
	if (!meta || (!meta.auth && !meta.permission && !meta.level)) return;
	const user = requireAuth(ctx, meta.auth === "verified");
	const subject = ctx.state.subject ?? core.subject(user);
	if (meta.permission && !core.acl().can(subject, meta.permission)) {
		throw new AuthError("forbidden", "You are not allowed to do that");
	}
	if (meta.level && !core.acl().atLeast(subject, meta.level)) {
		throw new AuthError("forbidden", "You are not allowed to do that");
	}
}

/** Build the auth middleware. */
export function createMiddleware(core: Core, sessions: Sessions, apiTokens: ApiTokens): Middleware {
	return async (ctx, next) => {
		const authorization = ctx.request.headers.get("authorization");
		if (authorization?.toLowerCase().startsWith("bearer ")) {
			const found = await apiTokens.authenticate(authorization.slice(7).trim());
			if (!found)
				throw new AuthError("unauthorized", "Invalid or expired token", {
					headers: { "www-authenticate": 'Bearer error="invalid_token"' },
				});
			ctx.state.user = found.user;
			ctx.state.apiToken = found.token;
			ctx.state.subject = core.subject(found.user, found.token.scopes);
			ctx.state.authMethod = "token";
		} else {
			const token = ctx.cookies.get(core.cookieName);
			if (token) {
				const found = await sessions.authenticate(token);
				if (found) {
					ctx.state.user = found.user;
					ctx.state.session = found.session;
					ctx.state.subject = core.subject(found.user);
					ctx.state.csrfToken = csrfTokenFor(core, found.session.id);
					ctx.state.authMethod = "session";
				} else {
					ctx.cookies.delete(core.cookieName);
				}
			}
			// Session requests always; cookie-less ones when a browser marks them cross-site
			// (login CSRF).
			const crossSite =
				ctx.request.headers.has("origin") ||
				ctx.request.headers.get("sec-fetch-site") === "cross-site";
			if (UNSAFE.has(ctx.request.method.toUpperCase()) && (ctx.state.session || crossSite)) {
				checkCsrf(core, ctx);
			}
		}
		await enforceMeta(core, ctx);
		return next();
	};
}
