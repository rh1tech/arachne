import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { bunPlugin } from "@arachnejs/vite";

/** Renders one live example to HTML, or `undefined` when it can't be pre-rendered. */
export type RenderExample = (name: string, logs: boolean) => string | undefined;

let renderer: Promise<RenderExample> | undefined;

/**
 * The build-time example renderer: `app/ui/examples-ssr.tsx` bundled with
 * the SSR JSX compiler (as the kit bundles pages), loaded once. An example
 * that throws while rendering is left to the browser (logged).
 */
export function exampleRenderer(): Promise<RenderExample> {
	renderer ??= (async () => {
		const outdir = mkdtempSync(join(tmpdir(), "arachne-site-examples-"));
		try {
			const result = await Bun.build({
				entrypoints: [join(import.meta.dir, "../ui/examples-ssr.tsx")],
				outdir,
				target: "bun",
				format: "esm",
				plugins: [bunPlugin({ target: "ssr", hydratable: true })],
			});
			if (!result.success) throw new Error(result.logs.map(String).join("\n"));
			const entry = result.outputs.find((output) => output.kind === "entry-point");
			if (!entry) throw new Error("examples SSR bundle has no entry");
			const mod = (await import(pathToFileURL(entry.path).href)) as {
				renderExample: (name: string, logs: boolean) => string | undefined;
			};
			return (name, logs) => {
				try {
					return mod.renderExample(name, logs);
				} catch (error) {
					console.warn(`[site] ${name}: not pre-rendered (${(error as Error).message})`);
					return undefined;
				}
			};
		} finally {
			rmSync(outdir, { recursive: true, force: true });
		}
	})();
	return renderer;
}
