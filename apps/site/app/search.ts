import type { SearchRecord } from "./site.ts";

/** How well `word` matches `text` (lower is better), or `undefined` for no match. */
function score(text: string, word: string): number | undefined {
	if (text === word) return 0;
	if (text.startsWith(word)) return 1;
	const at = text.indexOf(word);
	if (at === -1) return undefined;
	return /[\p{L}\p{N}]/u.test(text[at - 1] ?? "") ? 3 : 2;
}

/** Score of a match found only in a page summary: after every title match. */
const SUMMARY_SCORE = 4;

/** Best score of `record` for every word of the query, or `undefined` when a word is missing. */
function scoreRecord(record: SearchRecord, words: string[]): number | undefined {
	const title = record.title.toLowerCase();
	const page = record.page?.toLowerCase() ?? "";
	const text = record.text?.toLowerCase() ?? "";
	let best: number | undefined;
	for (const word of words) {
		const hit = score(title, word) ?? (text.includes(word) ? SUMMARY_SCORE : undefined);
		if (hit === undefined && !page.includes(word)) return undefined;
		if (hit !== undefined) best = Math.min(best ?? hit, hit);
	}
	return best;
}

/**
 * Rank search records for `query`. Every word must appear in the record's
 * title, its page title or its summary, and at least one in the title or
 * summary. Exact and prefix title matches come first, then word starts, then
 * substrings, then summary matches; pages come before headings, shorter
 * titles before longer ones.
 */
export function rank(records: readonly SearchRecord[], query: string, limit = 12): SearchRecord[] {
	const words = query.toLowerCase().split(/\s+/).filter(Boolean);
	if (words.length === 0) return [];
	const hits: { record: SearchRecord; score: number; order: number }[] = [];
	records.forEach((record, order) => {
		const best = scoreRecord(record, words);
		if (best !== undefined) hits.push({ record, score: best, order });
	});
	hits.sort(
		(a, b) =>
			a.score - b.score ||
			Number(Boolean(a.record.page)) - Number(Boolean(b.record.page)) ||
			a.record.title.length - b.record.title.length ||
			a.order - b.order,
	);
	return hits.slice(0, limit).map((hit) => hit.record);
}
