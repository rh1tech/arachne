import type { Infer, InferInput, StandardSchemaV1 } from "@arachne/schema";
import { DEFAULT_BODY_LIMIT, parseBody, queryToObject } from "./body.ts";
import { type Codec, negotiate } from "./codec.ts";
import type { Context, HttpMethod, Middleware, RouteDefinition, RouteMeta } from "./context.ts";
import {
	HttpError,
	type IssueLocation,
	toValidationIssues,
	type ValidationIssue,
	validationError,
} from "./errors.ts";

type SegmentParam<S extends string> = S extends `:${infer Name}`
	? Name
	: S extends `*${infer Name}`
		? Name extends ""
			? "rest"
			: Name
		: never;

type ParamNames<P extends string> = P extends `${infer Head}/${infer Tail}`
	? SegmentParam<Head> | ParamNames<Tail>
	: SegmentParam<P>;

/** Params object implied by a path pattern: `/users/:id` → `{ id: string }`. */
export type PathParamsOf<P extends string> = { [K in ParamNames<P>]: string };

/** Response schemas by status code (used for OpenAPI and optional response validation). */
export type ResponseMap = { [status: number]: StandardSchemaV1 | undefined };

type In<S, Fallback> = S extends StandardSchemaV1 ? InferInput<S> : Fallback;
type Out<S, Fallback> = S extends StandardSchemaV1 ? Infer<S> : Fallback;
type SuccessSchema<R> = R extends { 200: infer S } ? S : R extends { 201: infer S } ? S : undefined;

/** Phantom types a route carries for the typed client. */
export interface RouteTypes<Params = unknown, Query = unknown, Body = unknown, Output = unknown> {
	/** Path params the caller supplies. */
	params: Params;
	/** Query the caller supplies. */
	query: Query;
	/** Body the caller supplies. */
	body: Body;
	/** Parsed success response. */
	output: Output;
}

/** Options that expose a route as an MCP tool. */
export interface RouteMcpOptions {
	/** Tool name; default derived from `operationId` or method + path. */
	name?: string;
	/** Tool description; default `description` or `summary`. */
	description?: string;
}

/** Schemas attached to a route. */
export interface RouteSchemas {
	/** Validates path params (strings; use `s.coerce.*` for numbers). */
	params?: StandardSchemaV1 | undefined;
	/** Validates the query object (repeated keys are arrays). */
	query?: StandardSchemaV1 | undefined;
	/** Validates request headers (lower-cased names). */
	headers?: StandardSchemaV1 | undefined;
	/** Validates the decoded body (JSON, codec, or form → object). */
	body?: StandardSchemaV1 | undefined;
	/** Response schemas by status. */
	response?: ResponseMap | undefined;
}

/** Documentation and behaviour shared by {@link RouteConfig} and {@link Route}. */
export interface RouteDocs {
	/** One-line summary (OpenAPI `summary`). */
	summary?: string | undefined;
	/** Longer description, Markdown allowed. */
	description?: string | undefined;
	/** Stable operation id; default `<method>_<path>`. */
	operationId?: string | undefined;
	/** Marks the operation deprecated in docs. */
	deprecated?: boolean | undefined;
	/** Maximum body size for this route in bytes (overrides the server default). */
	bodyLimit?: number | undefined;
	/** `false` hides the route from OpenAPI; an object is merged into the operation. */
	openapi?: false | Record<string, unknown> | undefined;
	/** Expose the route as an MCP tool. */
	mcp?: boolean | RouteMcpOptions | undefined;
}

/**
 * Input to {@link route}. Schemas type the handler's `ctx`; without a
 * `params` schema, params are inferred from the path pattern.
 */
export interface RouteConfig<
	M extends HttpMethod,
	P extends string,
	PS extends StandardSchemaV1 | undefined,
	QS extends StandardSchemaV1 | undefined,
	BS extends StandardSchemaV1 | undefined,
	HS extends StandardSchemaV1 | undefined,
	R extends ResponseMap,
	Ret,
> extends RouteDocs {
	/** HTTP method. */
	method: M;
	/** Path pattern: `:name` segments and a trailing `*rest`. */
	path: P;
	/** Path params schema. */
	params?: PS;
	/** Query schema. */
	query?: QS;
	/** Body schema. */
	body?: BS;
	/** Headers schema. */
	headers?: HS;
	/** Response schemas by status code. */
	response?: R;
	/** OpenAPI tags (merged with group tags). */
	tags?: readonly string[];
	/** Metadata for middleware (e.g. `{ permission: "posts:update" }`). */
	meta?: RouteMeta;
	/** Middleware that runs only for this route, after global and group middleware. */
	middleware?: readonly Middleware[];
	/**
	 * Returns a `Response`, or a value serialised with the negotiated codec
	 * (`undefined` → 204). Throw `HttpError` for error statuses.
	 */
	handler: (
		ctx: Context<Out<PS, PathParamsOf<P>>, Out<QS, Record<string, unknown>>, Out<BS, undefined>>,
	) => Ret;
}

