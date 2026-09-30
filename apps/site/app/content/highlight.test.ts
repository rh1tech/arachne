import { describe, expect, test } from "bun:test";
import { createHighlight } from "./highlight.ts";

describe("createHighlight", async () => {
	const highlight = await createHighlight();

	test("colours known languages with CSS variables (no inline theme colours)", () => {
		const html = highlight("const a = 1 < 2;\n", "ts") ?? "";
		expect(html).toContain("var(--hl-");
		expect(html).not.toMatch(/color:#/i);
		expect(html).not.toContain("<pre");
		expect(html.replace(/<[^>]+>/g, "")).toBe("const a = 1 &#x3C; 2;");
	});

	test("maps aliases and falls back for unknown or missing languages", () => {
		expect(highlight("echo hi\n", "sh")).toContain("var(--hl-");
		expect(highlight("x\n", "brainfuck")).toBeUndefined();
		expect(highlight("x\n")).toBeUndefined();
	});
});
