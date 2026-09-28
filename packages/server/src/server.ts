import { type CompiledPath, compilePath } from "@arachne/router";
import {
	createContext,
	type Handler,
	type HttpMethod,
	type Middleware,
	type RouteDefinition,
	text,
} from "./context.ts";

interface CompiledRoute {
	method: HttpMethod;
	path: string;
	compiled: CompiledPath;
	handler: Handler;
}

export interface CreateServerOptions {
	routes?: RouteDefinition[] | undefined;
	middleware?: Middleware[] | undefined;
	/** Called when no route matches. Default: 404 text. */
	fallback?: Handler | undefined;
	port?: number | undefined;
	hostname?: string | undefined;
}

export interface ArachneServer {
	readonly fetch: (request: Request) => Promise<Response>;
	listen: (port?: number) => { port: number; url: string; stop: () => void };
	stop: () => void;
}

function methodMatches(routeMethod: HttpMethod, requestMethod: string): boolean {
	if (routeMethod === "*") return true;
	return routeMethod === requestMethod.toUpperCase();
}

function compose(middleware: Middleware[], terminal: Handler): Handler {
	return (ctx) => {
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

export function createServer(options: CreateServerOptions = {}): ArachneServer {
	const compiled: CompiledRoute[] = (options.routes ?? []).map((route) => ({
		method: route.method,
		path: route.path,
		compiled: compilePath(route.path),
		handler: route.handler,
	}));
	const middleware = options.middleware ?? [];
	const fallback: Handler =
		options.fallback ?? ((ctx) => text(`Not Found: ${ctx.url.pathname}`, { status: 404 }));

	const fetch = async (request: Request): Promise<Response> => {
		const url = new URL(request.url);
		for (const route of compiled) {
			if (!methodMatches(route.method, request.method)) continue;
			const match = route.compiled.match(url.pathname);
			if (!match) continue;
			const ctx = createContext(request, match.params);
			return compose(middleware, route.handler)(ctx);
		}
		const ctx = createContext(request);
		return compose(middleware, fallback)(ctx);
	};

	let active: ReturnType<typeof Bun.serve> | undefined;

	return {
		fetch,
		listen(port = options.port ?? 3000) {
			if (active) active.stop(true);
			const requestedPort = port ?? 3000;
			active = Bun.serve({
				port: requestedPort,
				hostname: options.hostname ?? "0.0.0.0",
				fetch,
			});
			const boundPort = active.port ?? requestedPort;
			const url = `http://localhost:${boundPort}`;
			return {
				port: boundPort,
				url,
				stop: () => {
					active?.stop(true);
					active = undefined;
				},
			};
		},
		stop() {
			active?.stop(true);
			active = undefined;
		},
	};
}