/** A route produced by {@link route} or {@link group}. */
export interface Route<
	M extends HttpMethod = HttpMethod,
	P extends string = string,
	T extends RouteTypes = RouteTypes,
> extends RouteDocs {
	/** Discriminator. */
	readonly kind: "route";
	/** HTTP method. */
	readonly method: M;
	/** Full path pattern (group prefixes applied). */
	readonly path: P;
	/** Validation schemas. */
	readonly schemas: RouteSchemas;
	/** OpenAPI tags. */
	readonly tags: readonly string[];
	/** Metadata for middleware. */
	readonly meta: RouteMeta;
	/** Route-level middleware (group middleware first). */
	readonly middleware: readonly Middleware[];
	/** The handler; the server runs it after validation. */
	handler(ctx: Context): unknown;
	/** Phantom types for the typed client; never set at runtime. */
	readonly "~types"?: T;
}

/** Any route, regardless of its types. */
export type AnyRoute = Route<HttpMethod, string, RouteTypes>;

/**
 * Declare a typed route. Params, query, headers and body are validated before
 * the handler runs; failures answer `422 validation_failed` with issue paths.
 *
 * @example
 * ```ts
 * const getUser = route({
 *   method: "GET",
 *   path: "/users/:id",
 *   params: s.object({ id: s.uuid() }),
 *   response: { 200: User },
 *   handler: async (ctx) => users.find(ctx.params.id) ?? notFound(),
 * });
 * ```
 */
export function route<
	const M extends HttpMethod,
	const P extends string,
	PS extends StandardSchemaV1 | undefined = undefined,
	QS extends StandardSchemaV1 | undefined = undefined,
	BS extends StandardSchemaV1 | undefined = undefined,
	HS extends StandardSchemaV1 | undefined = undefined,
	// biome-ignore lint/complexity/noBannedTypes: `{}` = "no response schemas declared"
	R extends ResponseMap = {},
	Ret = unknown,
>(
	config: RouteConfig<M, P, PS, QS, BS, HS, R, Ret>,
): Route<
	M,
	P,
	RouteTypes<
		In<PS, PathParamsOf<P>>,
		In<QS, Record<string, unknown>>,
		In<BS, undefined>,
		SuccessSchema<R> extends StandardSchemaV1
			? Infer<SuccessSchema<R>>
			: Exclude<Awaited<Ret>, Response>
	>
> {
	const { method, path, params, query, body, headers, response, tags, meta, middleware, handler } =
		config;
	return {
		kind: "route",
		method,
		path,
		schemas: { params, query, body, headers, response },
		tags: tags ?? [],
		meta: meta ?? {},
		middleware: middleware ?? [],
		summary: config.summary,
		description: config.description,
		operationId: config.operationId,
		deprecated: config.deprecated,
		bodyLimit: config.bodyLimit,
		openapi: config.openapi,
		mcp: config.mcp,
		handler: handler as Route["handler"],
	};
}

/** Wrap a legacy `{ method, path, handler }` object as a {@link Route}. */
export function toRoute(definition: AnyRoute | RouteDefinition): AnyRoute {
	if ("kind" in definition && definition.kind === "route") return definition;
	return route({
		method: definition.method,
		path: definition.path,
		handler: definition.handler as never,
	});
}

/** Options for {@link group}. */
export interface GroupOptions<Prefix extends string> {
	/** Path prefix, e.g. `/api/v1`. */
	prefix?: Prefix;
	/** Tags prepended to every child's tags. */
	tags?: readonly string[];
	/** Metadata merged under every child's metadata (children win). */
	meta?: RouteMeta;
	/** Middleware that runs before every child's own middleware. */
	middleware?: readonly Middleware[];
}

type Prefixed<Prefix extends string, R> =
	R extends Route<infer M, infer P, infer T> ? Route<M, `${Prefix}${P}`, T> : R;

type Flatten<Items extends readonly unknown[]> = Items extends readonly [infer Head, ...infer Tail]
	? Head extends readonly unknown[]
		? [...Flatten<Head>, ...Flatten<Tail>]
		: [Head, ...Flatten<Tail>]
	: Items extends readonly (infer Item)[]
		? Array<Item extends readonly (infer Inner)[] ? Inner : Item>
		: [];

