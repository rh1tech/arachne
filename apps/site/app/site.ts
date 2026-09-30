/** Site-wide settings shared by the build and the browser. */
export const SITE = {
	/** Public origin (sitemap, canonical and Open Graph URLs). */
	url: "https://arachne.rh1.tech",
	/**
	 * The repository (GitHub `…/blob/main/<path>` URLs are built from it for
	 * links to files that have no page on the site). Unset: such links render
	 * as plain text.
	 */
	sourceUrl: "https://github.com/rh1tech/arachne" as string | undefined,
	/** The repository's default branch (for source links). */
	branch: "master",
} as const;

/** Page data for a documentation page (built by `loadDoc`). */
export interface DocData {
	/** Site path. */
	path: string;
	/** Page title (the source's first `h1`). */
	title: string;
	/** First paragraph as plain text. */
	summary: string;
	/** Rendered body. */
	html: string;
	/** `h2`/`h3` outline. */
	headings: { level: number; id: string; text: string }[];
	/** The body has live UI examples (`.ui-preview[data-example]` placeholders). */
	previews: boolean;
	/** Source file, relative to the repository root. */
	source: string;
	/** Sidebar section title. */
	section: string;
	/** Previous page in reading order. */
	prev?: { title: string; path: string } | undefined;
	/** Next page in reading order. */
	next?: { title: string; path: string } | undefined;
}

/** One package on the home page index. */
export interface PackageInfo {
	/** Name without the scope (`kit`). */
	name: string;
	/** `package.json` description. */
	description: string;
	/** Documentation page. */
	path: string;
}

/** Page data for the home page. */
export interface HomeData {
	/** `@arachnejs/kit` version. */
	version: string;
	/** Short commit hash the site was built from, when known. */
	commit?: string | undefined;
	/** Build date, `YYYY-MM-DD`. */
	built: string;
	/** Number of pages on the site. */
	pages: number;
	/** Highlighted example files. */
	examples: { file: string; html: string }[];
	/** Packages grouped as in the sidebar. */
	groups: { title: string; packages: PackageInfo[] }[];
}

/** One search index record: a page, or a heading within it. */
export interface SearchRecord {
	/** Page title, or heading text. */
	title: string;
	/** Page title for heading records. */
	page?: string;
	/** Sidebar section. */
	section: string;
	/** Target URL (with `#anchor` for headings). */
	url: string;
	/** The page's first paragraph (page records only). */
	text?: string;
}
