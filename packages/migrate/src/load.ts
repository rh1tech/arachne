import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Migration } from "./migration.ts";

const FILE = /^[^.].*\.(ts|js|mjs)$/;

/**
 * Import every migration module in `dir` (default export or `migration`
 * export), sorted by id. Test files (`*.test.*`) are skipped.
 */
export async function loadMigrations(dir: string): Promise<Migration[]> {
	const root = resolve(dir);
	let files: string[];
	try {
		files = await readdir(root);
	} catch {
		return [];
	}
	const migrations: Migration[] = [];
	for (const file of files.filter((name) => FILE.test(name) && !name.includes(".test.")).sort()) {
		const mod = (await import(pathToFileURL(join(root, file)).href)) as {
			default?: Migration;
			migration?: Migration;
		};
		const migration = mod.default ?? mod.migration;
		if (!migration?.id || typeof migration.up !== "function") {
			throw new Error(
				`${file} does not export a migration (use export default defineMigration(...))`,
			);
		}
		migrations.push(migration);
	}
	return migrations.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}
