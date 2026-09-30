import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { SecurityHeadersOptions } from "@arachne/server";

/**
 * What the app is built as:
 * - `static`: pre-rendered HTML + client routing, no server (`dist/` goes to any static host)
 * - `server`: SSR pages, API routes and client routing on a Bun server
 * - `api`: API routes only (no pages)
 */
export type AppMode = "static" | "server" | "api";

/** Pieces the HTML document is assembled from (see `document`). */
export interface DocumentParts {
	/** `<html lang>`. */
	lang: string;
	/** Head HTML: title, meta and link tags (already escaped). */
	head: string;
	/** Stylesheet URLs. */
	styles: string[];
	/** Module script URLs (empty when hydration is off). */
	scripts: string[];
	/** Boot data for the client (serialised safely by the kit). */
	boot: unknown;
	/** Server-rendered app HTML. */
	body: string;
	/** CSP nonce for inline scripts. */
	nonce?: string | undefined;
	/** Extra inline script (the dev reload client). */
	inlineScript?: string | undefined;
}

/** `arachne.config.ts` contents. Every field is optional. */
export interface KitConfig {
	/** Build mode. Default: `api` without `app/routes.tsx`, `server` with `app/server.ts`, else `static`. */
	mode?: AppMode;
	/** URL path the app is served under (`/docs/`). Default `/`. */
	base?: string;
	/** Directory with `routes.tsx` and `server.ts`. Default `app`. */
	appDir?: string;
	/** Files copied to the output as-is. Default `public`. */
	publicDir?: string;
	/** Build output. Default `dist`. */
	outDir?: string;
	/** CSS entry files (bundled, minified, hashed). */
	styles?: string[];
	/** Ship the client bundle and hydrate. `false` builds zero-JS pages. Default `true`. */
	hydrate?: boolean;
	/** Title template (`"%s · Site"`) and default title. */
	title?: { template?: string; default?: string };
	/** `<html lang>`. Default `en`. */
	lang?: string;
	/** Extra HTML for every page's `<head>` (favicon, fonts, analytics). `%base%` is replaced with the base path. */
	head?: string;
	/** Public origin, used for the sitemap (`https://example.com`). */
	siteUrl?: string;
	/** Port for `dev` and `start`. Default 3000 (env `PORT` wins). */
	port?: number;
	/** Replace the HTML document template. */
	document?: (parts: DocumentParts) => string;
	/** Server options. */
	server?: {
		/** Request body limit in bytes. */
		bodyLimit?: number;
		/** Trust `X-Forwarded-For` (behind a proxy). */
		trustProxy?: boolean;
		/** Security headers; `false` turns them off. Default on (CSP with nonces). */
		securityHeaders?: SecurityHeadersOptions | false;
	};
	/** Serve an MCP endpoint exposing routes marked `mcp: true`. */
	mcp?: boolean | { path?: string; name?: string; version?: string };
	/** Migrations directory for `arachne migrate`. Default `migrations`. */
	migrations?: { dir?: string };
}

/** A fully resolved configuration with absolute paths. */
export interface ResolvedConfig {
	/** Project root. */
	root: string;
	/** Build mode. */
	mode: AppMode;
	/** Base path with leading and trailing slash. */
	base: string;
	/** Absolute app directory. */
	appDir: string;
	/** Absolute public directory. */
	publicDir: string;
	/** Absolute output directory. */
	outDir: string;
	/** Absolute CSS entries. */
	styles: string[];
	/** Hydrate on the client. */
	hydrate: boolean;
	/** Title template. */
	titleTemplate: string | undefined;
	/** Title when no route sets one. */
	defaultTitle: string | undefined;
	/** `<html lang>`. */
	lang: string;
	/** Extra head HTML (base substituted). */
	head: string;
	/** Public origin for the sitemap. */
	siteUrl: string | undefined;
	/** Port. */
	port: number;
	/** Custom document template. */
	document: ((parts: DocumentParts) => string) | undefined;
	/** `app/routes.tsx` (or `.ts`), if present. */
	routesFile: string | undefined;
	/** `app/server.ts`, if present. */
	serverFile: string | undefined;
	/** Working directory for generated files (`.arachne`). */
	cacheDir: string;
	/** Server options. */
	server: NonNullable<KitConfig["server"]>;
	/** MCP endpoint settings, or `undefined` when off. */
	mcp: { path: string; name: string; version: string } | undefined;
	/** Absolute migrations directory. */
	migrationsDir: string;
}

/** Type helper for `arachne.config.ts`. */
export function defineConfig(config: KitConfig): KitConfig {
	return config;
}

/** Page entry candidates in the app directory, in lookup order. */
export const ROUTES_FILES = ["routes.tsx", "routes.ts", "routes.jsx"];

/** Server entry candidates in the app directory, in lookup order. */
export const SERVER_FILES = ["server.ts", "server.tsx", "server.js"];

function firstExisting(dir: string, names: string[]): string | undefined {
	for (const name of names) {
		const path = join(dir, name);
		if (existsSync(path)) return path;
	}
	return undefined;
}

/** Normalise a base path to `/x/` form. */
export function normalizeBase(base: string | undefined): string {
	const trimmed = (base ?? "/").replace(/^\/+|\/+$/g, "");
	return trimmed ? `/${trimmed}/` : "/";
}

/** Load `arachne.config.ts` (if any), apply `overrides`, and resolve paths and defaults. */
export async function resolveConfig(
	root: string,
	overrides: KitConfig = {},
): Promise<ResolvedConfig> {
	const absoluteRoot = resolve(root);
	const configFile = firstExisting(absoluteRoot, ["arachne.config.ts", "arachne.config.js"]);
	const fromFile = configFile
		? (((await import(pathToFileURL(configFile).href)) as { default?: KitConfig }).default ?? {})
		: {};
	const config: KitConfig = { ...fromFile, ...overrides };
	const at = (path: string) => (isAbsolute(path) ? path : join(absoluteRoot, path));
	const appDir = at(config.appDir ?? "app");
	const routesFile = firstExisting(appDir, ROUTES_FILES);
	const serverFile = firstExisting(appDir, SERVER_FILES);
	const mode: AppMode = config.mode ?? (!routesFile ? "api" : serverFile ? "server" : "static");
	const mcp = config.mcp
		? {
				path: typeof config.mcp === "object" ? (config.mcp.path ?? "/mcp") : "/mcp",
				name: typeof config.mcp === "object" ? (config.mcp.name ?? "arachne-app") : "arachne-app",
				version: typeof config.mcp === "object" ? (config.mcp.version ?? "0.0.0") : "0.0.0",
			}
		: undefined;
	return {
		root: absoluteRoot,
		mode,
		base: normalizeBase(config.base),
		appDir,
		publicDir: at(config.publicDir ?? "public"),
		outDir: at(config.outDir ?? "dist"),
		styles: (config.styles ?? []).map(at),
		hydrate: config.hydrate ?? true,
		titleTemplate: config.title?.template,
		defaultTitle: config.title?.default,
		lang: config.lang ?? "en",
		head: (config.head ?? "").replaceAll("%base%", normalizeBase(config.base)),
		siteUrl: config.siteUrl?.replace(/\/$/, ""),
		port: Number(process.env["PORT"] ?? config.port ?? 3000),
		document: config.document,
		routesFile,
		serverFile,
		cacheDir: join(absoluteRoot, ".arachne"),
		server: config.server ?? {},
		mcp,
		migrationsDir: at(config.migrations?.dir ?? "migrations"),
	};
}
