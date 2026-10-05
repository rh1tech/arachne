import { resolveLink } from "./links.ts";
import { createSlugger } from "./slug.ts";

/** An `h2`/`h3` of a document, for the "On this page" outline and search. */
export interface Heading {
	/** 2 or 3. */
	level: number;
	/** Anchor id (GitHub-compatible). */
	id: string;
	/** Plain text. */
	text: string;
}

/** A rendered Markdown document. */
export interface RenderedDoc {
	/** Text of the first `h1` (removed from `html`). Empty when there is none. */
	title: string;
	/** Plain text of the first paragraph, for `<meta name="description">`. */
	summary: string;
	/** Body HTML. */
	html: string;
	/** `h2`/`h3` headings in order. */
	headings: Heading[];
}

/**
 * Syntax highlighter hook: returns highlighted HTML for the inside of
 * `<code>`, or `undefined` to fall back to escaped text.
 */
export type Highlight = (code: string, lang?: string) => string | undefined;

/** Options for {@link renderMarkdown}. */
export interface RenderOptions {
	/** Source file, relative to the repository root (resolves relative links). */
	from: string;
	/** Source file → site path, for every file that has a page. */
	pages: ReadonlyMap<string, string>;
	/** Repository browser URL for files without a page (see `resolveLink`). */
	sourceUrl?: string | undefined;
	/** Branch for repository links. Default `main`. */
	branch?: string | undefined;
	/** Code block highlighter. */
	highlight?: Highlight | undefined;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

/** Decode the entities Bun's Markdown renderer emits. */
export function decodeEntities(html: string): string {
	return html.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (match, name: string) => {
		if (name.startsWith("#x") || name.startsWith("#X"))
			return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
		if (name.startsWith("#")) return String.fromCodePoint(Number(name.slice(1)));
		return ENTITIES[name.toLowerCase()] ?? match;
	});
}

/** Escape text for HTML content and attributes. */
export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;");
}

/** Announced after external links, which open in a new tab. */
const NEW_TAB = '<span class="sr-only"> (opens in a new tab)</span>';

const textOf = (html: string) =>
	decodeEntities(html.replaceAll(NEW_TAB, "").replace(/<[^>]*>/g, ""))
		.replace(/\s+/g, " ")
		.trim();

/**
 * Render repository Markdown (GFM) for the site. Inline HTML is shown as
 * text, HTML comments are dropped, links are rewritten with `resolveLink`,
 * headings get GitHub-style ids, and code blocks go through `highlight`.
 */
export function renderMarkdown(markdown: string, options: RenderOptions): RenderedDoc {
	const source = markdown.replace(/<!--[\s\S]*?-->\n?/g, "");
	let html = Bun.markdown.html(source, { noHtmlBlocks: true, noHtmlSpans: true });

	let title = "";
	const headings: Heading[] = [];
	const slug = createSlugger();

	html = html.replace(
		/<pre><code(?: class="language-([^"]+)")?>([\s\S]*?)<\/code><\/pre>/g,
		(_m, lang, body) => codeBlock(decodeEntities(body), lang, options.highlight),
	);
	html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>\n?/g, (_m, digit: string, inner: string) => {
		const level = Number(digit);
		const text = textOf(inner);
		if (level === 1 && !title) {
			title = text;
			return "";
		}
		const id = slug(text);
		if (level === 2 || level === 3) headings.push({ level, id, text });
		const anchor = `<a class="anchor" href="#${id}" aria-label="Link to this section">#</a>`;
		return `<h${level} id="${id}">${inner} ${anchor}</h${level}>\n`;
	});
	html = html.replace(
		/<a href="([^"]*)"((?: title="[^"]*")?)>([\s\S]*?)<\/a>/g,
		(match, href, attrs, inner) => {
			if (match.includes('class="anchor"')) return match;
			const link = resolveLink(
				decodeEntities(href),
				options.from,
				options.pages,
				options.sourceUrl,
				options.branch,
			);
			if (!link) return `<span class="xref">${inner}</span>`;
			if (!link.external) return `<a href="${escapeHtml(link.href)}"${attrs}>${inner}</a>`;
			// Other sites open in a new tab; screen readers are told so.
			return (
				`<a href="${escapeHtml(link.href)}"${attrs} target="_blank" rel="external noopener noreferrer">` +
				`${inner}${NEW_TAB}</a>`
			);
		},
	);
	html = html
		.replaceAll("<table>", '<div class="table-scroll" tabindex="0"><table>')
		.replaceAll("</table>", "</table></div>");

	const paragraph = /<p>([\s\S]*?)<\/p>/.exec(html);
	return {
		title,
		summary: paragraph ? textOf(paragraph[1] ?? "") : "",
		html: html.trim(),
		headings,
	};
}

function codeBlock(code: string, lang: string | undefined, highlight?: Highlight): string {
	const body = highlight?.(code, lang) ?? escapeHtml(code);
	const label = lang ? ` data-lang="${escapeHtml(lang)}"` : "";
	return (
		`<div class="code"${label}><button type="button" class="copy" data-copy>Copy</button>` +
		`<pre tabindex="0"><code>${body}</code></pre></div>`
	);
}
