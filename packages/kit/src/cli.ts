import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
	loadMigrations,
	migrate,
	migrationStatus,
	planSchema,
	renderMigration,
	rollback,
} from "@arachne/migrate";
import { openapi, toRoute } from "@arachne/server";
import { build } from "./build.ts";
import { buildSsr } from "./bundle.ts";
import { type AppMode, resolveConfig } from "./config.ts";
import { createProject, TEMPLATES, type TemplateName } from "./create.ts";
import { runDev } from "./dev.ts";
import { preview } from "./preview.ts";
import { loadServer } from "./server-def.ts";

/** Parsed command line: positional arguments and `--flag value` / `--flag` options. */
export interface ParsedArgs {
	/** Positional arguments after the command. */
	positional: string[];
	/** Options (`--port 3000` → `{ port: "3000" }`, `--open` → `{ open: true }`). */
	flags: Record<string, string | true>;
}

/** Parse `argv` (without the command). */
export function parseArgs(argv: readonly string[]): ParsedArgs {
	const positional: string[] = [];
	const flags: Record<string, string | true> = {};
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i] as string;
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}
		const [name, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
		const next = argv[i + 1];
		if (inline !== undefined) flags[name] = inline;
		else if (next !== undefined && !next.startsWith("--")) {
			flags[name] = next;
			i += 1;
		} else flags[name] = true;
	}
	return { positional, flags };
}

const HELP = `arachne <command> [options]

  dev [--port 3000]                     Dev server with hot reload
  build [--mode static|server|api]      Production build (--out dist, --base /)
  start [--port 3000]                   Run dist/server/index.js
  preview [--port 4173]                 Serve a static build locally
  create <dir> [--template ${TEMPLATES.join("|")}]
                                        New project
  routes                                List page and API routes
  openapi [--out openapi.json]          Print or write the OpenAPI document
  migrate [up|down|status|generate]     Database migrations (--steps n, --name x)
  help                                  This text
`;

const str = (value: string | true | undefined) => (typeof value === "string" ? value : undefined);

async function routesCommand(root: string, log: (line: string) => void): Promise<void> {
	const config = await resolveConfig(root);
	if (config.routesFile) {
		const ssr = await buildSsr(config, { dev: false });
		log("Pages:");
		for (const route of ssr.module.routeList())
			log(`  ${route.pattern}${route.id !== route.pattern ? `  (id ${route.id})` : ""}`);
	}
	const server = await loadServer(config, false);
	const api = (server.routes ?? []).map(toRoute);
	if (api.length) {
		log("API:");
		for (const route of api)
			log(`  ${route.method.padEnd(6)} ${route.path}${route.summary ? `  ${route.summary}` : ""}`);
	}
	await server.dispose?.();
}

async function migrateCommand(
	root: string,
	args: ParsedArgs,
	log: (line: string) => void,
): Promise<void> {
	const config = await resolveConfig(root);
	const server = await loadServer(config, false);
	try {
		if (!server.db)
			throw new Error(
				"app/server.ts must return `db` (and `tables` for generate) to run migrations",
			);
		const action = args.positional[0] ?? "up";
		const migrations = await loadMigrations(config.migrationsDir);
		if (action === "up") {
			const { applied } = await migrate(server.db, migrations);
			log(applied.length ? `Applied: ${applied.join(", ")}` : "Up to date");
		} else if (action === "down") {
			const { rolledBack } = await rollback(server.db, migrations, {
				steps: Number(str(args.flags["steps"]) ?? 1),
			});
			log(`Rolled back: ${rolledBack.join(", ") || "nothing"}`);
		} else if (action === "status") {
			const status = await migrationStatus(server.db, migrations);
			for (const m of status.applied) log(`  ✓ ${m.id}  ${m.appliedAt.toISOString()}`);
			for (const m of status.pending) log(`  · ${m.id}  (pending)`);
			for (const id of status.unknown) log(`  ? ${id}  (applied, file missing)`);
		} else if (action === "generate") {
			if (!server.tables)
				throw new Error("app/server.ts must return `tables` for migrate generate");
			const plan = await planSchema(server.db as never, server.tables);
			if (plan.statements.length === 0 && plan.warnings.length === 0)
				return log("Schema matches the database");
			const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
			const id = `${stamp}_${str(args.flags["name"]) ?? "schema"}`;
			const file = join(config.migrationsDir, `${id}.ts`);
			await Bun.write(file, renderMigration(id, plan));
			log(`Wrote ${file}`);
			for (const warning of plan.warnings) log(`  ! ${warning}`);
		} else throw new Error(`unknown migrate action "${action}"`);
	} finally {
		await server.dispose?.();
	}
}

