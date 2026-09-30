/**
 * Enforces downward-only @arachnejs/* package dependencies.
 * Allowed edges are declared in ./boundaries.json (layer map from ADR-0001).
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface Boundaries {
	layers: Record<string, string[]>;
}

interface PackageJson {
	name?: string;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
}

const root = join(import.meta.dir, "..");
const packagesDir = join(root, "packages");

function packageToLayer(name: string): string | undefined {
	if (!name.startsWith("@arachnejs/")) return undefined;
	const short = name.slice("@arachnejs/".length);
	if (short === "vite") return "vite";
	if (short === "otel") return "observability";
	return short;
}

function isAllowed(from: string, to: string, layers: Boundaries["layers"]): boolean {
	if (from === to) return true;
	const allowed = layers[from];
	if (!allowed) return false;
	return allowed.includes(to);
}

async function readPackage(pkgPath: string): Promise<PackageJson | undefined> {
	try {
		return JSON.parse(await readFile(pkgPath, "utf8")) as PackageJson;
	} catch {
		return undefined;
	}
}

function checkPackage(pkg: PackageJson, layers: Boundaries["layers"]): string[] {
	const errors: string[] = [];
	if (!pkg.name?.startsWith("@arachnejs/")) return errors;

	const fromLayer = packageToLayer(pkg.name);
	if (!fromLayer) {
		errors.push(`${pkg.name}: cannot map to a layer`);
		return errors;
	}
	if (!(fromLayer in layers)) {
		errors.push(`${pkg.name}: layer "${fromLayer}" missing from boundaries.json`);
		return errors;
	}

	const deps = { ...pkg.dependencies, ...pkg.peerDependencies };
	for (const dep of Object.keys(deps)) {
		const toLayer = packageToLayer(dep);
		if (!toLayer) continue;
		if (!isAllowed(fromLayer, toLayer, layers)) {
			errors.push(`${pkg.name} → ${dep}: layer "${fromLayer}" may not depend on "${toLayer}"`);
		}
	}
	return errors;
}

async function main(): Promise<void> {
	const raw = await readFile(join(import.meta.dir, "boundaries.json"), "utf8");
	const boundaries = JSON.parse(raw) as Boundaries;
	const entries = await readdir(packagesDir, { withFileTypes: true });
	const errors: string[] = [];

	for (const entry of entries) {
		if (!entry.isDirectory()) continue;
		const pkg = await readPackage(join(packagesDir, entry.name, "package.json"));
		if (!pkg) continue;
		errors.push(...checkPackage(pkg, boundaries.layers));
	}

	if (errors.length > 0) {
		console.error("Dependency boundary violations:\n");
		for (const e of errors) console.error(`  - ${e}`);
		process.exit(1);
	}
	console.log("Dependency boundaries OK");
}

await main();
