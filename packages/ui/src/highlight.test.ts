/** Characterization test: tokenizer refactors must not change highlighted output. */
import { expect, test } from "bun:test";
import golden from "./fixtures/highlight-golden.json";
import { highlightCode } from "./highlight.ts";

test("highlightCode output matches the recorded golden corpus", () => {
	const drift = (golden as Array<{ s: string; h: string }>).filter(
		({ s, h }) => highlightCode(s, "tsx") !== h,
	);
	expect(drift.map((d) => d.s.slice(0, 40))).toEqual([]);
});

test("escapes markup in source text", () => {
	expect(highlightCode('<img src=x onerror="alert(1)">')).not.toContain("<img");
});
