/**
 * Typed HTTP client inferred from server routes: no code generation, and
 * safe for browser bundles (type-only imports from the server).
 *
 * @example
 * ```ts
 * import { createClient } from "@arachne/server/client";
 * import type { routes } from "../server/routes.ts";
 *
 * const api = createClient<typeof routes>({ baseUrl: "/api" });
 * const user = await api.get("/users/:id", { params: { id } }); // typed
 * ```
 *
 * @module
 */

import type { HttpMethod } from "./context.ts";
import type { ErrorBody, ValidationIssue } from "./errors.ts";
import type { Route, RouteTypes } from "./route.ts";

type ClientMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Item<Routes> = Routes extends readonly (infer R)[] ? R : never;
type RoutesFor<Routes, M extends ClientMethod> = Extract<
	Item<Routes>,
	Route<M | "*", string, RouteTypes>
>;
type Match<Routes, M extends ClientMethod, P> = Extract<RoutesFor<Routes, M>, { path: P }>;
type TypesOf<R> = R extends Route<HttpMethod, string, infer T> ? T : never;

// biome-ignore lint/complexity/noBannedTypes: `{}` tests "has no required keys"
type Empty = {};

/** Per-call options, typed from the route's schemas. */
export type RequestOptions<T extends RouteTypes> = (Empty extends T["params"]
	? { params?: T["params"] }
	: { params: T["params"] }) &
	(Empty extends T["query"] ? { query?: T["query"] } : { query: T["query"] }) &
	([T["body"]] extends [undefined] ? { body?: undefined } : { body: T["body"] }) & {
		/** Extra request headers. */
		headers?: HeadersInit;
		/** Abort the request. */
		signal?: AbortSignal;
	};

type Args<T extends RouteTypes> =
	Empty extends RequestOptions<T> ? [options?: RequestOptions<T>] : [options: RequestOptions<T>];

type Caller<Routes, M extends ClientMethod> = <P extends RoutesFor<Routes, M>["path"]>(
	path: P,
	...args: Args<TypesOf<Match<Routes, M, P>>>
) => Promise<TypesOf<Match<Routes, M, P>>["output"]>;

/** Client with one typed method per HTTP verb. */
export interface ApiClient<Routes> {
	/** `GET` a route. */
	get: Caller<Routes, "GET">;
	/** `POST` to a route. */
	post: Caller<Routes, "POST">;
	/** `PUT` to a route. */
	put: Caller<Routes, "PUT">;
	/** `PATCH` a route. */
	patch: Caller<Routes, "PATCH">;
	/** `DELETE` a route. */
	delete: Caller<Routes, "DELETE">;
}

/** Options for {@link createClient}. */
export interface ClientOptions {
	/** Base URL prepended to route paths (`https://api.example.com`, `/api`). Default `""`. */
	baseUrl?: string;
	/** Fetch implementation (e.g. `app.fetch` in tests). Default global `fetch`. */
	fetch?: (request: Request) => Promise<Response>;
	/** Headers sent with every request (auth tokens, CSRF). */
	headers?: HeadersInit | (() => HeadersInit);
	/** Cookie mode for browsers. Default `same-origin`. */
	credentials?: RequestCredentials;
}

/** Thrown for non-2xx responses; mirrors the server's error envelope. */
export class ApiError extends Error {
	/** HTTP status. */
	readonly status: number;
	/** Machine-readable code (`validation_failed`, `not_found`, …). */
	readonly code: string;
	/** Validation issues, if any. */
	readonly issues: ValidationIssue[];
	/** Extra details from the server. */
	readonly details: unknown;

	constructor(status: number, body: Partial<ErrorBody["error"]>) {
		super(body.message ?? `HTTP ${status}`);
		this.name = "ApiError";
		this.status = status;
		this.code = body.code ?? "error";
		this.issues = body.issues ?? [];
		this.details = body.details;
	}
}

