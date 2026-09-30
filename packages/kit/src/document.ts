import type { DocumentParts } from "./config.ts";

const JSON_ESCAPES: Record<string, string> = {
	"<": "\\u003c",
	">": "\\u003e",
	"&": "\\u0026",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

/** JSON that is safe inside `<script>` (no `</script>`, `<!--` or line separators). */
export function serializeJson(value: unknown): string {
	return JSON.stringify(value ?? null).replace(
		/[<>&\u2028\u2029]/g,
		(char) => JSON_ESCAPES[char] ?? char,
	);
}

function attr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** The default HTML document. Apps can replace it with `document` in the config. */
export function renderDocument(parts: DocumentParts): string {
	const nonce = parts.nonce ? ` nonce="${attr(parts.nonce)}"` : "";
	const styles = parts.styles
		.map((href) => `<link rel="stylesheet" href="${attr(href)}">`)
		.join("");
	const scripts = parts.scripts
		.map((src) => `<script type="module" src="${attr(src)}"${nonce}></script>`)
		.join("");
	const boot =
		parts.scripts.length > 0
			? `<script type="application/json" id="__arachne">${serializeJson(parts.boot)}</script>`
			: "";
	const inline = parts.inlineScript ? `<script${nonce}>${parts.inlineScript}</script>` : "";
	return [
		"<!doctype html>",
		`<html lang="${attr(parts.lang)}">`,
		`<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${parts.head}${styles}</head>`,
		`<body><div id="app">${parts.body}</div>${boot}${scripts}${inline}</body>`,
		"</html>",
	].join("");
}
