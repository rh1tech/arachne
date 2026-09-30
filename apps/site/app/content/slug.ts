/**
 * Heading anchors computed the way GitHub computes them, so `README.md#anchor`
 * links written for the repository keep working on the site.
 */
export function slugify(text: string): string {
	return text
		.trim()
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s_-]/gu, "")
		.replace(/\s/g, "-");
}

/** A slugger that de-duplicates repeated headings within one document (`x`, `x-1`, …). */
export function createSlugger(): (text: string) => string {
	const seen = new Map<string, number>();
	return (text) => {
		const base = slugify(text);
		const count = seen.get(base) ?? 0;
		seen.set(base, count + 1);
		return count === 0 ? base : `${base}-${count}`;
	};
}
