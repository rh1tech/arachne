import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { s } from "@arachne/schema";
import { z } from "zod";
import { createDb } from "./client.ts";
import type { Dialect } from "./dialect.ts";
import { col, createTableSQL, defineTable } from "./table.ts";

function memoryDialect(): Dialect & { rows: Map<string, Record<string, unknown>[]> } {
	const rows = new Map<string, Record<string, unknown>[]>();
	return {
		rows,
		exec(sql, params = []) {
			const create = /^CREATE TABLE IF NOT EXISTS "([^"]+)"/i.exec(sql);
			if (create?.[1] && !rows.has(create[1])) rows.set(create[1], []);

			const insert = /^INSERT INTO "([^"]+)" \(([^)]+)\) VALUES/i.exec(sql);
			if (insert?.[1] && insert[2]) {
				const table = insert[1];
				const keys = insert[2].split(",").map((k) => k.trim().replaceAll('"', ""));
				const row: Record<string, unknown> = {};
				keys.forEach((key, i) => {
					row[key] = params[i];
				});
				rows.get(table)?.push(row);
			}

			const del = /^DELETE FROM "([^"]+)" WHERE "([^"]+)" = \?/i.exec(sql);
			if (del?.[1] && del[2]) {
				const table = del[1];
				const key = del[2];
				const list = rows.get(table) ?? [];
				rows.set(
					table,
					list.filter((row) => row[key] !== params[0]),
				);
			}
		},
		all(sql, params = []) {
			const select = /^SELECT \* FROM "([^"]+)"(?: WHERE "([^"]+)" = \?)?/i.exec(sql);
			if (!select?.[1]) return [];
			const list = rows.get(select[1]) ?? [];
			if (!select[2]) return list as never;
			return list.filter((row) => row[select[2] as string] === params[0]) as never;
		},
	};
}

export const mcpModule = defineMcpModule({
	name: "db",
	version: "0.0.1",
	tools: [
		{
			name: toolName("db", "create_table_sql"),
			description: "Generate CREATE TABLE SQL for a simple demo users table.",
			handler: () => {
				const users = defineTable("users", {
					id: col.text(s.string({ min: 1 }), { primaryKey: true }),
					name: col.text(s.string({ min: 1 })),
					age: col.integer(s.number({ int: true, min: 0 })),
				});
				return jsonResult({ sql: createTableSQL(users) });
			},
		},
		{
			name: toolName("db", "simulate"),
			description: "Insert and select against an in-memory dialect (no SQLite).",
			inputSchema: {
				id: z.string(),
				name: z.string(),
				age: z.number().int(),
			},
			handler: async (args) => {
				const users = defineTable("users", {
					id: col.text(s.string({ min: 1 }), { primaryKey: true }),
					name: col.text(s.string({ min: 1 })),
					age: col.integer(s.number({ int: true, min: 0 })),
				});
				const dialect = memoryDialect();
				const db = createDb({ dialect, tables: { users } });
				await db.sync();
				await db.insert(users).values({
					id: String(args["id"]),
					name: String(args["name"]),
					age: Number(args["age"]),
				});
				const all = await db.select(users).all();
				return jsonResult({ rows: all });
			},
		},
		{
			name: toolName("db", "api_summary"),
			description: "Summarize @arachne/db public API.",
			handler: () =>
				textResult(
					[
						"col.text/integer/real/boolean(schema, opts?)",
						"defineTable(name, columns)",
						"createDb({ dialect, tables })",
						"db.sync / insert / select / delete / close",
						"Drivers: @arachne/db-sqlite (bun:sqlite)",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-db-readme",
			uri: "arachne://db/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