function buildPath(path: string, params: Record<string, unknown> = {}): string {
	return path
		.replace(/\*([A-Za-z0-9_]*)/g, (_, name: string) => String(params[name || "rest"] ?? ""))
		.replace(/:([A-Za-z0-9_]+)/g, (_, name: string) => {
			const value = params[name];
			if (value === undefined) throw new TypeError(`missing path param "${name}"`);
			return encodeURIComponent(String(value));
		});
}

function scalar(value: unknown): string {
	return value instanceof Date ? value.toISOString() : String(value);
}

function buildQuery(query: Record<string, unknown> = {}): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value === undefined || value === null) continue;
		for (const item of Array.isArray(value) ? value : [value]) params.append(key, scalar(item));
	}
	const text = params.toString();
	return text ? `?${text}` : "";
}

function containsBlob(value: unknown): boolean {
	if (value instanceof Blob) return true;
	if (value && typeof value === "object") return Object.values(value).some(containsBlob);
	return false;
}

function appendForm(form: FormData, key: string, value: unknown): void {
	if (value === undefined || value === null) return;
	if (value instanceof Blob) form.append(key, value);
	else if (Array.isArray(value)) {
		for (const [i, item] of value.entries()) appendForm(form, `${key}[${i}]`, item);
	} else if (typeof value === "object" && !(value instanceof Date)) {
		for (const [child, item] of Object.entries(value)) appendForm(form, `${key}[${child}]`, item);
	} else form.append(key, scalar(value));
}

function encodeBody(body: unknown): { body: BodyInit | undefined; type: string | undefined } {
	if (body === undefined) return { body: undefined, type: undefined };
	if (containsBlob(body) && body && typeof body === "object") {
		const form = new FormData();
		for (const [key, value] of Object.entries(body)) appendForm(form, key, value);
		return { body: form, type: undefined };
	}
	return { body: JSON.stringify(body), type: "application/json" };
}

async function readResponse(response: Response): Promise<unknown> {
	if (response.status === 204) return undefined;
	const type = response.headers.get("content-type") ?? "";
	return type.includes("json") ? response.json() : response.text();
}

/** Create a typed client for a route list (`typeof routes`). */
export function createClient<Routes extends readonly unknown[]>(
	options: ClientOptions = {},
): ApiClient<Routes> {
	const doFetch = options.fetch ?? ((request: Request) => fetch(request));
	const call =
		(method: ClientMethod) =>
		async (path: string, opts: Record<string, unknown> = {}): Promise<unknown> => {
			const url = `${options.baseUrl ?? ""}${buildPath(path, opts["params"] as Record<string, unknown>)}${buildQuery(opts["query"] as Record<string, unknown>)}`;
			const headers = new Headers(
				typeof options.headers === "function" ? options.headers() : options.headers,
			);
			for (const [key, value] of new Headers(opts["headers"] as HeadersInit | undefined)) {
				headers.set(key, value);
			}
			const encoded = encodeBody(opts["body"]);
			if (encoded.type) headers.set("content-type", encoded.type);
			if (!headers.has("accept")) headers.set("accept", "application/json");
			const absolute = /^https?:/.test(url)
				? url
				: new URL(url, globalThis.location?.href ?? "http://localhost").href;
			const response = await doFetch(
				new Request(absolute, {
					method,
					headers,
					credentials: options.credentials ?? "same-origin",
					...(encoded.body === undefined ? {} : { body: encoded.body }),
					...(opts["signal"] ? { signal: opts["signal"] as AbortSignal } : {}),
				}),
			);
			const data = await readResponse(response);
			if (!response.ok) {
				const error = (data as Partial<ErrorBody> | undefined)?.error ?? {};
				throw new ApiError(response.status, typeof error === "object" ? error : {});
			}
			return data;
		};
	return {
		get: call("GET"),
		post: call("POST"),
		put: call("PUT"),
		patch: call("PATCH"),
		delete: call("DELETE"),
	} as unknown as ApiClient<Routes>;
}
