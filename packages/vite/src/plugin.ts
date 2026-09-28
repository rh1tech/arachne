import { type CompileOptions, compile } from "@arachne/jsx";
import type { BunPlugin } from "bun";

export type ArachneJsxPluginOptions = Pick<
	CompileOptions,
	"target" | "hydratable" | "dev" | "moduleName" | "builtIns" | "sourceMap"
>;

const FILTER = /\.[jt]sx$/;

export function bunPlugin(options: ArachneJsxPluginOptions = {}): BunPlugin {
	return {
		name: "arachne-jsx",
		setup(build) {
			build.onLoad({ filter: FILTER }, async (args) => {
				const source = await Bun.file(args.path).text();
				const result = compile(source, {
					filename: args.path,
					target: options.target ?? "dom",
					hydratable: options.hydratable ?? false,
					...(options.dev !== undefined ? { dev: options.dev } : {}),
					...(options.moduleName !== undefined ? { moduleName: options.moduleName } : {}),
					...(options.builtIns !== undefined ? { builtIns: options.builtIns } : {}),
					...(options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}),
				});
				return {
					contents: result.code,
					// Compiler may leave TypeScript annotations; let Bun strip them.
					loader: "ts",
				};
			});
		},
	};
}

/** Vite-shaped plugin without importing `vite` (optional peer). */
export function vitePlugin(options: ArachneJsxPluginOptions = {}): {
	name: string;
	enforce: "pre";
	transform: (code: string, id: string) => { code: string; map?: string | null } | undefined;
} {
	return {
		name: "arachne-jsx",
		enforce: "pre",
		transform(code, id) {
			if (!FILTER.test(id) || id.includes("\0")) return undefined;
			const result = compile(code, {
				filename: id,
				target: options.target ?? "dom",
				hydratable: options.hydratable ?? false,
				...(options.dev !== undefined ? { dev: options.dev } : {}),
				...(options.moduleName !== undefined ? { moduleName: options.moduleName } : {}),
				...(options.builtIns !== undefined ? { builtIns: options.builtIns } : {}),
				...(options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}),
			});
			const out: { code: string; map?: string | null } = { code: result.code };
			if (result.map !== undefined) out.map = result.map;
			return out;
		},
	};
}
