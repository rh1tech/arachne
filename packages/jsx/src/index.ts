import { type TransformOptions, transform } from "@dom-expressions/compiler";

export type CompileTarget = "dom" | "ssr";

export interface CompileOptions {
	filename?: string;
	target?: CompileTarget;
	hydratable?: boolean;
	dev?: boolean;
	sourceMap?: boolean;
	/** Override runtime module (default `@arachne/render` or `.../ssr`). */
	moduleName?: string;
	builtIns?: string[];
}

export interface CompileResult {
	code: string;
	map?: string | null;
	/** True when the source module starts with `"use island"`. */
	isIsland: boolean;
	hydrateStrategy: string;
}

const ISLAND_RE = /^[\s\S]*?["']use island["']\s*;?/;
const ISLAND_STRATEGY_RE = /["']use island["']\s*;?\s*(?:\/\*\s*hydrate:\s*([^\s*]+)\s*\*\/)?/;

function detectIsland(source: string): {
	isIsland: boolean;
	hydrateStrategy: string;
	code: string;
} {
	const match = source.match(ISLAND_STRATEGY_RE);
	if (!match || !ISLAND_RE.test(source)) {
		return { isIsland: false, hydrateStrategy: "visible", code: source };
	}
	const hydrateStrategy = match[1] ?? "visible";
	const code = source.replace(ISLAND_RE, "");
	return { isIsland: true, hydrateStrategy, code };
}

export function compile(source: string, options: CompileOptions = {}): CompileResult {
	const target = options.target ?? "dom";
	const { isIsland, hydrateStrategy, code: stripped } = detectIsland(source);

	const moduleName =
		options.moduleName ?? (target === "ssr" ? "@arachne/render/ssr" : "@arachne/render");

	const transformOptions: TransformOptions = {
		filename: options.filename ?? "unknown.tsx",
		moduleName,
		generate: target,
		hydratable: options.hydratable ?? true,
		effectWrapper: "effect",
		builtIns: options.builtIns ?? ["For", "Show", "Suspense"],
	};
	if (options.dev !== undefined) transformOptions.dev = options.dev;
	if (options.sourceMap !== undefined) transformOptions.sourceMap = options.sourceMap;

	const result = transform(stripped, transformOptions);

	let code = result.code;
	if (isIsland) {
		code = `/* @arachne-island hydrate:${hydrateStrategy} */\n${code}`;
	}

	const out: CompileResult = {
		code,
		isIsland,
		hydrateStrategy,
	};
	if (result.map !== undefined) {
		out.map = result.map;
	}
	return out;
}

export type { TransformOptions };
export { transform };
