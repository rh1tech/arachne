/**
 * Publish every public `@arachnejs/*` package whose version isn't on npm yet.
 *
 *   bun run release              # publish (CI: after the "Version packages" PR is merged)
 *   bun run release --dry-run    # pack and run `npm publish --dry-run` for each
 *
 * Each package is packed with `bun pm pack` (turns `workspace:*` into the
 * real versions; honours `files`), with the repository's licence files
 * copied in, then the tarball is published with `npm publish` so npm's
 * trusted publishing (OIDC) and provenance work. Set `NPM_CONFIG_PROVENANCE=true`
 * in CI for provenance. Prints `New tag: <name>@<version>` lines, which
 * changesets/action turns into git tags and GitHub releases.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

/** The parts of a package manifest the plan needs. */
export interface Manifest {
	/** Package name. */
	name: string;
	/** Version to publish. */
	version: string;
	/** Directory, relative to the repository root. */
	dir: string;
	/** Never published. */
	private?: boolean;
	/** Runtime dependencies (internal ones order the plan). */
	dependencies?: Record<string, string>;
}

/**
 * The packages to publish, dependencies first: public packages whose
 * `name@version` isn't published yet (`published` asks the registry).
 */
export function releasePlan(
	manifests: readonly Manifest[],
	published: (name: string, version: string) => boolean,
): Manifest[] {
	const byName = new Map(manifests.filter((m) => !m.private).map((m) => [m.name, m] as const));
	const ordered: Manifest[] = [];
	const state = new Map<string, "visiting" | "done">();
	const visit = (manifest: Manifest, path: string[]) => {
		if (state.get(manifest.name) === "done") return;
		if (state.get(manifest.name) === "visiting")
			throw new Error(`dependency cycle: ${[...path, manifest.name].join(" → ")}`);
		state.set(manifest.name, "visiting");
		for (const dep of Object.keys(manifest.dependencies ?? {})) {
			const internal = byName.get(dep);
			if (internal) visit(internal, [...path, manifest.name]);
		}
		state.set(manifest.name, "done");
		ordered.push(manifest);
	};
	for (const manifest of byName.values()) visit(manifest, []);
	return ordered.filter((m) => !published(m.name, m.version));
}

const ROOT = join(import.meta.dir, "..");
const LICENSES = ["LICENSE-MIT", "LICENSE-APACHE"];

function run(cmd: string[], cwd = ROOT): { ok: boolean; out: string } {
	const result = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
	return { ok: result.success, out: `${result.stdout}${result.stderr}` };
}

function isPublished(name: string, version: string): boolean {
	const result = run(["npm", "view", `${name}@${version}`, "version"]);
	if (result.ok) return result.out.trim() === version;
	if (/E404|404 Not Found/.test(result.out)) return false;
	throw new Error(`npm view ${name}@${version} failed:\n${result.out}`);
}

function readManifests(): Manifest[] {
	return readdirSync(join(ROOT, "packages")).flatMap((dir) => {
		try {
			const pkg = JSON.parse(readFileSync(join(ROOT, "packages", dir, "package.json"), "utf8"));
			return [{ ...pkg, dir: join("packages", dir) } as Manifest];
		} catch {
			return [];
		}
	});
}

function pack(manifest: Manifest, outDir: string): string {
	const dir = join(ROOT, manifest.dir);
	for (const file of LICENSES) copyFileSync(join(ROOT, file), join(dir, file));
	try {
		const before = new Set(readdirSync(outDir));
		const result = run(["bun", "pm", "pack", "--destination", outDir], dir);
		if (!result.ok) throw new Error(`bun pm pack failed for ${manifest.name}:\n${result.out}`);
		const tarball = readdirSync(outDir).find((file) => !before.has(file) && file.endsWith(".tgz"));
		if (!tarball) throw new Error(`bun pm pack wrote no tarball for ${manifest.name}`);
		return join(outDir, tarball);
	} finally {
		for (const file of LICENSES) rmSync(join(dir, file), { force: true });
	}
}

if (import.meta.main) {
	const dryRun = process.argv.includes("--dry-run");
	const plan = releasePlan(readManifests(), isPublished);
	if (plan.length === 0) {
		console.info("Nothing to publish: every package version is already on npm.");
		process.exit(0);
	}
	const outDir = join(ROOT, ".release");
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	for (const manifest of plan) {
		const tarball = pack(manifest, outDir);
		const args = [
			"npm",
			"publish",
			tarball,
			"--access",
			"public",
			...(dryRun ? ["--dry-run"] : []),
		];
		const result = run(args);
		if (!result.ok) {
			console.error(result.out);
			throw new Error(`publishing ${manifest.name}@${manifest.version} failed`);
		}
		console.info(
			dryRun
				? `would publish ${manifest.name}@${manifest.version}`
				: `New tag: ${manifest.name}@${manifest.version}`,
		);
	}
	rmSync(outDir, { recursive: true, force: true });
}
