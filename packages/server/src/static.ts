import { stat } from "node:fs/promises";
import { join, normalize, resolve, sep } from "node:path";
import type { Middleware } from "./context.ts";

/** Options for {@link serveStatic}. */
export interface ServeStaticOptions {
	/** Directory to serve. */
	root: string;
	/** URL prefix the directory is mounted at. Default `/`. */
	prefix?: string;
	/** `Cache-Control` max-age in seconds. Default `0` (revalidate). */
	maxAge?: number;
	/**
	 * Files matching this get `max-age=31536000, immutable` (content-hashed
	 * build output). Default: names containing `-[hash].` of 8+ chars.
	 */
	immutable?: RegExp;
	/** File served for directories. Default `index.html`. */
	index?: string;
	/** Serve dotfiles (`.env`, `.git`). Default `false`. */
	dotfiles?: boolean;
}

const HASHED = /[-.][A-Za-z0-9_]{8,}\.[a-z0-9]+$/;

/** Resolve a URL path inside `root`, or `undefined` if it would escape. */
export function safeJoin(root: string, urlPath: string): string | undefined {
	let decoded: string;
	try {
		decoded = decodeURIComponent(urlPath);
	} catch {
		return undefined;
	}
	if (decoded.includes("\0")) return undefined;
	const base = resolve(root);
	const target = resolve(join(base, normalize(decoded)));
	return target === base || target.startsWith(base + sep) ? target : undefined;
}

async function fileAt(path: string, index: string): Promise<string | undefined> {
	try {
		const info = await stat(path);
		if (info.isFile()) return path;
		if (info.isDirectory()) {
			const indexPath = join(path, index);
			return (await stat(indexPath)).isFile() ? indexPath : undefined;
		}
	} catch {
		return undefined;
	}
	return undefined;
}

/**
 * Serve files from a directory for `GET`/`HEAD`, with `ETag`/304 and cache
 * headers. Requests that don't match a file fall through to routes.
 */
export function serveStatic(options: ServeStaticOptions): Middleware {
	const prefix = (options.prefix ?? "/").replace(/\/?$/, "/");
	const index = options.index ?? "index.html";
	const immutable = options.immutable ?? HASHED;
	return async (ctx, next) => {
		const method = ctx.request.method;
		if (method !== "GET" && method !== "HEAD") return next();
		const pathname = ctx.url.pathname;
		if (!`${pathname}/`.startsWith(prefix) && pathname !== prefix.slice(0, -1)) return next();
		const relative = pathname.slice(prefix.length - 1);
		if (!options.dotfiles && /(^|\/)\.[^/]/.test(decodeURIComponentSafe(relative))) return next();
		const target = safeJoin(options.root, relative);
		const path = target && (await fileAt(target, index));
		if (!path) return next();

		const file = Bun.file(path);
		const etag = `W/"${file.size.toString(16)}-${Math.floor(file.lastModified).toString(16)}"`;
		const cacheControl = immutable.test(path)
			? "public, max-age=31536000, immutable"
			: `public, max-age=${options.maxAge ?? 0}`;
		const headers = { etag, "cache-control": cacheControl };
		if (ctx.request.headers.get("if-none-match") === etag) {
			return new Response(null, { status: 304, headers });
		}
		return new Response(method === "HEAD" ? null : file, {
			headers: { ...headers, "content-type": file.type, "content-length": String(file.size) },
		});
	};
}

function decodeURIComponentSafe(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}
