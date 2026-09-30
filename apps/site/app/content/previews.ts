import { catalog } from "../../../playground/catalog.generated.ts";

/** How a component's example behaves in the preview. */
export interface PreviewInfo {
	/** Overlays and other examples that open from a trigger. */
	interactive: boolean;
	/** The example reports callbacks (shown in an event log under it). */
	logsActions: boolean;
}

/**
 * Components with a runnable example, from the UI catalog that also
 * generates `docs/ui/components/*.md` (`bun run ui:docs`), so the names match
 * the headings there.
 */
export const PREVIEWS: ReadonlyMap<string, PreviewInfo> = new Map(
	catalog.map((entry) => [
		entry.name,
		{ interactive: entry.interactive, logsActions: entry.logsActions },
	]),
);

const HEADING = /^(#{2,4}) (.+?)\s*$/;
const FENCE = /^```/;

/** Line ranges `[start, end)` of fenced code blocks. */
function fences(lines: string[]): [number, number][] {
	const out: [number, number][] = [];
	let open = -1;
	lines.forEach((line, i) => {
		if (!FENCE.test(line)) return;
		if (open === -1) open = i;
		else {
			out.push([open, i + 1]);
			open = -1;
		}
	});
	return out;
}

/**
 * In a component reference page, give every component with an example a
 * `@@preview:Name@@` marker and move its example code up next to it, right
 * after the component's summary (the props and types follow). A section is a
 * component when its heading is a known name and its own text (before any
 * sub-heading) ends with a `tsx` example.
 */
export function insertPreviews(markdown: string, previews: ReadonlyMap<string, unknown>): string {
	const lines = markdown.split("\n");
	const blocks = fences(lines);
	const inFence = (i: number) => blocks.some(([start, end]) => i >= start && i < end);
	const headings = lines.flatMap((line, i) => (!inFence(i) && HEADING.test(line) ? [i] : []));

	const out: string[] = lines.slice(0, headings[0] ?? lines.length);
	headings.forEach((at, index) => {
		const end = headings[index + 1] ?? lines.length;
		const name = HEADING.exec(lines[at] ?? "")?.[2] ?? "";
		const section = lines.slice(at, end);
		const example = previews.has(name)
			? [...blocks].reverse().find(([s, e]) => s > at && e <= end && lines[s]?.startsWith("```tsx"))
			: undefined;
		if (!example) {
			out.push(...section);
			return;
		}
		const [start, stop] = example;
		const code = lines.slice(start, stop);
		const body = section.filter((_, i) => at + i < start || at + i >= stop);
		// The summary: the first paragraph after the heading.
		let cut = 1;
		while (cut < body.length && body[cut]?.trim() === "") cut += 1;
		while (cut < body.length && body[cut]?.trim() !== "") cut += 1;
		out.push(...body.slice(0, cut), "", `@@preview:${name}@@`, "", ...code, ...body.slice(cut));
	});
	return out.join("\n");
}

/** Replace rendered `@@preview:Name@@` paragraphs with preview placeholders. */
export function previewSlots(html: string, previews: ReadonlyMap<string, PreviewInfo>): string {
	return html.replace(/<p>@@preview:([\w.-]+)@@<\/p>/g, (_match, name: string) => {
		const info = previews.get(name);
		const flags = `${info?.logsActions ? " data-logs" : ""}${info?.interactive ? " data-interactive" : ""}`;
		return (
			`<div class="ui-preview" data-example="${name}"${flags}>` +
			`<p class="ui-preview-status">Loading the live example…</p></div>`
		);
	});
}
