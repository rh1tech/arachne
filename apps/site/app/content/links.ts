import { posix } from "node:path";

/** Where a rewritten link points. */
export interface ResolvedLink {
	/** The `href` to render. */
	href: string;
	/** Leaves the site (another origin). */
	external?: boolean;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Rewrite a link found in a repository Markdown file for the site.
 *
 * - `https:`/`mailto:` links and same-page `#anchors` are kept.
 * - Relative links are resolved against `from` (the source file, relative to
 *   the repository root). A link to a file or directory with a page (for a
 *   directory: its `README.md`) becomes that page's path, anchor kept.
 * - Other repository files link to `sourceUrl` (`…/blob/<branch>/<path>`) when given.
 *
 * Returns `null` when the target has no page and there is no `sourceUrl`
 * (or it lies outside the repository): render the text without a link.
 */
export function resolveLink(
	href: string,
	from: string,
	pages: ReadonlyMap<string, string>,
	sourceUrl?: string,
	branch = "main",
): ResolvedLink | null {
	if (href.startsWith("#")) return { href };
	if (SCHEME.test(href) || href.startsWith("//")) return { href, external: true };

	const hashAt = href.indexOf("#");
	const path = hashAt === -1 ? href : href.slice(0, hashAt);
	const hash = hashAt === -1 ? "" : href.slice(hashAt);
	const target = posix.normalize(posix.join(posix.dirname(from), path)).replace(/\/+$/, "");
	if (target === ".." || target.startsWith("../")) return null;

	const page = pages.get(target) ?? pages.get(posix.join(target, "README.md"));
	if (page) return { href: page + hash };
	if (!sourceUrl) return null;
	return {
		href: `${sourceUrl.replace(/\/+$/, "")}/blob/${branch}/${target}${hash}`,
		external: true,
	};
}
