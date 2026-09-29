/**
 * Fails when a package's public API has exports (or members of exported
 * interfaces) without a TSDoc comment. Packages to check are listed in
 * ./docs-check.json; each entry point is the package's `src/index.ts`.
 *
 * Usage: `bun run docs:check`
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

/** Shape of ./docs-check.json. */
interface DocsCheckConfig {
	/** Package directory names under `packages/`. */
	packages: string[];
}

function hasDoc(symbol: ts.Symbol, checker: ts.TypeChecker): boolean {
	if (symbol.getDocumentationComment(checker).length > 0) return true;
	// `@deprecated`/`@internal`-only comments still count as documented.
	return symbol.getJsDocTags(checker).length > 0;
}

function memberNames(symbol: ts.Symbol): Array<[string, ts.Symbol]> {
	const declaration = symbol.declarations?.[0];
	if (!declaration) return [];
	if (!ts.isInterfaceDeclaration(declaration) && !ts.isClassDeclaration(declaration)) return [];
	const out: Array<[string, ts.Symbol]> = [];
	for (const member of symbol.members?.values() ?? []) {
		const name = member.getName();
		if (name === "__constructor" || name.startsWith("#")) continue;
		if (member.flags & ts.SymbolFlags.TypeParameter) continue;
		const decl = member.declarations?.[0];
		// Private class members are not public API.
		if (decl && ts.getCombinedModifierFlags(decl) & ts.ModifierFlags.Private) continue;
		out.push([name, member]);
	}
	return out;
}

/**
 * Names of undocumented public symbols reachable from `entry`, sorted.
 * Interface/class members are reported as `Owner.member`.
 */
export function findUndocumented(entry: string): string[] {
	const program = ts.createProgram([entry], {
		target: ts.ScriptTarget.ES2022,
		module: ts.ModuleKind.ESNext,
		moduleResolution: ts.ModuleResolutionKind.Bundler,
		allowImportingTsExtensions: true,
		noEmit: true,
		jsx: ts.JsxEmit.Preserve,
		skipLibCheck: true,
	});
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(entry);
	if (!source) throw new Error(`cannot read ${entry}`);
	const moduleSymbol = checker.getSymbolAtLocation(source);
	if (!moduleSymbol) return [];

	const missing = new Set<string>();
	for (const exported of checker.getExportsOfModule(moduleSymbol)) {
		const symbol =
			exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
		const name = exported.getName();
		if (!hasDoc(symbol, checker)) missing.add(name);
		for (const [member, memberSymbol] of memberNames(symbol)) {
			if (!hasDoc(memberSymbol, checker)) missing.add(`${name}.${member}`);
		}
	}
	return [...missing].sort();
}

function main(): void {
	const root = join(import.meta.dir, "..");
	const config = JSON.parse(
		readFileSync(join(import.meta.dir, "docs-check.json"), "utf8"),
	) as DocsCheckConfig;
	let failures = 0;
	for (const pkg of config.packages) {
		const missing = findUndocumented(join(root, "packages", pkg, "src/index.ts"));
		if (missing.length === 0) continue;
		failures += missing.length;
		console.error(`@arachne/${pkg}: ${missing.length} undocumented`);
		for (const name of missing) console.error(`  - ${name}`);
	}
	if (failures > 0) {
		console.error(`\n${failures} undocumented export(s). Add a TSDoc comment to each.`);
		process.exit(1);
	}
	console.log(`Docs OK (${config.packages.length} packages)`);
}

if (import.meta.main) main();
