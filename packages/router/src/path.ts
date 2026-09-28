export type PathParams = Record<string, string>;

export interface PathMatch {
	params: PathParams;
	pathname: string;
}

export interface CompiledPath {
	pattern: string;
	/** Match pathname (no query). Returns null if no match. */
	match: (pathname: string) => PathMatch | null;
	/** Build a path from params. Missing params throw. */
	build: (params?: PathParams) => string;
}

function normalizePathname(pathname: string): string {
	if (!pathname) return "/";
	const withSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
	if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
	return withSlash;
}

/**
 * Compile a path pattern.
 * - `:name` — one segment
 * - `*name` — rest (including slashes), must be last
 */
export function compilePath(pattern: string): CompiledPath {
	const normalized = normalizePathname(pattern);
	const segments = normalized.split("/").filter(Boolean);
	const keys: Array<{ name: string; rest: boolean }> = [];
	const parts: string[] = [];

	for (let i = 0; i < segments.length; i += 1) {
		const segment = segments[i] as string;
		if (segment.startsWith("*")) {
			if (i !== segments.length - 1) {
				throw new Error(`catch-all "*${segment.slice(1)}" must be the last segment`);
			}
			const name = segment.slice(1) || "rest";
			keys.push({ name, rest: true });
			parts.push(`(?<${name}>.*)`);
			continue;
		}
		if (segment.startsWith(":")) {
			const name = segment.slice(1);
			if (!name) throw new Error("empty param name");
			keys.push({ name, rest: false });
			parts.push(`(?<${name}>[^/]+)`);
			continue;
		}
		parts.push(segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
	}

	const source =
		parts.length === 0 ? "^/$" : `^/${parts.join("/")}${keys.some((k) => k.rest) ? "" : ""}$`;
	const re = new RegExp(source);

	return {
		pattern: normalized,
		match(pathname: string): PathMatch | null {
			const path = normalizePathname(pathname);
			const m = re.exec(path);
			if (!m) return null;
			const params: PathParams = {};
			for (const key of keys) {
				const value = m.groups?.[key.name];
				params[key.name] = value ?? "";
			}
			return { params, pathname: path };
		},
		build(params: PathParams = {}): string {
			const out: string[] = [];
			for (const segment of segments) {
				if (segment.startsWith("*")) {
					const name = segment.slice(1) || "rest";
					const value = params[name];
					if (value === undefined) throw new Error(`missing path param "${name}"`);
					out.push(value.replace(/^\//, ""));
					continue;
				}
				if (segment.startsWith(":")) {
					const name = segment.slice(1);
					const value = params[name];
					if (value === undefined) throw new Error(`missing path param "${name}"`);
					out.push(encodeURIComponent(value));
					continue;
				}
				out.push(segment);
			}
			return out.length === 0 ? "/" : `/${out.join("/")}`;
		},
	};
}

export function parseLocation(url: string): { pathname: string; search: string; hash: string } {
	const hashIndex = url.indexOf("#");
	const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
	const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
	const searchIndex = withoutHash.indexOf("?");
	const search = searchIndex >= 0 ? withoutHash.slice(searchIndex) : "";
	const pathname = normalizePathname(
		searchIndex >= 0 ? withoutHash.slice(0, searchIndex) : withoutHash,
	);
	return { pathname, search, hash };
}

export { normalizePathname };