/** Run the CLI. Returns the exit code (long-running commands never return). */
export async function main(
	argv: readonly string[],
	log: (line: string) => void = console.info,
): Promise<number> {
	const [command = "help", ...rest] = argv;
	const args = parseArgs(rest);
	const root = resolve(str(args.flags["root"]) ?? process.cwd());
	const port = str(args.flags["port"]) ? Number(args.flags["port"]) : undefined;
	switch (command) {
		case "dev":
			return runDev({ root, ...(port ? { port } : {}) });
		case "build": {
			const mode = str(args.flags["mode"]) as AppMode | undefined;
			const result = await build(root, {
				...(mode ? { mode } : {}),
				...(str(args.flags["out"]) ? { outDir: str(args.flags["out"]) as string } : {}),
				...(str(args.flags["base"]) ? { base: str(args.flags["base"]) as string } : {}),
			});
			if (result.mode === "static") {
				log(`Built ${result.pages.length} pages into ${result.outDir}`);
				for (const skipped of result.skipped)
					log(`  skipped ${skipped} (add it to \`paths\` in app/server.ts)`);
			} else
				log(`Built ${result.outDir} — run \`arachne start\` (or \`bun ${result.serverEntry}\`)`);
			return 0;
		}
		case "start": {
			const config = await resolveConfig(root);
			const entry = join(config.outDir, "server", "index.js");
			if (!existsSync(entry))
				throw new Error(`no server build at ${entry}; run \`arachne build\` first`);
			const child = Bun.spawn([process.execPath, entry], {
				stdio: ["inherit", "inherit", "inherit"],
				env: { ...process.env, ...(port ? { PORT: String(port) } : {}) },
			});
			return child.exited;
		}
		case "preview": {
			const config = await resolveConfig(root);
			const site = preview({ dir: config.outDir, base: config.base, port: port ?? 4173 });
			log(`Previewing ${config.outDir} on ${site.url}${config.base}`);
			return new Promise<number>(() => {});
		}
		case "create": {
			const dir = args.positional[0];
			if (!dir) throw new Error("usage: arachne create <dir> [--template static|server|api]");
			const template = (str(args.flags["template"]) ?? "server") as TemplateName;
			const target = await createProject(resolve(dir), template);
			log(
				`Created ${template} project in ${target}\n\n  cd ${dir}\n  bun install\n  bun run dev\n`,
			);
			return 0;
		}
		case "routes":
			await routesCommand(root, log);
			return 0;
		case "openapi": {
			const config = await resolveConfig(root);
			const server = await loadServer(config, false);
			const info = server.openapi || { title: "API", version: "0.0.0" };
			const doc = JSON.stringify(
				openapi({ info, routes: (server.routes ?? []).map(toRoute) }),
				null,
				2,
			);
			const out = str(args.flags["out"]);
			if (out) await writeFile(resolve(out), doc);
			else log(doc);
			await server.dispose?.();
			return 0;
		}
		case "migrate":
			await migrateCommand(root, args, log);
			return 0;
		case "help":
		case "--help":
		case "-h":
			log(HELP);
			return 0;
		default:
			log(`Unknown command "${command}"\n\n${HELP}`);
			return 1;
	}
}
