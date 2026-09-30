import { afterAll, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadMigrations } from "./index.ts";

const dir = join(tmpdir(), `arachne-migrations-${Date.now()}`);
const api = JSON.stringify(join(import.meta.dir, "index.ts"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test("loads migration modules sorted by id and skips tests", async () => {
	mkdirSync(dir, { recursive: true });
	writeFileSync(
		join(dir, "0002_b.ts"),
		`import { defineMigration, sql } from ${api};\nexport default defineMigration({ id: "0002_b", ...sql("SELECT 1") });`,
	);
	writeFileSync(
		join(dir, "0001_a.ts"),
		`import { defineMigration, sql } from ${api};\nexport const migration = defineMigration({ id: "0001_a", ...sql("SELECT 1") });`,
	);
	writeFileSync(join(dir, "0001_a.test.ts"), "throw new Error('should not load')");
	expect((await loadMigrations(dir)).map((m) => m.id)).toEqual(["0001_a", "0002_b"]);
});

test("missing directories mean no migrations; bad modules throw", async () => {
	expect(await loadMigrations(join(dir, "nope"))).toEqual([]);
	writeFileSync(join(dir, "0003_bad.ts"), "export default 42;");
	await expect(loadMigrations(dir)).rejects.toThrow("0003_bad.ts does not export a migration");
});
