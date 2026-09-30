import { readdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { MatchedRoute } from "@arachne/router";
import { bunPlugin } from "@arachne/vite";
import type { ResolvedConfig } from "./config.ts";
import { writeEntries } from "./entries.ts";

/** A built file served under `<base>assets/`. */
export interface Asset {
	/** File contents. */
	bytes: Uint8Array<ArrayBuffer>;
	/** MIME type. */
	type: string;
}

/** Output of {@link buildClient}. */
export interface ClientBuild {
	/** Built files by URL path (`/assets/client-x1y2.js`). */
	files: Map<string, Asset>;
	/** URL of the client entry script, or `undefined` when hydration is off. */
	entry: string | undefined;
	/** URLs of built stylesheets. */
	styles: string[];
	/** Absolute paths of every input file (for watching). */
	inputs: string[];
}

/** Result of {@link SsrModule.render}. */
export interface RenderResult {
	/** App HTML. */
	html: string;
	/** Head HTML (title, meta, links). */
	head: string;
	/** Final title. */
	title: string | undefined;
	/** Loader data for the page. */
	data: unknown;
	/** Matched route id. */
	routeId: string | null;
	/** Whether a route matched (else the fallback rendered). */
	matched: boolean;
	/** Loader error, if any. */
	error: unknown;
}

/** The compiled SSR module generated from `app/routes.tsx`. */
export interface SsrModule {
	/** Page routes. */
	routeList: () => Array<{ id: string; pattern: string; dynamic: boolean }>;
	/** Build a URL from a pattern. */
	buildPath: (pattern: string, params: Record<string, string>) => string;
	/** Match an app path. */
	match: (url: string) => { id: string; pattern: string; params: Record<string, string> } | null;
	/** Render an app path. */
	render: (
		url: string,
		options: {
			load: (match: MatchedRoute) => unknown;
			titleTemplate?: string | undefined;
			defaultTitle?: string | undefined;
			base?: string | undefined;
		},
	) => Promise<RenderResult>;
}

/** Options for {@link buildClient}. */
export interface ClientBuildOptions {
	/** Development build: no minification, inline source maps. */
	dev: boolean;
}

const TYPES: Record<string, string> = {
	".js": "text/javascript;charset=utf-8",
	".css": "text/css;charset=utf-8",
	".map": "application/json",
	".json": "application/json",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".woff2": "font/woff2",
};

function typeOf(path: string): string {
	const ext = /\.[a-z0-9]+$/i.exec(path)?.[0]?.toLowerCase() ?? "";
	return TYPES[ext] ?? "application/octet-stream";
}

function failure(label: string, logs: readonly unknown[]): Error {
	return new Error(`${label} build failed:\n${logs.map(String).join("\n")}`);
}

/** Absolute input paths listed in a Bun metafile. */
function inputsOf(root: string, metafile: unknown): string[] {
	const inputs = (metafile as { inputs?: Record<string, unknown> } | undefined)?.inputs ?? {};
	return Object.keys(inputs).map((path) => resolve(root, path));
}

/**
 * Bundle the browser code (generated entry + `app/routes.tsx` + CSS) in
 * memory with content-hashed names and code splitting.
 */
export async function buildClient(
	config: ResolvedConfig,
	options: ClientBuildOptions,
): Promise<ClientBuild> {
	const { client } = await writeEntries(config);
	const hydrate = config.hydrate && config.routesFile !== undefined;
	const entrypoints = [...(hydrate ? [client] : []), ...config.styles];
	const files = new Map<string, Asset>();
	if (entrypoints.length === 0) return { files, entry: undefined, styles: [], inputs: [] };
	const result = await Bun.build({
		entrypoints,
		root: config.root,
		target: "browser",
		format: "esm",
		splitting: true,
		minify: !options.dev,
		sourcemap: options.dev ? "inline" : "none",
		publicPath: `${config.base}assets/`,
		naming: {
			entry: "[name]-[hash].[ext]",
			chunk: "chunks/[name]-[hash].[ext]",
			asset: "[name]-[hash].[ext]",
		},
		define: { "process.env.NODE_ENV": JSON.stringify(options.dev ? "development" : "production") },
		plugins: [bunPlugin({ target: "dom", hydratable: true, dev: options.dev })],
		metafile: true,
	} as Parameters<typeof Bun.build>[0]);
	if (!result.success) throw failure("client", result.logs);
	let entry: string | undefined;
	const styles: string[] = [];
	for (const output of result.outputs) {
		const name = output.path.replace(/^\.\//, "").split("\\").join("/");
		const url = `${config.base}assets/${name}`;
		files.set(url, { bytes: new Uint8Array(await output.arrayBuffer()), type: typeOf(name) });
		// Bun reports CSS entries as "asset"; link every top-level stylesheet
		// (style entries and CSS imported by components), not per-chunk CSS.
		if (name.endsWith(".css") && !name.startsWith("chunks/")) styles.push(url);
		else if (output.kind === "entry-point" && name.endsWith(".js")) entry = url;
	}
	return {
		files,
		entry,
		styles,
		inputs: inputsOf(config.root, (result as { metafile?: unknown }).metafile),
	};
}

/** Output of {@link buildSsr}. */
export interface SsrBuild {
	/** The loaded module. */
	module: SsrModule;
	/** Absolute paths of every input file. */
	inputs: string[];
	/** The built file. */
	file: string;
}

let ssrBuilds = 0;

/**
 * Compile `app/routes.tsx` for the server and import it. Each build gets a
 * fresh file so re-importing picks up changes in development.
 */
export async function buildSsr(
	config: ResolvedConfig,
	options: ClientBuildOptions,
): Promise<SsrBuild> {
	const { ssr } = await writeEntries(config);
	ssrBuilds += 1;
	const outdir = join(config.cacheDir, "ssr", `${Date.now().toString(36)}-${ssrBuilds}`);
	const result = await Bun.build({
		entrypoints: [ssr],
		root: config.cacheDir,
		outdir,
		target: "bun",
		format: "esm",
		plugins: [bunPlugin({ target: "ssr", hydratable: true, dev: options.dev })],
		// Resolved from node_modules at runtime: one signals instance per process.
		external: ["@arachne/signals", "alien-signals"],
		metafile: true,
	} as Parameters<typeof Bun.build>[0]);
	if (!result.success) throw failure("ssr", result.logs);
	const file = result.outputs.find((output) => output.kind === "entry-point")?.path;
	if (!file) throw new Error("ssr build produced no entry");
	const module = (await import(pathToFileURL(file).href)) as SsrModule;
	return {
		module,
		inputs: inputsOf(config.cacheDir, (result as { metafile?: unknown }).metafile),
		file,
	};
}

/** Remove SSR builds except the one in use. */
export async function pruneSsrBuilds(config: ResolvedConfig, keep: string): Promise<void> {
	const dir = join(config.cacheDir, "ssr");
	const keepDir = relative(dir, dirname(keep)).split(/[\\/]/)[0];
	for (const entry of await readdir(dir).catch(() => [])) {
		if (entry !== keepDir) await rm(join(dir, entry), { recursive: true, force: true });
	}
}
