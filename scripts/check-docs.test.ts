import { expect, test } from "bun:test";
import { join } from "node:path";
import { findUndocumented } from "./check-docs.ts";

const fixture = join(import.meta.dir, "fixtures/docs/index.ts");

test("reports exports and interface members that lack a doc comment", () => {
	const missing = findUndocumented(fixture);
	expect(missing).toEqual(["Alias", "Options.bad", "missing", "reexported"]);
});

test("documented exports pass", () => {
	const missing = findUndocumented(fixture);
	for (const name of ["documented", "Options", "Options.good", "value"]) {
		expect(missing).not.toContain(name);
	}
});
