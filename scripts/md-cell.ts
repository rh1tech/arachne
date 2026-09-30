/**
 * Make text safe for a GFM table cell: `|` is escaped everywhere (GFM splits
 * cells on it even inside code spans), `<` only outside code spans, where it
 * could start an HTML tag. Inside backticks an entity would show literally.
 */
export function escapeCell(text: string): string {
	return text
		.split(/(`[^`]*`)/)
		.map((part, i) => (i % 2 === 1 ? part : part.replace(/</g, "&lt;")))
		.join("")
		.replace(/\|/g, "\\|");
}

/**
 * `text` as a code span in a GFM table cell: only `|` needs escaping (an
 * entity such as `&lt;` would show literally inside backticks).
 */
export function codeCell(text: string): string {
	return `\`${text.replace(/\|/g, "\\|")}\``;
}
