import { createCssVariablesTheme, createHighlighter } from "shiki";
import type { Highlight } from "./markdown.ts";

const LANGS = ["tsx", "ts", "js", "json", "bash", "css", "html", "sql", "diff"] as const;
const ALIASES: Record<string, (typeof LANGS)[number]> = {
	typescript: "ts",
	javascript: "js",
	jsx: "tsx",
	sh: "bash",
	shell: "bash",
	zsh: "bash",
};

/**
 * Colours come from CSS custom properties (`--hl-keyword`, `--hl-string`, …)
 * so the site stylesheet decides the palette for light and dark themes.
 */
const theme = createCssVariablesTheme({
	name: "arachne",
	variablePrefix: "--hl-",
	fontStyle: true,
});

/**
 * Build-time syntax highlighter (Shiki). Returns the highlighted lines for
 * the inside of `<code>`; unknown languages return `undefined`.
 */
export async function createHighlight(): Promise<Highlight> {
	const shiki = await createHighlighter({ themes: [theme], langs: [...LANGS] });
	return (code, lang) => {
		const name = lang && (ALIASES[lang] ?? (LANGS as readonly string[]).find((l) => l === lang));
		if (!name) return undefined;
		const html = shiki.codeToHtml(code.replace(/\n$/, ""), { lang: name, theme: "arachne" });
		const inner = /<code>([\s\S]*)<\/code>/.exec(html);
		return inner?.[1];
	};
}
