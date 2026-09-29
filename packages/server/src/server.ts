import { type CompiledPath, compilePath } from "@arachne/router/path";
import { DEFAULT_BODY_LIMIT } from "./body.ts";
import { type Codec, negotiate } from "./codec.ts";
import {
	type Context,
	createContext,
	type Handler,
	type Middleware,
	type RouteDefinition,
} from "./context.ts";
import { errorBody, HttpError, toHttpError } from "./errors.ts";
import { type AnyRoute, executeRoute, type RouteEnv, toRoute } from "./route.ts";

interface CompiledRoute {
	route: AnyRoute;
	compiled: CompiledPath;
}

/** Options for {@link createServer}. */
export interface CreateServerOptions {
	/** Routes from `route()`/`group()` or plain `{ method, path, handler }` objects. */
	routes?: ReadonlyArray<AnyRoute | RouteDefinition> | undefined;
	/** Global middleware, outermost first. Also runs for the fallback. */
	middleware?: readonly Middleware[] | undefined;
	/** Called when no route matches. Default: 404 error envelope. */
	fallback?: Handler | undefined;
	/** Default port for {@link ArachneServer.listen}. */
	port?: number | undefined;
	/** Bind address. Default `0.0.0.0`. */
	hostname?: string | undefined;
	/** Extra body codecs (JSON is built in), e.g. `cbor()` from `@arachne/server/cbor`. */
	codecs?: readonly Codec[] | undefined;
	/** Default request body limit in bytes. Default 1 MiB. */
	bodyLimit?: number | undefined;
	/** Validate handler results against `response` schemas (recommended in dev/test). */
	validateResponses?: boolean | undefined;
	/** Take the client IP from `X-Forwarded-For` (only behind a trusted proxy). */
	trustProxy?: boolean | undefined;
	/** Include internal error messages in 500 responses (never in production). */
	exposeErrors?: boolean | undefined;
	/** Observe errors that become 5xx responses (logging, error tracking). */
	onError?: ((error: unknown, ctx: Context) => void) | undefined;
}

/** Connection details passed by the runtime alongside a request. */
export interface RequestInfo {
	/** Client socket address. */
	ip?: string | undefined;
}

/** A running (or runnable) server. */
export interface ArachneServer {
	/** Handle one request. Use it in tests, or hand it to any Fetch-API runtime. */
	readonly fetch: (request: Request, info?: RequestInfo) => Promise<Response>;
	/** Every route, compiled order. */
	readonly routes: readonly AnyRoute[];
	/** Start listening with `Bun.serve` (port `0` picks a free port). */
	listen: (port?: number) => { port: number; url: string; stop: () => void };
	/** Stop the listener started by {@link ArachneServer.listen}. */
	stop: () => void;
}

function compose(middleware: readonly Middleware[], terminal: (ctx: Context) => Promise<Response>) {
	return (ctx: Context): Promise<Response> => {
		let index = -1;
		const dispatch = async (i: number): Promise<Response> => {
			if (i <= index) throw new Error("next() called multiple times");
			index = i;
			const layer = middleware[i];
			if (!layer) return terminal(ctx);
			return layer(ctx, () => dispatch(i + 1));
		};
		return dispatch(0);
	};
}

function methodMatches(routeMethod: string, requestMethod: string): boolean {
	return routeMethod === "*" || routeMethod === requestMethod;
}

function allowedMethods(matches: CompiledRoute[]): string {
	const methods = new Set<string>();
	for (const { route } of matches) {
		if (route.method === "*") return "*";
		methods.add(route.method);
		if (route.method === "GET") methods.add("HEAD");
	}
	return [...methods].join(", ");
}

