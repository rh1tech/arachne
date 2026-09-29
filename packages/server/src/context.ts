import type { PathParams } from "@arachne/router/path";
import { type CookieJar, createCookieJar } from "./cookies.ts";

/** HTTP methods a route can declare; `*` matches any method. */
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "*";

/**
 * Per-request values shared between middleware and handlers. Packages add
 * typed fields with declaration merging:
 *
 * @example
 * ```ts
 * declare module "@arachne/server" {
 *   interface ContextState { user?: { id: string } }
 * }
 * ```
 */
export interface ContextState {
	/** Untyped extra values; prefer declaring typed fields. */
	[key: string]: unknown;
}

/**
 * Route metadata read by middleware (auth guards, rate limits, MCP). Open for
 * declaration merging like {@link ContextState}.
 */
export interface RouteMeta {
	/** Untyped extra metadata; prefer declaring typed fields. */
	[key: string]: unknown;
}

/** The matched route, as seen by middleware. */
export interface RouteInfo {
	/** Declared method. */
	method: HttpMethod;
	/** Declared path pattern (with group prefixes), e.g. `/api/users/:id`. */
	path: string;
	/** Merged group + route metadata. */
	meta: RouteMeta;
	/** OpenAPI tags. */
	tags: readonly string[];
}

/**
 * Request context passed to middleware and handlers.
 *
 * @typeParam P - path params (parsed by the route's `params` schema)
 * @typeParam Q - query (parsed by the route's `query` schema)
 * @typeParam B - body (parsed by the route's `body` schema)
 */
export interface Context<P = PathParams, Q = Record<string, unknown>, B = unknown> {
	/** The incoming request. */
	readonly request: Request;
	/** Parsed request URL. */
	readonly url: URL;
	/** Path params; validated when the route has a `params` schema. */
	params: P;
	/** Query as an object (repeated keys → arrays); validated with a `query` schema. */
	query: Q;
	/** Raw query string parameters. */
	readonly searchParams: URLSearchParams;
	/** Parsed and validated body (only for routes with a `body` schema). */
	body: B;
	/** Request cookies and pending `Set-Cookie` headers. */
	readonly cookies: CookieJar;
	/** Per-request shared values (user, session, …). */
	readonly state: ContextState;
	/** The matched route, or `undefined` in the fallback handler. */
	readonly route: RouteInfo | undefined;
	/** Client IP (socket address, or `X-Forwarded-For` with `trustProxy`). */
	readonly ip: string | undefined;
	/** Request id, set by the `requestId()` middleware. */
	requestId: string | undefined;
	/** CSP nonce, set by `securityHeaders()`; use it on inline `<script>` tags. */
	nonce: string | undefined;
	/** Headers merged into the response (also on error responses). */
	readonly responseHeaders: Headers;
	/** Status for serialised handler results (default 200, or 204 for `undefined`). */
	status: (code: number) => void;
	/** Set (replace) a response header. */
	header: (name: string, value: string) => void;
	/** Status chosen with {@link Context.status}, if any. */
	readonly statusCode: number | undefined;
	/** Parse the JSON body without a schema (legacy helper; throws on invalid JSON). */
	json: <T = unknown>() => Promise<T>;
}

/** A middleware or fallback handler: always returns a `Response`. */
export type Handler = (ctx: Context) => Response | Promise<Response>;

/** Calls the next middleware (or the route handler). */
export type Next = () => Promise<Response>;

/** Code that runs around route handlers. Must return `next()`'s response or its own. */
export type Middleware = (ctx: Context, next: Next) => Response | Promise<Response>;

/** Minimal route object (`{ method, path, handler }`), accepted alongside `route()`. */
export interface RouteDefinition {
	/** HTTP method. */
	method: HttpMethod;
	/** Path pattern (`:param`, `*rest`). */
	path: string;
	/** Returns the response. */
	handler: Handler;
}

/** Options for {@link createContext}. */
export interface CreateContextOptions {
	/** Path params from the router. */
	params?: PathParams;
	/** Matched route. */
	route?: RouteInfo;
	/** Client IP. */
	ip?: string;
}

/** Build a {@link Context}. The server calls this; tests may too. */
export function createContext(
	request: Request,
	options: CreateContextOptions | PathParams = {},
): Context {
	const opts: CreateContextOptions =
		"params" in options || "route" in options || "ip" in options
			? (options as CreateContextOptions)
			: { params: options as PathParams };
	const url = new URL(request.url);
	const responseHeaders = new Headers();
	let statusCode: number | undefined;
	return {
		request,
		url,
		params: opts.params ?? {},
		query: {},
		searchParams: url.searchParams,
		body: undefined,
		cookies: createCookieJar(request),
		state: {},
		route: opts.route,
		ip: opts.ip,
		requestId: undefined,
		nonce: undefined,
		responseHeaders,
		status(code) {
			statusCode = code;
		},
		header(name, value) {
			responseHeaders.set(name, value);
		},
		get statusCode() {
			return statusCode;
		},
		json: async <T = unknown>() => (await request.json()) as T,
	};
}

function withType(init: ResponseInit, type: string): ResponseInit {
	const headers = new Headers(init.headers);
	if (!headers.has("content-type")) headers.set("content-type", type);
	return { ...init, headers };
}

/** JSON response (`application/json; charset=utf-8`). */
export function json(data: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(data), withType(init, "application/json; charset=utf-8"));
}

/** Plain-text response. */
export function text(body: string, init: ResponseInit = {}): Response {
	return new Response(body, withType(init, "text/plain; charset=utf-8"));
}

/** HTML response. Escape untrusted values before building `body`. */
export function html(body: string, init: ResponseInit = {}): Response {
	return new Response(body, withType(init, "text/html; charset=utf-8"));
}

/** Redirect response (default `302 Found`; use 303 after form POSTs). */
export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 302): Response {
	return new Response(null, { status, headers: { location } });
}
