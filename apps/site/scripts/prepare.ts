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

// The UI kit's stylesheet for the live examples on component pages. Two
// changes for the site: it declares the same layer order as the site's own
// CSS (whichever loads first sets it: site defaults stay below the kit), and
// its OS-following dark theme applies without <html data-theme="system">.
const uiCss = await Bun.file(join(import.meta.dir, "../../../packages/ui/src/styles.css")).text();
const followOs = uiCss.replaceAll(':root[data-theme="system"]', ":root");
if (followOs === uiCss) throw new Error('ui.css: no :root[data-theme="system"] rules to adapt');
await Bun.write(
	join(publicDir, "ui.css"),
	`@layer site-base, arachne.tokens, arachne.components;\n${followOs}`,
);

await writeFile(join(publicDir, "search.json"), JSON.stringify(await searchIndex()));
console.info(`[site] fonts and search index written to ${publicDir}`);
