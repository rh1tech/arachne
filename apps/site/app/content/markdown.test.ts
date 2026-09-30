import { describe, expect, test } from "bun:test";
import { renderMarkdown } from "./markdown.ts";

const pages = new Map([["packages/kit/README.md", "/docs/packages/kit"]]);
const render = (md: string, highlight?: (code: string, lang?: string) => string | undefined) =>
	renderMarkdown(md, { from: "packages/router/README.md", pages, highlight });

describe("renderMarkdown", () => {
	test("takes the first h1 as the title and leaves it out of the body", () => {
		const doc = render("<!-- generated -->\n# @arachne/router\n\nSignal-driven\nrouter.\n");
		expect(doc.title).toBe("@arachne/router");
		expect(doc.html).not.toContain("<h1");
		expect(doc.html).not.toContain("generated");
		expect(doc.summary).toBe("Signal-driven router.");
	});

	test("gives headings GitHub ids, a self link, and lists h2/h3 for the outline", () => {
		const doc = render("# T\n\n## Pages\n\n### Pages\n\n## Build and `deploy`\n\n#### Deep\n");
		expect(doc.html).toContain('<h2 id="pages">Pages <a class="anchor" href="#pages"');
		expect(doc.html).toContain('<h3 id="pages-1">');
		expect(doc.html).toContain('<h2 id="build-and-deploy">Build and <code>deploy</code>');
		expect(doc.headings).toEqual([
			{ level: 2, id: "pages", text: "Pages" },
			{ level: 3, id: "pages-1", text: "Pages" },
			{ level: 2, id: "build-and-deploy", text: "Build and deploy" },
		]);
	});

	test("rewrites repository links and unlinks targets without a page", () => {
		const doc = render(
			"See [kit](../kit/README.md#pages), [ext](https://x.dev/?a=1&b=2) and [tpl](templates/static).",
		);
		expect(doc.html).toContain('<a href="/docs/packages/kit#pages">kit</a>');
		expect(doc.html).toContain('<a href="https://x.dev/?a=1&amp;b=2" rel="external">ext</a>');
		expect(doc.html).toContain('<span class="xref">tpl</span>');
	});

	test("escapes inline HTML instead of rendering it", () => {
		const doc = render("Returns `x` as Array<T> <b>bold</b>");
		expect(doc.html).toContain("Array&lt;T&gt;");
		expect(doc.html).not.toContain("<b>");
	});

	test("passes decoded code and language to the highlighter and adds a copy button", () => {
		const seen: [string, string | undefined][] = [];
		const doc = render("```tsx\nconst a = <b>&</b>;\n```\n\n```\nplain\n```\n", (code, lang) => {
			seen.push([code, lang]);
			return lang ? `<span class="hl">${lang}</span>` : undefined;
		});
		expect(seen).toEqual([
			["const a = <b>&</b>;\n", "tsx"],
			["plain\n", undefined],
		]);
		expect(doc.html).toContain('<div class="code" data-lang="tsx">');
		expect(doc.html).toContain('<button type="button" class="copy" data-copy>Copy</button>');
		expect(doc.html).toContain('<pre tabindex="0"><code><span class="hl">tsx</span></code></pre>');
		expect(doc.html).toContain('<pre tabindex="0"><code>plain\n</code></pre>');
	});

	test("wraps tables so they scroll on narrow screens", () => {
		const doc = render("| a | b |\n|---|---|\n| 1 | 2 |\n");
		expect(doc.html).toMatch(/^<div class="table-scroll"><table>[\s\S]*<\/table><\/div>$/m);
	});
});
