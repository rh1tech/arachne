import { pathToFileURL } from "node:url";
import type { DbQueries, TableDef } from "@arachnejs/db";
import type { PathParams } from "@arachnejs/router/path";
import type {
	AnyRoute,
	Context,
	Middleware,
	OpenApiInfo,
	RouteDefinition,
} from "@arachnejs/server";
import type { AppMode, ResolvedConfig } from "./config.ts";

/** Arguments a loader receives. `ctx` is absent while prerendering. */
export interface LoaderArgs {
	/** Path params of the matched route. */
	params: PathParams;
	/** Full request URL (while prerendering: the page URL on `http://localhost`). */
	url: URL;
	/** The request context (auth state in `ctx.state`), when serving. */
	ctx?: Context | undefined;
}

/** Loads a route's data on the server (or at build time for static sites). Throw `HttpError` for 404s. */
export type Loader = (args: LoaderArgs) => unknown;

/** Lists the params to prerender for a dynamic route. */
export type PathsFn = () => PathParams[] | Promise<PathParams[]>;

/** What `app/server.ts` provides. */
export interface ServerParts {
	/** API routes (`route()` / `group()` / plain objects). */
	routes?: ReadonlyArray<AnyRoute | RouteDefinition>;
	/** Middleware run before routes and pages (auth, logging, …). */
	middleware?: readonly Middleware[];
	/** Loaders by route id (the full pattern, e.g. `/blog/:slug`, unless the route sets `id`). */
	loaders?: Record<string, Loader>;
	/** Params to prerender for dynamic routes (static builds), by route id. */
	paths?: Record<string, PathsFn>;
	/** Serve `/openapi.json` and `/docs` for the API routes. */
	openapi?: OpenApiInfo | false;
	/** Database for `arachne migrate`. */
	db?: DbQueries;
	/** Table definitions for `arachne migrate generate`. */
	tables?: Record<string, TableDef>;
	/** Called when the server stops (close databases, flush queues). */
	dispose?: () => void | Promise<void>;
}

/** Context passed to a server definition factory. */
export interface ServerEnv {
	/** Running under `arachne dev`. */
	dev: boolean;
	/** Build mode. */
	mode: AppMode;
	/** Resolved configuration. */
	config: ResolvedConfig;
}

/** `app/server.ts` default export: parts, or a (possibly async) factory that builds them once at boot. */
export type ServerDefinition =
	| ServerParts
	| ((env: ServerEnv) => ServerParts | Promise<ServerParts>);

/**
 * Type helper for `app/server.ts`.
 *
 * @example
 * ```ts
 * export default defineServer(async ({ dev }) => {
 *   const db = createDb({ dialect: sqlite({ path: "app.db" }), tables });
 *   const auth = createAuth({ db, baseUrl: process.env.BASE_URL ?? "http://localhost:3000" });
 *   await auth.setup();
 *   return { middleware: [auth.middleware()], routes: [...auth.routes(), ...api], loaders };
 * });
 * ```
 */
export function defineServer(definition: ServerDefinition): ServerDefinition {
	return definition;
}

/** Evaluate a server definition. */
export async function resolveServer(
	definition: ServerDefinition | undefined,
	env: ServerEnv,
): Promise<ServerParts> {
	if (!definition) return {};
	return typeof definition === "function" ? await definition(env) : definition;
}

/** Import and evaluate `app/server.ts` (empty parts when there is none). */
export async function loadServer(
	config: ResolvedConfig,
	dev: boolean,
	bust = "",
): Promise<ServerParts> {
	if (!config.serverFile) return {};
	const url = pathToFileURL(config.serverFile).href + (bust ? `?v=${bust}` : "");
	const mod = (await import(url)) as { default?: ServerDefinition; server?: ServerDefinition };
	return resolveServer(mod.default ?? mod.server, { dev, mode: config.mode, config });
}
