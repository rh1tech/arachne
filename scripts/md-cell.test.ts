import { expect, test } from "bun:test";
import { codeCell, escapeCell } from "./md-cell.ts";

test("escapes pipes everywhere and < only outside code spans", () => {
	expect(escapeCell("Name for the `<nav>` element")).toBe("Name for the `<nav>` element");
	expect(escapeCell("Array<T> or `A | B`")).toBe("Array&lt;T> or `A \\| B`");
	expect(escapeCell("a | b")).toBe("a \\| b");
});

test("code cells keep < and escape pipes", () => {
	expect(codeCell("DataTableColumn<T>[]")).toBe("`DataTableColumn<T>[]`");
	expect(codeCell('"sm" | "md"')).toBe('`"sm" \\| "md"`');
});
