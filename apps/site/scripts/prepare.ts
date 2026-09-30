/**
 * Generates the site's untracked public files before `arachne dev`/`build`:
 * the self-hosted fonts (copied from `@fontsource`), the UI kit stylesheet
 * for the live examples (`ui.css`), and `search.json`.
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { searchIndex } from "../app/content/docs.ts";

const publicDir = join(import.meta.dir, "..", "public");

/** Font files served from `/fonts/`: output name → `@fontsource` package file. */
const FONTS: Record<string, string> = {
	"plex-sans-400.woff2": "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2",
	"plex-sans-400-italic.woff2":
		"@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-italic.woff2",
	"plex-sans-600.woff2": "@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2",
	"plex-mono-400.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
	"plex-mono-600.woff2": "@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2",
};

await mkdir(join(publicDir, "fonts"), { recursive: true });
for (const [name, file] of Object.entries(FONTS)) {
	const [scope, pkg, ...rest] = file.split("/");
	const root = dirname(Bun.resolveSync(`${scope}/${pkg}/package.json`, import.meta.dir));
	await copyFile(join(root, ...rest), join(publicDir, "fonts", name));
}
const license = dirname(Bun.resolveSync("@fontsource/ibm-plex-sans/package.json", import.meta.dir));
await copyFile(join(license, "LICENSE"), join(publicDir, "fonts", "OFL.txt"));

// The UI kit's stylesheet, loaded by the live examples on component pages.
await copyFile(
	join(import.meta.dir, "../../../packages/ui/src/styles.css"),
	join(publicDir, "ui.css"),
);

await writeFile(join(publicDir, "search.json"), JSON.stringify(await searchIndex()));
console.info(`[site] fonts and search index written to ${publicDir}`);
