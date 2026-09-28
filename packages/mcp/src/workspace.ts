import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ArachneMcpModule } from "./module.ts";

const KNOWN_MODULES = [
	"core",
	"config",
	"signals",
	"jsx",
	"render",
	"testing",
	"schema",
	"router",
	"server",
	"vite",
	"db",
	"db-sqlite",
	"auth",
	"acl",
	"ui",
	"forms",
	"table",
	"admin",
	"cli",
] as const;

export type KnownModuleName = (typeof KNOWN_MODULES)[number];

function packagesRoot(): string {
	// bin runs from repo; src runs from packages/mcp/src
	const candidates = [
		join(import.meta.dir, "../../"), // packages/
		join(process.cwd(), "packages"),
	];
	for (const c of candidates) {
		if (existsSync(join(c, "core"))) return c;
	}
	return join(process.cwd(), "packages");
}

/**
 * Load MCP modules by filesystem path (avoids root workspace resolution issues).
 */
export async function loadMcpModules(
	names: string[] = [...KNOWN_MODULES],
): Promise<ArachneMcpModule[]> {
	const root = packagesRoot();
	const modules: ArachneMcpModule[] = [];

	for (const name of names) {
		const file = join(root, name, "src/mcp.ts");
		if (!existsSync(file)) continue;
		try {
			const mod = (await import(file)) as {
				mcpModule?: ArachneMcpModule;
				default?: ArachneMcpModule;
			};
			const resolved = mod.mcpModule ?? mod.default;
			if (resolved) modules.push(resolved);
		} catch (e) {
			console.error(`arachne-mcp: failed to load ${name}:`, e);
		}
	}
	return modules;
}

export { KNOWN_MODULES };
