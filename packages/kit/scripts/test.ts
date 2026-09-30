/**
 * Runs each kit test file in its own `bun test` process.
 *
 * The kit's tests call `Bun.build` dozens of times; after many builds in one
 * process Bun 1.3 starts failing reads with bogus errors (EISDIR,
 * "Unseekable reading file") on files that exist. One process per file keeps
 * each well under that threshold; a file that still fails is retried once.
 * Extra arguments are passed to `bun test`.
 */
import { readdirSync } from "node:fs";
import { join } from "node:path";

const dir = join(import.meta.dir, "../src");
const files = readdirSync(dir)
	.filter((file) => file.endsWith(".test.ts"))
	.sort();
let failed = 0;
const runFile = (file: string) =>
	Bun.spawnSync([process.execPath, "test", join(dir, file), ...process.argv.slice(2)], {
		stdout: "inherit",
		stderr: "inherit",
		cwd: join(import.meta.dir, ".."),
	}).exitCode === 0;
for (const file of files) {
	if (runFile(file)) continue;
	// The same Bun bug still hits a single file now and then (CI runners):
	// one retry, announced, so a real failure still fails twice.
	console.warn(`[kit tests] ${file} failed; retrying once (known Bun.build flake)`);
	if (!runFile(file)) failed += 1;
}
if (failed > 0) {
	console.error(`${failed} of ${files.length} kit test files failed`);
	process.exit(1);
}
