import { existsSync } from "node:fs";
import { join } from "node:path";
import { createServer, serveStatic } from "@arachne/server";
import { normalizeBase } from "./config.ts";

/** Options for {@link preview}. */
export interface PreviewOptions {
	/** Built static site (`dist`). */
	dir: string;
	/** Port (`0` = any free port). Default 4173. */
	port?: number;
	/** Base path the site was built for. Default `/`. */
	base?: string;
}

/**
 * Serve a static build the way static hosts do: files, directory
 * `index.html`, and `404.html` (status 404) for everything else.
 */
export function preview(options: PreviewOptions): { url: string; port: number; stop: () => void } {
	const base = normalizeBase(options.base);
	const notFound = join(options.dir, "404.html");
	const server = createServer({
		middleware: [serveStatic({ root: options.dir, prefix: base, maxAge: 0 })],
		fallback: () =>
			existsSync(notFound)
				? new Response(Bun.file(notFound), {
						status: 404,
						headers: { "content-type": "text/html;charset=utf-8" },
					})
				: new Response("Not Found", { status: 404 }),
	});
	return server.listen(options.port ?? 4173);
}
