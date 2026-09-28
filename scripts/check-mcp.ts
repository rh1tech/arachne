/**
 * Ensures every workspace package exports a loadable ./mcp module
 * with at least one tool, resource, or prompt (ADR 0007).
 */
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArachneMcpModule } from "../packages/mcp/src/module.ts";

const packagesDir = join(import.meta.dir, "../packages");
const skip = new Set(["mcp"]);

async function readPkg(
	pkgPath: string,
): Promise<{ name?: string; exports?: Record<string, unknown> } | undefined> {
	try {
		return JSON.parse(await readFile(pkgPath, "utf8")) as {
			name?: string;
			exports?: Record<string, unknown>;
		};
	} catch {
		return undefined;
	}
}

async function loadModule(name: string): Promise<ArachneMcpModule | undefined> {
	const file = join(packagesDir, name, "src/mcp.ts");
	if (!existsSync(file)) return undefined;
	const mod = (await import(file)) as {
		mcpModule?: ArachneMcpModule;
		default?: ArachneMcpModule;
	};
	return mod.mcpModule ?? mod.default;
}

function surfaceCount(mod: ArachneMcpModule): number {
	return (mod.tools?.length ?? 0) + (mod.resources?.length ?? 0) + (mod.prompts?.length ?? 0);
}

async function checkPackage(entryName: string): Promise<string | undefined> {
	const pkg = await readPkg(join(packagesDir, entryName, "package.json"));
	if (!pkg?.name?.startsWith("@arachne/")) return undefined;
	if (!pkg.exports?.["./mcp"]) return `${pkg.name}: missing exports["./mcp"]`;
	try {
		const resolved = await loadModule(entryName);
		if (!resolved) return `${pkg.name}: ./mcp does not export mcpModule`;
		if (surfaceCount(resolved) < 1) {
			return `${pkg.name}: MCP module has no tools/resources/prompts`;
		}
	} catch (e) {
		return `${pkg.name}: failed to import ./mcp (${e instanceof Error ? e.message : String(e)})`;
	}
	return undefined;
}

async function main(): Promise<void> {
	const entries = await readdir(packagesDir, { withFileTypes: true });
	const errors: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory() || skip.has(entry.name)) continue;
		const err = await checkPackage(entry.name);
		if (err) errors.push(err);
	}

	if (errors.length > 0) {
		console.error("MCP module check failed:\n");
		for (const e of errors) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log("MCP modules OK");
}

await main();