/** Merge headers/cookies queued on `ctx` into `response`. */
function finalize(response: Response, ctx: Context, head: boolean): Response {
	const pending = ctx.cookies.pending;
	let hasExtra = pending.length > 0;
	ctx.responseHeaders.forEach(() => {
		hasExtra = true;
	});
	if (!hasExtra && !head) return response;
	const headers = new Headers(response.headers);
	ctx.responseHeaders.forEach((value, key) => {
		// Headers on the returned Response are more specific than middleware defaults.
		if (key === "vary" && headers.has("vary"))
			headers.set("vary", `${headers.get("vary")}, ${value}`);
		else if (!headers.has(key)) headers.set(key, value);
	});
	for (const cookie of pending) headers.append("set-cookie", cookie);
	return new Response(head ? null : response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}

/**
 * Create an HTTP server from routes and middleware.
 *
 * @example
 * ```ts
 * const app = createServer({ routes: [getUser, createUser], middleware: [cors(), securityHeaders()] });
 * app.listen(3000);
 * ```
 */
export function createServer(options: CreateServerOptions = {}): ArachneServer {
	const routes = (options.routes ?? []).map(toRoute);
	const compiled: CompiledRoute[] = routes.map((route) => ({
		route,
		compiled: compilePath(route.path),
	}));
	const middleware = options.middleware ?? [];
	const env: RouteEnv = {
		codecs: options.codecs ?? [],
		bodyLimit: options.bodyLimit ?? DEFAULT_BODY_LIMIT,
		validateResponses: options.validateResponses ?? false,
	};

	const errorResponse = (error: unknown, ctx: Context): Response => {
		const http = toHttpError(error);
		if (http.status >= 500) options.onError?.(error, ctx);
		const exposed =
			options.exposeErrors && !(error instanceof HttpError) && error instanceof Error
				? new HttpError(500, error.message, { code: "internal_error" })
				: http;
		const codec = negotiate(env.codecs, ctx.request.headers.get("accept"));
		const headers = new Headers(http.headers);
		headers.set(
			"content-type",
			codec.type === "application/json" ? "application/json; charset=utf-8" : codec.type,
		);
		return new Response(codec.encode(errorBody(exposed)), { status: http.status, headers });
	};

	const guarded =
		(run: (ctx: Context) => Promise<Response>) =>
		async (ctx: Context): Promise<Response> => {
			try {
				return await run(ctx);
			} catch (error) {
				return errorResponse(error, ctx);
			}
		};

	const notFound: Handler =
		options.fallback ??
		((ctx) => {
			throw new HttpError(404, `Not Found: ${ctx.url.pathname}`, { code: "not_found" });
		});

	const clientIp = (request: Request, info?: RequestInfo): string | undefined => {
		if (options.trustProxy) {
			const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
			if (forwarded) return forwarded;
		}
		return info?.ip;
	};

	const fetch = async (request: Request, info?: RequestInfo): Promise<Response> => {
		const url = new URL(request.url);
		const method = request.method.toUpperCase();
		const head = method === "HEAD";
		const pathMatches: Array<CompiledRoute & { params: Record<string, string> }> = [];
		for (const entry of compiled) {
			const match = entry.compiled.match(url.pathname);
			if (match) pathMatches.push({ ...entry, params: match.params });
		}
		const hit =
			pathMatches.find((m) => methodMatches(m.route.method, method)) ??
			(head ? pathMatches.find((m) => m.route.method === "GET") : undefined);
		const ip = clientIp(request, info);

		if (!hit) {
			const ctx = createContext(request, ip === undefined ? {} : { ip });
			const terminal =
				pathMatches.length > 0 && method !== "OPTIONS"
					? async () => {
							throw new HttpError(405, "Method Not Allowed", {
								headers: { allow: allowedMethods(pathMatches) },
							});
						}
					: async (c: Context) => notFound(c);
			const response = await guarded(compose(middleware, guarded(terminal)))(ctx);
			return finalize(response, ctx, head);
		}

		const { route } = hit;
		const ctx = createContext(request, {
			params: hit.params,
			route: { method: route.method, path: route.path, meta: route.meta, tags: route.tags },
			...(ip === undefined ? {} : { ip }),
		});
		const chain = compose(
			[...middleware, ...route.middleware],
			guarded((c) => executeRoute(route, c, env)),
		);
		const response = await guarded(chain)(ctx);
		return finalize(response, ctx, head);
	};

	let active: ReturnType<typeof Bun.serve> | undefined;

	return {
		fetch,
		routes,
		listen(port = options.port ?? 3000) {
			active?.stop(true);
			const server = Bun.serve({
				port,
				hostname: options.hostname ?? "0.0.0.0",
				fetch: (request, bunServer) =>
					fetch(request, { ip: bunServer.requestIP(request)?.address }),
			});
			active = server;
			const boundPort = server.port ?? port;
			return {
				port: boundPort,
				url: `http://localhost:${boundPort}`,
				stop: () => {
					server.stop(true);
					if (active === server) active = undefined;
				},
			};
		},
		stop() {
			active?.stop(true);
			active = undefined;
		},
	};
}
