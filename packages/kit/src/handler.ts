import {
	type AnyRoute,
	type ArachneServer,
	apiDocs,
	type Context,
	createServer,
	HttpError,
	html,
	json,
	type Middleware,
	mcpRoute,
	route,
	securityHeaders,
	serveStatic,
	toRoute,
} from "@arachnejs/server";
import { buildIdOf } from "./build-id.ts";
import type { ClientBuild, SsrModule } from "./bundle.ts";
import type { ResolvedConfig } from "./config.ts";
import { renderDocument } from "./document.ts";
import type { ServerParts } from "./server-def.ts";

/** Client assets: a dev/in-memory build, or a directory of built files. */
export type ClientAssets =
	| { kind: "memory"; build: ClientBuild }
	| { kind: "dir"; dir: string; entry: string | undefined; styles: string[] };

/** Everything the handler serves. Swappable at runtime (dev rebuilds). */
export interface HandlerParts {
	/** Resolved configuration. */
	config: ResolvedConfig;
	/** Compiled pages, if the app has any. */
	ssr: SsrModule | undefined;
	/** Browser assets. */
	client: ClientAssets | undefined;
	/** `app/server.ts` parts. */
	server: ServerParts;
	/** Development mode (errors shown, reload client injected). */
	dev: boolean;
	/** Inline script added to every page (the dev reload client). */
	inlineScript?: string | undefined;
}

function statusOf(error: unknown): number {
	return error instanceof HttpError ? error.status : 500;
}

function memoryAssets(get: () => HandlerParts): Middleware {
	return (ctx, next) => {
		const { client, dev } = get();
		if (client?.kind !== "memory") return next();
		const asset = client.build.files.get(ctx.url.pathname);
		if (!asset) return next();
		// Built names carry a content hash, so outside dev they never change.
		const cacheControl = dev ? "no-cache" : "public, max-age=31536000, immutable";
		return new Response(asset.bytes, {
			headers: { "content-type": asset.type, "cache-control": cacheControl },
		});
	};
}

/**
 * Build the app's HTTP server from its parts. `parts()` is read per
 * request, so dev rebuilds take effect without recreating the server.
 */
export function createHandler(parts: () => HandlerParts): ArachneServer {
	const initial = parts();
	const { config } = initial;
	const base = config.base;
	const appPath = (pathname: string): string | undefined => {
		if (base === "/") return pathname;
		const prefix = base.slice(0, -1);
		if (pathname !== prefix && !pathname.startsWith(base)) return undefined;
		return pathname.slice(prefix.length) || "/";
	};
	const loaderFor = (id: string) => parts().server.loaders?.[id];
	const runLoader = (id: string, params: Record<string, string>, ctx: Context) =>
		loaderFor(id)?.({ params, url: ctx.url, ctx });

	const renderPage = async (ctx: Context): Promise<Response> => {
		const current = parts();
		const method = ctx.request.method;
		const path = appPath(ctx.url.pathname);
		if ((method !== "GET" && method !== "HEAD") || !current.ssr || path === undefined) {
			throw new HttpError(404, `Not Found: ${ctx.url.pathname}`, { code: "not_found" });
		}
		const result = await current.ssr.render(`${path}${ctx.url.search}`, {
			load: (match) => runLoader(match.id, match.params, ctx),
			titleTemplate: config.titleTemplate,
			defaultTitle: config.defaultTitle,
			base: base === "/" ? undefined : base.slice(0, -1),
		});
		const status = !result.matched
			? 404
			: result.error !== undefined
				? statusOf(result.error)
				: 200;
		if (status >= 500) console.error("[arachne] loader failed", result.error);
		const client = current.client;
		const entry = client?.kind === "memory" ? client.build.entry : client?.entry;
		const styles = client?.kind === "memory" ? client.build.styles : (client?.styles ?? []);
		const page = (config.document ?? renderDocument)({
			lang: config.lang,
			head: result.head + config.head,
			styles,
			scripts: entry ? [entry] : [],
			boot: {
				data: result.data ?? null,
				base,
				mode: config.mode,
				build: buildIdOf({ entry, styles }),
				titleTemplate: config.titleTemplate,
				loaders: Object.keys(current.server.loaders ?? {}),
				...(result.matched ? {} : { notFound: true }),
				// The client hydrates the same error page the server rendered.
				...(result.error !== undefined
					? {
							error: {
								status,
								message:
									result.error instanceof Error ? result.error.message : String(result.error),
							},
						}
					: {}),
			},
			body: result.html,
			nonce: ctx.nonce,
			inlineScript: current.inlineScript,
		});
		return html(page, { status, headers: { "cache-control": "no-cache" } });
	};

	const dataHandler = async (ctx: Context, rest: string) => {
		const ssr = parts().ssr;
		const matched = ssr?.match(`/${rest}${ctx.url.search}`);
		if (!matched) throw new HttpError(404, "No such page", { code: "not_found" });
		const data = await runLoader(matched.id, matched.params, ctx);
		const client = parts().client;
		const build = buildIdOf(
			client?.kind === "memory"
				? client.build
				: { entry: client?.entry, styles: client?.styles ?? [] },
		);
		return json({ data: data ?? null, build }, { headers: { "cache-control": "no-cache" } });
	};
	const dataPrefix = `${base}__arachne/data`;
	const dataRoutes: AnyRoute[] = [
		route({
			method: "GET",
			path: dataPrefix,
			openapi: false,
			handler: (ctx) => dataHandler(ctx, ""),
		}),
		route({
			method: "GET",
			path: `${dataPrefix}/*path`,
			openapi: false,
			handler: (ctx) => dataHandler(ctx, String(ctx.params["path"] ?? "")),
		}),
	];

	const apiRoutes = (initial.server.routes ?? []).map(toRoute);
	const docs = initial.server.openapi
		? apiDocs({ info: initial.server.openapi, routes: apiRoutes })
		: [];
	const mcp = config.mcp
		? [mcpRoute({ ...config.mcp, routes: apiRoutes, dispatch: (request) => server.fetch(request) })]
		: [];
	const security =
		config.server.securityHeaders === false
			? []
			: [securityHeaders(config.server.securityHeaders ?? {})];
	const clientDir =
		initial.client?.kind === "dir" && initial.client.dir !== config.publicDir
			? initial.client.dir
			: undefined;

	const server: ArachneServer = createServer({
		middleware: [
			...security,
			memoryAssets(parts),
			...(clientDir ? [serveStatic({ root: clientDir, prefix: base })] : []),
			serveStatic({ root: config.publicDir, prefix: base }),
			...(initial.server.middleware ?? []),
		],
		routes: [...apiRoutes, ...docs, ...mcp, ...(initial.ssr ? dataRoutes : [])],
		fallback: renderPage,
		bodyLimit: config.server.bodyLimit,
		trustProxy: config.server.trustProxy,
		exposeErrors: initial.dev,
		validateResponses: initial.dev,
		onError: (error) => console.error("[arachne]", error),
	});
	return server;
}
