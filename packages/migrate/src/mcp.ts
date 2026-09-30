import { Database } from "bun:sqlite";
import { createDb, type Dialect, type TableSpec, tableFromSpec } from "@arachne/db";
import { tableSpecSchema } from "@arachne/db/mcp";
import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { planSchema, renderMigration } from "./plan.ts";

function memorySqlite(): Dialect & { close: () => void } {
	const database = new Database(":memory:");
	return {
		name: "sqlite",
		exec(sql, params = []) {
			database.run(sql, params as never[]);
		},
		all: (sql, params = []) => database.query(sql).all(...(params as never[])) as never,
		close: () => database.close(),
	};
}

/** MCP tools for planning migrations with `@arachne/migrate`. */
export const mcpModule = defineMcpModule({
	name: "migrate",
	version: "0.0.1",
	tools: [
		{
			name: toolName("migrate", "plan"),
			description:
				"Diff desired table specs against a current schema (given as CREATE statements) in in-memory SQLite. Returns the statements to run, warnings for changes needing hand-written migrations, and migration module source.",
			inputSchema: {
				id: z.string().default("0001_migration"),
				existing: z.array(z.string()).default([]),
				tables: z.array(tableSpecSchema),
			},
			handler: async (args) => {
				const dialect = memorySqlite();
				const db = createDb({ dialect, tables: {} });
				try {
					for (const statement of args["existing"] as string[]) await db.execute(statement);
					const tables = Object.fromEntries(
						(args["tables"] as TableSpec[]).map((spec) => [spec.name, tableFromSpec(spec)]),
					);
					const plan = await planSchema(db, tables);
					return jsonResult({ ...plan, source: renderMigration(String(args["id"]), plan) });
				} catch (error) {
					return jsonResult({ error: (error as Error).message }, true);
				} finally {
					dialect.close();
				}
			},
		},
		{
			name: toolName("migrate", "api_summary"),
			description: "Summarize @arachne/migrate public API.",
			handler: () =>
				textResult(
					[
						"defineMigration({ id, description?, up(db), down?(db) }) — ids sort ascending",
						"helpers: createTable(table) · addColumn(table, name) · dropTable(name, recreate?) · sql(up, down?)",
						"migrate(db, migrations) → { applied } — one transaction per migration, journal _arachne_migrations",
						"rollback(db, migrations, { steps }) · migrationStatus(db, migrations) → { applied, pending, unknown }",
						"loadMigrations(dir) — default exports, sorted",
						"planSchema(db, tables) → { statements, warnings } · renderMigration(id, plan) → module source",
						"CLI: arachne migrate [up|down|status|generate] (via @arachne/kit)",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-migrate-readme",
			uri: "arachne://migrate/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
