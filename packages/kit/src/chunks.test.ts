import { afterAll, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { build } from "./index.ts";

const root = join(import.meta.dir, `fixtures/chunks-${Date.now().toString(36)}`);

afterAll(() => rmSync(root, { recursive: true, force: true }));

const files = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		return statSync(path).isDirectory() ? files(path) : [path];
	});

test("every import between built chunks points at a file that exists", async () => {
	mkdirSync(join(root, "app"), { recursive: true });
	// A lazy module sharing code with the entry: Bun then emits a shared chunk
	// that the lazy chunk imports.
	writeFileSync(
		join(root, "app/shared.ts"),
		`export const greet = (name: string) => \`Hi \${name}\`;\n`,
	);
	writeFileSync(
		join(root, "app/lazy.tsx"),
		`import { greet } from "./shared.ts";\nexport default () => <p>{greet("lazy")}</p>;\n`,
	);
	writeFileSync(
		join(root, "app/routes.tsx"),
		`import { greet } from "./shared.ts";
export const routes = [
	{ path: "/", component: () => <p>{greet("home")}</p> },
	{ path: "/lazy", lazy: () => import("./lazy.tsx") },
];
`,
	);
	writeFileSync(join(root, "arachne.config.ts"), `export default { mode: "static" };\n`);
	await build(root);

	const dist = join(root, "dist");
	const scripts = files(join(dist, "assets")).filter((file) => file.endsWith(".js"));
	expect(scripts.length).toBeGreaterThan(2); // entry, lazy chunk, shared chunk
	const missing: string[] = [];
	for (const file of scripts) {
		const code = readFileSync(file, "utf8");
		for (const [, url] of code.matchAll(/(?:from\s*|import\s*\(\s*)"(\/assets\/[^"]+)"/g)) {
			try {
				statSync(join(dist, url ?? ""));
			} catch {
				missing.push(`${relative(dist, file)} → ${url}`);
			}
		}
	}
	expect(missing).toEqual([]);
});
