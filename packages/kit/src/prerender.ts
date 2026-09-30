import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildIdOf } from "./build-id.ts";
import type { ClientBuild, SsrModule } from "./bundle.ts";
import type { ResolvedConfig } from "./config.ts";
import { renderDocument, serializeJson } from "./document.ts";
import type { ServerParts } from "./server-def.ts";

/** One prerendered page. */
export interface PrerenderedPage {
	/** App path (base removed). */
	url: string;
	/** Written HTML file. */
	file: string;
	/** HTTP status the page represents (200, or 404 for the fallback). */
	status: number;
}

/** Output of {@link prerender}. */
export interface PrerenderResult {
	/** Pages written (the 404 page excluded). */
	pages: PrerenderedPage[];
	/** Output directory. */
	outDir: string;
	/** Dynamic routes skipped because `paths` had no entry for them. */
	skipped: string[];
}

function htmlFile(outDir: string, url: string): string {
	return url === "/" ? join(outDir, "index.html") : join(outDir, url, "index.html");
}

function dataFile(outDir: string, url: string): string {
	return join(outDir, "_data", `${url === "/" ? "/index" : url}.json`);
}

async function write(file: string, contents: string | Uint8Array): Promise<void> {
	await mkdir(dirname(file), { recursive: true });
	await writeFile(file, contents);
}

async function urlsFor(ssr: SsrModule, server: ServerParts, skipped: string[]): Promise<string[]> {
	const urls: string[] = [];
	for (const route of ssr.routeList()) {
		if (!route.dynamic) {
			urls.push(route.pattern);
			continue;
		}
		const paths = server.paths?.[route.id];
		if (!paths) {
			skipped.push(route.pattern);
			continue;
		}
		for (const params of await paths()) urls.push(ssr.buildPath(route.pattern, params));
	}
	return [...new Set(urls)];
}

function sitemap(config: ResolvedConfig, urls: string[]): string {
	const origin = config.siteUrl ?? "";
	const base = config.base.slice(0, -1);
	const entries = urls
		.map((url) => `<url><loc>${origin}${base}${url === "/" && base ? "/" : url}</loc></url>`)
		.join("");
	return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`;
}

/**
 * Render every page to `outDir`: `<path>/index.html`, loader data as
 * `_data/<path>.json` (for client navigations), `404.html`, `sitemap.xml`
 * (with `siteUrl`), built assets and the public directory.
 */
export async function prerender(
	config: ResolvedConfig,
	ssr: SsrModule,
	server: ServerParts,
	client: ClientBuild,
	outDir: string,
): Promise<PrerenderResult> {
	await rm(outDir, { recursive: true, force: true });
	await mkdir(outDir, { recursive: true });
	if (existsSync(config.publicDir)) await cp(config.publicDir, outDir, { recursive: true });
	for (const [url, asset] of client.files)
		await write(join(outDir, url.slice(config.base.length)), asset.bytes);

	const skipped: string[] = [];
	const urls = await urlsFor(ssr, server, skipped);
	const loaders = server.loaders ?? {};
	const base = config.base === "/" ? undefined : config.base.slice(0, -1);
	const build = buildIdOf(client);
	const page = async (url: string, data: unknown) => {
		const result = await ssr.render(url, {
			load: () => data,
			titleTemplate: config.titleTemplate,
			defaultTitle: config.defaultTitle,
			base,
		});
		const html = (config.document ?? renderDocument)({
			lang: config.lang,
			head: result.head + config.head,
			styles: client.styles,
			scripts: client.entry ? [client.entry] : [],
			boot: {
				data: result.data ?? null,
				base: config.base,
				mode: "static",
				build,
				titleTemplate: config.titleTemplate,
				loaders: Object.keys(loaders),
				...(result.matched ? {} : { notFound: true }),
			},
			body: result.html,
		});
		return { html, result };
	};

	const pages: PrerenderedPage[] = [];
	for (const url of urls) {
		const matched = ssr.match(url);
		const loader = matched ? loaders[matched.id] : undefined;
		let data: unknown;
		try {
			data = loader
				? await loader({ params: matched?.params ?? {}, url: new URL(url, "http://localhost") })
				: undefined;
		} catch (error) {
			throw new Error(`prerender ${url}: loader failed: ${(error as Error).message}`, {
				cause: error,
			});
		}
		const { html } = await page(url, data);
		const file = htmlFile(outDir, url);
		await write(file, html);
		if (loader) await write(dataFile(outDir, url), serializeJson({ data: data ?? null, build }));
		pages.push({ url, file, status: 200 });
	}
	const notFound = await page("/__arachne-not-found__", undefined);
	await write(join(outDir, "404.html"), notFound.html);
	if (config.siteUrl) await write(join(outDir, "sitemap.xml"), sitemap(config, urls));
	return { pages, outDir, skipped };
}
