import {
	buildClient,
	buildSsr,
	type ClientBuild,
	pruneSsrBuilds,
	type SsrModule,
} from "./bundle.ts";
import { type KitConfig, type ResolvedConfig, resolveConfig } from "./config.ts";
import { type ClientAssets, createHandler, type HandlerParts } from "./handler.ts";
import { loadServer, resolveServer, type ServerDefinition } from "./server-def.ts";

/** A running (or runnable) app. */
export interface AppServer {
	/** Resolved configuration. */
	readonly config: ResolvedConfig;
	/** Handle one request (tests, other runtimes). */
	fetch: (request: Request) => Promise<Response>;
	/** Rebuild client and SSR bundles (dev); the server keeps running. */
	rebuild: () => Promise<{ inputs: string[] }>;
	/** Input files of the current bundles (for watching). */
	readonly inputs: () => string[];
	/** Start listening. */
	listen: (port?: number) => { port: number; url: string; stop: () => void };
	/** Stop and run the server's `dispose`. */
	close: () => Promise<void>;
}

/** Options for {@link createAppServer}. */
export interface CreateAppServerOptions {
	/** Project root. */
	root: string;
	/** Development mode. */
	dev?: boolean;
	/** Config overrides (on top of `arachne.config.ts`). */
	config?: KitConfig;
	/** Inline script for every page (dev reload client). */
	inlineScript?: string;
}

/** Options for {@link createProductionServer} (used by the generated server bundle). */
export interface ProductionServerOptions {
	/** Configuration from the bundled `arachne.config.ts`. */
	config: KitConfig;
	/** Directory holding the built client assets and public files. */
	clientDir: string;
	/** Asset manifest written by the build. */
	manifest: { entry: string | undefined; styles: string[] };
	/** The compiled SSR module, if the app has pages. */
	ssr: SsrModule | undefined;
	/** The `app/server.ts` definition (evaluated once at boot). */
	server: ServerDefinition;
}

function wrap(
	config: ResolvedConfig,
	get: () => HandlerParts,
	rebuild: AppServer["rebuild"],
	inputs: () => string[],
	dispose: () => Promise<void>,
): AppServer {
	const handler = createHandler(get);
	let active: ReturnType<typeof Bun.serve> | undefined;
	return {
		config,
		fetch: (request) => handler.fetch(request),
		rebuild,
		inputs,
		listen(port = config.port) {
			active = Bun.serve({
				port,
				fetch: (request, server) =>
					handler.fetch(request, { ip: server.requestIP(request)?.address }),
			});
			const bound = active.port ?? port;
			return { port: bound, url: `http://localhost:${bound}`, stop: () => active?.stop(true) };
		},
		async close() {
			active?.stop(true);
			await dispose();
		},
	};
}

/**
 * Build (in memory) and serve an app from source: client bundle, SSR module
 * and `app/server.ts`. Used by `arachne dev` and by tests.
 */
export async function createAppServer(options: CreateAppServerOptions): Promise<AppServer> {
	const dev = options.dev ?? false;
	const config = await resolveConfig(options.root, options.config);
	let client: ClientBuild | undefined;
	let ssr: { module: SsrModule; inputs: string[]; file: string } | undefined;
	const rebuild = async () => {
		const [nextClient, nextSsr] = await Promise.all([
			config.routesFile || config.styles.length ? buildClient(config, { dev }) : undefined,
			config.routesFile ? buildSsr(config, { dev }) : undefined,
		]);
		client = nextClient;
		ssr = nextSsr;
		if (ssr) await pruneSsrBuilds(config, ssr.file);
		return { inputs: inputs() };
	};
	const inputs = () => [...new Set([...(client?.inputs ?? []), ...(ssr?.inputs ?? [])])];
	await rebuild();
	const server = await loadServer(config, dev);
	const parts = (): HandlerParts => ({
		config,
		ssr: ssr?.module,
		client: client ? ({ kind: "memory", build: client } satisfies ClientAssets) : undefined,
		server,
		dev,
		inlineScript: options.inlineScript,
	});
	return wrap(config, parts, rebuild, inputs, async () => {
		await server.dispose?.();
	});
}

/** Serve a built app (the generated `dist/server/index.js` calls this). */
export async function createProductionServer(options: ProductionServerOptions): Promise<AppServer> {
	const config = await resolveConfig(options.clientDir, {
		...options.config,
		publicDir: options.clientDir,
		appDir: "__none__",
	});
	const resolved: ResolvedConfig = {
		...config,
		mode: options.config.mode ?? (options.ssr ? "server" : "api"),
	};
	const server = await resolveServer(options.server, {
		dev: false,
		mode: resolved.mode,
		config: resolved,
	});
	const parts = (): HandlerParts => ({
		config: resolved,
		ssr: options.ssr,
		client: {
			kind: "dir",
			dir: options.clientDir,
			entry: options.manifest.entry,
			styles: options.manifest.styles,
		},
		server,
		dev: false,
	});
	return wrap(
		resolved,
		parts,
		async () => ({ inputs: [] }),
		() => [],
		async () => {
			await server.dispose?.();
		},
	);
}
