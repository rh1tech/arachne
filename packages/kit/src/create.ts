import { existsSync, readdirSync, readFileSync } from "node:fs";
import { cp, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

/** Project templates shipped with the kit. */
export const TEMPLATES = ["static", "server", "api"] as const;

/** A template name. */
export type TemplateName = (typeof TEMPLATES)[number];

const SKIP = /(^|[\\/])(node_modules|\.arachne|dist[^\\/]*|data)([\\/]|$)/;

/** Directory holding the templates. */
export function templatesDir(): string {
	return join(import.meta.dir, "..", "templates");
}

/**
 * Copy a template into `target` (which must be empty or missing), naming the
 * package after the directory and pinning `workspace:*` dependencies to the
 * kit's version.
 */
export async function createProject(target: string, template: TemplateName): Promise<string> {
	if (!TEMPLATES.includes(template))
		throw new Error(`unknown template "${template}" (${TEMPLATES.join(", ")})`);
	if (existsSync(target) && readdirSync(target).length > 0)
		throw new Error(`${target} is not empty`);
	const source = join(templatesDir(), template);
	await cp(source, target, {
		recursive: true,
		filter: (path) => !SKIP.test(path.slice(source.length)),
	});
	const version = (
		JSON.parse(readFileSync(join(import.meta.dir, "..", "package.json"), "utf8")) as {
			version: string;
		}
	).version;
	const pkgFile = join(target, "package.json");
	const pkg = JSON.parse(await readFile(pkgFile, "utf8")) as {
		name: string;
		private?: boolean;
		dependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	};
	pkg.name = basename(target)
		.toLowerCase()
		.replace(/[^a-z0-9-]+/g, "-");
	for (const deps of [pkg.dependencies, pkg.devDependencies]) {
		if (!deps) continue;
		for (const [name, range] of Object.entries(deps)) {
			if (range.startsWith("workspace:")) deps[name] = `^${version}`;
		}
	}
	await writeFile(pkgFile, `${JSON.stringify(pkg, null, "\t")}\n`);
	return target;
}
