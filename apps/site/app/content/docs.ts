import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ENTRIES, findEntry, SECTIONS } from "../nav.ts";
import { type DocData, type HomeData, type SearchRecord, SITE } from "../site.ts";
import { EXAMPLES } from "./examples.ts";
import { createHighlight } from "./highlight.ts";
import { escapeHtml, type RenderedDoc, renderMarkdown } from "./markdown.ts";
import { insertPreviews, PREVIEWS, previewSlots } from "./previews.ts";

/** Component reference pages: each component gets a live preview. */
const hasPreviews = (source: string) => /^docs\/ui\/components\/(?!README\.md$)/.test(source);

/** The monorepo root (sources are read from here at build time). */
export const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..");

const PAGES: ReadonlyMap<string, string> = new Map(
	ENTRIES.map((entry) => [entry.source, entry.path]),
);

let highlighter: ReturnType<typeof createHighlight> | undefined;
const rendered = new Map<string, Promise<RenderedDoc>>();

function render(source: string): Promise<RenderedDoc> {
	let doc = rendered.get(source);
	if (!doc) {
		highlighter ??= createHighlight();
		doc = Promise.all([readFile(join(REPO_ROOT, source), "utf8"), highlighter]).then(
			([markdown, highlight]) => {
				const previews = hasPreviews(source);
				const doc = renderMarkdown(previews ? insertPreviews(markdown, PREVIEWS) : markdown, {
					from: source,
					pages: PAGES,
					sourceUrl: SITE.sourceUrl,
					branch: SITE.branch,
					highlight,
				});
				return previews ? { ...doc, html: previewSlots(doc.html, PREVIEWS) } : doc;
			},
		);
		rendered.set(source, doc);
	}
	return doc;
}

const neighbour = (index: number) => {
	const entry = ENTRIES[index];
	return entry && { title: entry.title, path: entry.path };
};

/** Render the documentation page at `path`, or `undefined` when there is none. */
export async function loadDoc(path: string): Promise<DocData | undefined> {
	const entry = findEntry(path);
	if (!entry) return undefined;
	const doc = await render(entry.source);
	const index = ENTRIES.indexOf(entry);
	const section = SECTIONS.find((s) => s.entries.includes(entry));
	return {
		path: entry.path,
		title: doc.title || entry.title,
		summary: doc.summary,
		html: doc.html,
		headings: doc.headings,
		previews: doc.html.includes('class="ui-preview"'),
		source: entry.source,
		section: section?.title ?? "",
		prev: neighbour(index - 1),
		next: neighbour(index + 1),
	};
}

function commit(): string | undefined {
	const result = Bun.spawnSync(["git", "rev-parse", "--short", "HEAD"], { cwd: REPO_ROOT });
	return result.success ? result.stdout.toString().trim() : undefined;
}

async function description(source: string): Promise<string> {
	const file = join(REPO_ROOT, source.replace(/README\.md$/, "package.json"));
	const pkg = (await Bun.file(file).json()) as { description?: string };
	return pkg.description ?? "";
}

/** Home page data: version, build stamp and the package index. */
export async function loadHome(): Promise<HomeData> {
	const kit = (await Bun.file(join(REPO_ROOT, "packages/kit/package.json")).json()) as {
		version: string;
	};
	const groups = await Promise.all(
		SECTIONS.map(async (section) => ({
			title: section.title,
			packages: await Promise.all(
				section.entries
					.filter((entry) => entry.source.startsWith("packages/"))
					.map(async (entry) => ({
						name: entry.title,
						description: await description(entry.source),
						path: entry.path,
					})),
			),
		})),
	);
	highlighter ??= createHighlight();
	const highlight = await highlighter;
	return {
		version: kit.version,
		commit: commit(),
		pages: ENTRIES.length + 1,
		examples: EXAMPLES.map((example) => ({
			file: example.file,
			html: highlight(example.code, example.lang) ?? escapeHtml(example.code),
		})),
		built: new Date().toISOString().slice(0, 10),
		groups: groups.filter((group) => group.packages.length > 0),
	};
}

/** Search records for every page and its `h2`/`h3` headings. */
export async function searchIndex(): Promise<SearchRecord[]> {
	const records: SearchRecord[] = [];
	for (const section of SECTIONS) {
		for (const entry of section.entries) {
			const doc = await render(entry.source);
			const page = doc.title || entry.title;
			records.push({ title: page, section: section.title, url: entry.path, text: doc.summary });
			for (const heading of doc.headings) {
				records.push({
					title: heading.text,
					page,
					section: section.title,
					url: `${entry.path}#${heading.id}`,
				});
			}
		}
	}
	return records;
}
