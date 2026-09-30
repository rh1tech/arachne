/**
 * Publish every public `@arachnejs/*` package whose version isn't on npm yet.
 *
 *   bun run release              # publish (CI: after the "Version packages" PR is merged)
 *   bun run release --dry-run    # pack and run `npm publish --dry-run` for each
 *
 * Each package is packed with `bun pm pack` (honours `files`), with its
 * `workspace:` ranges replaced by the workspace packages' versions first
 * (bun would take them from bun.lock, which changesets doesn't update) and
 * the repository's licence files copied in; the packed manifest is checked, then the tarball is published with `npm publish` so npm's
 * trusted publishing (OIDC) and provenance work. Set `NPM_CONFIG_PROVENANCE=true`
 * in CI for provenance. Prints `New tag: <name>@<version>` lines, which
 * changesets/action turns into git tags and GitHub releases.
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/**
 * Replace `workspace:` ranges with the versions of the workspace packages:
 * `workspace:*` → `1.2.3`, `workspace:^` → `^1.2.3`, `workspace:~` → `~1.2.3`.
 */
export function resolveWorkspaceRanges(
	deps: Record<string, string>,
	versions: ReadonlyMap<string, string>,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(deps).map(([name, range]) => {
			if (!range.startsWith("workspace:")) return [name, range];
			const version = versions.get(name);
			if (!version) throw new Error(`${name}: workspace dependency with no workspace package`);
			const spec = range.slice("workspace:".length);
			return [
				name,
				spec === "^" || spec === "~" ? `${spec}${version}` : spec === "*" ? version : spec,
			];
		}),
	);
}

const ROOT = join(import.meta.dir, "..");
const DEP_FIELDS = [
	"dependencies",
	"peerDependencies",
	"optionalDependencies",
	"devDependencies",
] as const;
const LICENSES = ["LICENSE-MIT", "LICENSE-APACHE"];

function run(cmd: string[], cwd = ROOT): { ok: boolean; out: string; stdout: string } {
	const result = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
	const stdout = result.stdout.toString();
	return { ok: result.success, out: `${stdout}${result.stderr}`, stdout };
}

function isPublished(name: string, version: string): boolean {
	const result = run(["npm", "view", `${name}@${version}`, "version"]);
	// stdout only: npm prints config warnings on stderr (seen in CI).
	if (result.ok) return result.stdout.trim() === version;
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

function pack(manifest: Manifest, outDir: string, versions: ReadonlyMap<string, string>): string {
	const dir = join(ROOT, manifest.dir);
	const manifestFile = join(dir, "package.json");
	const original = readFileSync(manifestFile, "utf8");
	const pkg = JSON.parse(original) as Record<string, unknown>;
	for (const field of DEP_FIELDS) {
		const deps = pkg[field] as Record<string, string> | undefined;
		if (deps) pkg[field] = resolveWorkspaceRanges(deps, versions);
	}
	writeFileSync(manifestFile, `${JSON.stringify(pkg, null, "\t")}\n`);
	for (const file of LICENSES) copyFileSync(join(ROOT, file), join(dir, file));
	try {
		const before = new Set(readdirSync(outDir));
		const result = run(["bun", "pm", "pack", "--destination", outDir], dir);
		if (!result.ok) throw new Error(`bun pm pack failed for ${manifest.name}:\n${result.out}`);
		const tarball = readdirSync(outDir).find((file) => !before.has(file) && file.endsWith(".tgz"));
		if (!tarball) throw new Error(`bun pm pack wrote no tarball for ${manifest.name}`);
		checkPacked(join(outDir, tarball), manifest, versions);
		return join(outDir, tarball);
	} finally {
		writeFileSync(manifestFile, original);
		for (const file of LICENSES) rmSync(join(dir, file), { force: true });
	}
}

/** npm's answer when the version exists (EPUBLISHCONFLICT / "previously published"). */
export function alreadyPublished(npmOutput: string): boolean {
	return /EPUBLISHCONFLICT|cannot publish over the previously published versions|You cannot publish over/i.test(
		npmOutput,
	);
}

/** The packed manifest must name this version and the current versions of internal dependencies. */
function checkPacked(
	tarball: string,
	manifest: Manifest,
	versions: ReadonlyMap<string, string>,
): void {
	const result = run(["tar", "-xzOf", tarball, "package/package.json"]);
	if (!result.ok) throw new Error(`can't read ${tarball}:\n${result.out}`);
	const packed = JSON.parse(result.out) as Manifest;
	const wrong = Object.entries(packed.dependencies ?? {}).filter(
		([name, range]) => versions.has(name) && range.replace(/^[\^~]/, "") !== versions.get(name),
	);
	if (packed.version !== manifest.version || wrong.length > 0)
		throw new Error(
			`${manifest.name}: packed manifest is off (version ${packed.version}; ${wrong.map(([n, r]) => `${n}@${r}`).join(", ")})`,
		);
}

if (import.meta.main) {
	const dryRun = process.argv.includes("--dry-run");
	const manifests = readManifests();
	const versions = new Map(manifests.map((m) => [m.name, m.version] as const));
	const plan = releasePlan(manifests, isPublished);
	if (plan.length === 0) {
		console.info("Nothing to publish: every package version is already on npm.");
		process.exit(0);
	}
	const outDir = join(ROOT, ".release");
	rmSync(outDir, { recursive: true, force: true });
	mkdirSync(outDir, { recursive: true });
	for (const manifest of plan) {
		const tarball = pack(manifest, outDir, versions);
		const args = [
			"npm",
			"publish",
			tarball,
			"--access",
			"public",
			...(dryRun ? ["--dry-run"] : []),
		];
		const result = run(args);
		console.info(result.out.trim());
		if (!result.ok && alreadyPublished(result.out)) {
			// The registry's metadata can lag behind a publish (npm view said no).
			// Not new: no "New tag" line, the tag exists already.
			console.info(`${manifest.name}@${manifest.version} is already on npm`);
			continue;
		}
		if (!result.ok) throw new Error(`publishing ${manifest.name}@${manifest.version} failed`);
		if (dryRun) {
			console.info(`would publish ${manifest.name}@${manifest.version}`);
			continue;
		}
		// changesets/action pushes a tag per "New tag:" line: it must exist locally.
		const tag = `${manifest.name}@${manifest.version}`;
		const tagged = run(["git", "tag", tag]);
		if (!tagged.ok && !tagged.out.includes("already exists"))
			throw new Error(`git tag ${tag} failed:\n${tagged.out}`);
		console.info(`New tag: ${tag}`);
	}
	rmSync(outDir, { recursive: true, force: true });
}
