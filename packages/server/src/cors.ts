import type { Context, Middleware } from "./context.ts";

/** Options for {@link cors}. */
export interface CorsOptions {
	/**
	 * Allowed origins: `"*"` (default, no credentials), a list, or a predicate.
	 * Only allowed origins receive CORS headers.
	 */
	origin?: "*" | readonly string[] | ((origin: string, ctx: Context) => boolean);
	/** Allowed methods for preflight. Default: common methods. */
	methods?: readonly string[];
	/** Allowed request headers. Default: echo `Access-Control-Request-Headers`. */
	allowHeaders?: readonly string[];
	/** Response headers exposed to scripts. */
	exposeHeaders?: readonly string[];
	/** Allow cookies/credentials (requires explicit origins). */
	credentials?: boolean;
	/** Preflight cache time in seconds. */
	maxAge?: number;
}

const DEFAULT_METHODS = ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"];

function isAllowed(options: CorsOptions, origin: string, ctx: Context): boolean {
	const rule = options.origin ?? "*";
	if (rule === "*") return true;
	if (typeof rule === "function") return rule(origin, ctx);
	return rule.includes(origin);
}

/**
 * Cross-origin resource sharing. Answers preflight `OPTIONS` requests with
 * 204 and adds `Access-Control-*` headers to allowed origins' responses.
 */
export function cors(options: CorsOptions = {}): Middleware {
	if (options.credentials && (options.origin ?? "*") === "*") {
		throw new Error("cors: credentials require explicit origins");
	}
	return async (ctx, next) => {
		const origin = ctx.request.headers.get("origin");
		ctx.header("vary", "Origin");
		if (!origin || !isAllowed(options, origin, ctx)) return next();

		ctx.header(
			"access-control-allow-origin",
			options.origin === "*" || !options.origin ? "*" : origin,
		);
		if (options.credentials) ctx.header("access-control-allow-credentials", "true");
		if (options.exposeHeaders?.length) {
			ctx.header("access-control-expose-headers", options.exposeHeaders.join(", "));
		}

		const preflight =
			ctx.request.method === "OPTIONS" && ctx.request.headers.has("access-control-request-method");
		if (!preflight) return next();

		ctx.header("access-control-allow-methods", (options.methods ?? DEFAULT_METHODS).join(", "));
		const requested = ctx.request.headers.get("access-control-request-headers");
		const allowHeaders = options.allowHeaders?.join(", ") ?? requested;
		if (allowHeaders) ctx.header("access-control-allow-headers", allowHeaders);
		if (options.maxAge !== undefined) ctx.header("access-control-max-age", String(options.maxAge));
		return new Response(null, { status: 204 });
	};
}
