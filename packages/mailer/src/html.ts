/** HTML that is already safe; {@link mailHtml} inserts it without escaping. */
export class SafeHtml {
	/** The markup. */
	readonly value: string;

	constructor(value: string) {
		this.value = value;
	}

	/** The markup, so `SafeHtml` works wherever a string does. */
	toString(): string {
		return this.value;
	}
}

/** Escape `& < > " '` for HTML text and attribute values. */
export function escapeHtml(value: unknown): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/** Mark trusted markup (e.g. a rendered partial) so it is not escaped. */
export function raw(markup: string): SafeHtml {
	return new SafeHtml(markup);
}

/**
 * Tagged template for email HTML: interpolated values are escaped, arrays are
 * joined, `SafeHtml` (including nested `mailHtml`) is inserted as-is.
 *
 * @example
 * ```ts
 * mailHtml`<p>Hi ${user.name}</p><a href="${url}">Confirm</a>`
 * ```
 */
export function mailHtml(strings: TemplateStringsArray, ...values: unknown[]): SafeHtml {
	let out = strings[0] ?? "";
	values.forEach((value, i) => {
		const items = Array.isArray(value) ? value : [value];
		for (const item of items) {
			if (item === null || item === undefined || item === false) continue;
			out += item instanceof SafeHtml ? item.value : escapeHtml(item);
		}
		out += strings[i + 1] ?? "";
	});
	return new SafeHtml(out);
}

const ENTITIES: Record<string, string> = {
	amp: "&",
	lt: "<",
	gt: ">",
	quot: '"',
	apos: "'",
	nbsp: " ",
};

function decodeEntities(text: string): string {
	return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
		if (entity.startsWith("#x") || entity.startsWith("#X")) {
			return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
		}
		if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
		return ENTITIES[entity.toLowerCase()] ?? match;
	});
}

/**
 * Plain-text alternative for an HTML email: blocks become paragraphs, list
 * items become `- item`, links become `text (url)`; styles and scripts go.
 */
export function htmlToText(html: string): string {
	const text = html
		.replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
		.replace(
			/<a\s[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi,
			(_, _q, href: string, label: string) => {
				const url = decodeEntities(href);
				const inner = label.replace(/<[^>]+>/g, "").trim();
				return !inner || inner === url ? url : `${inner} (${url})`;
			},
		)
		.replace(/<li[^>]*>/gi, "\n- ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(
			/<\/?(p|div|h[1-6]|ul|ol|table|tr|blockquote|hr|section|article|header|footer)[^>]*>/gi,
			"\n\n",
		)
		.replace(/<[^>]+>/g, "");
	return decodeEntities(text)
		.split("\n")
		.map((line) => line.replace(/[ \t]+/g, " ").trim())
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}
