import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { exampleGroups } from "../../../../packages/ui/examples/index.ts";
import { ENTRIES } from "../nav.ts";
import { REPO_ROOT } from "./docs.ts";
import { insertPreviews, PREVIEWS, previewSlots } from "./previews.ts";

const md = `# Actions

## Button

Buttons, including loading variants.

### Button

Button (or link when \`href\` is set).

**Slots:** \`root\`

| Prop | Type |
| --- | --- |
| \`size\` | \`"sm"\` |

\`\`\`ts
type ButtonVariant = "solid";
\`\`\`

\`\`\`tsx
<Button>Save</Button>
\`\`\`

### LoadingButton

Shows a spinner.

\`\`\`tsx
<LoadingButton loading>Saving</LoadingButton>
\`\`\`

## Not a component

Text with a fence:

\`\`\`tsx
<Nope />
\`\`\`
`;

const known = new Map([
	["Button", { interactive: false, logsActions: true }],
	["LoadingButton", { interactive: true, logsActions: false }],
]);

describe("insertPreviews", () => {
	test("puts a preview marker and the example right after each component's summary", () => {
		const out = insertPreviews(md, known);
		const button = out.slice(out.indexOf("### Button"), out.indexOf("### LoadingButton"));
		expect(button.indexOf("@@preview:Button@@")).toBeGreaterThan(button.indexOf("Button (or link"));
		expect(button.indexOf("@@preview:Button@@")).toBeLessThan(button.indexOf("**Slots:**"));
		expect(button.indexOf("<Button>Save</Button>")).toBeGreaterThan(
			button.indexOf("@@preview:Button@@"),
		);
		expect(button.indexOf("<Button>Save</Button>")).toBeLessThan(button.indexOf("**Slots:**"));
		expect(button.match(/<Button>Save<\/Button>/g)).toHaveLength(1);
		// The type definition fence stays where it was.
		expect(button.indexOf("type ButtonVariant")).toBeGreaterThan(button.indexOf("**Slots:**"));
	});

	test("skips family headings without their own example and unknown names", () => {
		const out = insertPreviews(md, known);
		expect(out.match(/@@preview:/g)).toHaveLength(2);
		expect(out).toContain("@@preview:LoadingButton@@");
		expect(out.indexOf("<Nope />")).toBeGreaterThan(out.indexOf("Text with a fence"));
	});
});

describe("previewSlots", () => {
	test("turns markers into preview placeholders with the example's flags", () => {
		const html = previewSlots("<p>@@preview:Button@@</p>\n<p>@@preview:LoadingButton@@</p>", known);
		expect(html).toContain('<div class="ui-preview" data-example="Button" data-logs>');
		expect(html).toContain(
			'<div class="ui-preview" data-example="LoadingButton" data-interactive>',
		);
		expect(html).not.toContain("@@preview");
	});
});

describe("PREVIEWS", () => {
	test("every component with a preview has a runnable example", () => {
		const examples = new Set(exampleGroups.flatMap((group) => group.examples.map((e) => e.name)));
		const missing = [...PREVIEWS.keys()].filter((name) => !examples.has(name));
		expect(missing).toEqual([]);
	});

	test("every component page gets previews for its components", () => {
		const pages = ENTRIES.filter((e) => /^docs\/ui\/components\/(?!README)/.test(e.source));
		for (const page of pages) {
			const out = insertPreviews(readFileSync(join(REPO_ROOT, page.source), "utf8"), PREVIEWS);
			expect({ page: page.path, has: out.includes("@@preview:") }).toEqual({
				page: page.path,
				has: true,
			});
		}
	});
});