// Mapped types keep tuple/array shape only over a bare type parameter (`T`).
type PrefixAll<Prefix extends string, T extends readonly unknown[]> = {
	[K in keyof T]: Prefixed<Prefix, T[K]>;
};

/** Result type of {@link group}: flattened children with the prefix applied. */
export type GroupRoutes<Prefix extends string, Items extends readonly unknown[]> = PrefixAll<
	Prefix,
	Flatten<Items>
>;

function joinPath(prefix: string, path: string): string {
	if (!prefix) return path;
	const trimmed = prefix.replace(/\/+$/, "");
	return path === "/" ? trimmed || "/" : `${trimmed}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Apply a prefix, tags, metadata and middleware to a list of routes. Nested
 * groups are flattened, so the result can go straight into `createServer`.
 */
export function group<
	const Prefix extends string = "",
	const Items extends readonly (AnyRoute | RouteDefinition | readonly AnyRoute[])[] = [],
>(options: GroupOptions<Prefix>, routes: Items): GroupRoutes<Prefix, Items> {
	const out: AnyRoute[] = [];
	for (const item of routes) {
		const children = Array.isArray(item) ? (item as readonly AnyRoute[]) : [item as AnyRoute];
		for (const child of children) {
			const r = toRoute(child);
			out.push({
				...r,
				path: joinPath(options.prefix ?? "", r.path),
				tags: [...(options.tags ?? []), ...r.tags.filter((t) => !options.tags?.includes(t))],
				meta: { ...options.meta, ...r.meta },
				middleware: [...(options.middleware ?? []), ...r.middleware],
			});
		}
	}
	return out as unknown as GroupRoutes<Prefix, Items>;
}

/** Server-wide settings the route runner needs. */
export interface RouteEnv {
	/** Extra codecs (JSON is built in). */
	codecs: readonly Codec[];
	/** Default body limit. */
	bodyLimit: number;
	/** Validate handler results against `response` schemas. */
	validateResponses: boolean;
}

async function check(
	schema: StandardSchemaV1 | undefined,
	value: unknown,
	location: IssueLocation,
	issues: ValidationIssue[],
): Promise<unknown> {
	if (!schema) return value;
	const result = await schema["~standard"].validate(value);
	if (result.issues) {
		issues.push(...toValidationIssues(location, result.issues));
		return undefined;
	}
	return result.value;
}

/** Validate the request, run the handler and serialise its result. */
export async function executeRoute(
	route: AnyRoute,
	ctx: Context,
	env: RouteEnv,
): Promise<Response> {
	const { schemas } = route;
	const issues: ValidationIssue[] = [];
	const mutable = ctx as Context<unknown, unknown, unknown>;
	mutable.params = await check(schemas.params, ctx.params, "params", issues);
	mutable.query = await check(schemas.query, queryToObject(ctx.searchParams), "query", issues);
	if (schemas.headers) {
		await check(schemas.headers, Object.fromEntries(ctx.request.headers), "headers", issues);
	}
	if (schemas.body) {
		const raw = await parseBody(ctx.request, {
			codecs: env.codecs,
			limit: route.bodyLimit ?? env.bodyLimit ?? DEFAULT_BODY_LIMIT,
		});
		mutable.body = await check(schemas.body, raw, "body", issues);
	}
	if (issues.length > 0) throw validationError(issues);
	const result = await route.handler(ctx);
	return serializeResult(result, ctx, route, env);
}

async function serializeResult(
	result: unknown,
	ctx: Context,
	route: AnyRoute,
	env: RouteEnv,
): Promise<Response> {
	if (result instanceof Response) return result;
	const status = ctx.statusCode ?? (result === undefined ? 204 : 200);
	if (result === undefined) return new Response(null, { status });
	let value: unknown = result;
	const schema = route.schemas.response?.[status];
	if (env.validateResponses && schema) {
		const checked = await schema["~standard"].validate(result);
		if (checked.issues) {
			throw new HttpError(500, "Response did not match its schema", {
				code: "invalid_response",
				issues: toValidationIssues("response", checked.issues),
			});
		}
		value = checked.value;
	}
	const codec = negotiate(env.codecs, ctx.request.headers.get("accept"));
	const type = codec.type === "application/json" ? "application/json; charset=utf-8" : codec.type;
	return new Response(codec.encode(value), { status, headers: { "content-type": type } });
}
