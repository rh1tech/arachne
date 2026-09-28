import type { PathParams } from "@arachne/router";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "*";

export interface Context {
	request: Request;
	url: URL;
	params: PathParams;
	query: URLSearchParams;
	/** Parse JSON body (throws on invalid JSON). */
	json: <T = unknown>() => Promise<T>;
}

export type Handler = (ctx: Context) => Response | Promise<Response>;

export type Next = () => Promise<Response>;

export type Middleware = (ctx: Context, next: Next) => Response | Promise<Response>;

export interface RouteDefinition {
	method: HttpMethod;
	path: string;
	handler: Handler;
}

export function json(data: unknown, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	if (!headers.has("content-type")) headers.set("content-type", "application/json; charset=utf-8");
	return new Response(JSON.stringify(data), { ...init, headers });
}

export function text(body: string, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	if (!headers.has("content-type")) headers.set("content-type", "text/plain; charset=utf-8");
	return new Response(body, { ...init, headers });
}

export function html(body: string, init: ResponseInit = {}): Response {
	const headers = new Headers(init.headers);
	if (!headers.has("content-type")) headers.set("content-type", "text/html; charset=utf-8");
	return new Response(body, { ...init, headers });
}

export function createContext(request: Request, params: PathParams = {}): Context {
	const url = new URL(request.url);
	return {
		request,
		url,
		params,
		query: url.searchParams,
		json: async <T = unknown>() => (await request.json()) as T,
	};
}
