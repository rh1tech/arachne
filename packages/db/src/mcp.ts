import { Database } from "bun:sqlite";
import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { schemaSpecSchema } from "@arachnejs/schema/mcp";
import { z } from "zod";
import { createDb } from "./client.ts";
import { createIndexSQL, createTableSQL } from "./ddl.ts";
import type { Dialect } from "./dialect.ts";
import { type TableSpec, tableFromSpec } from "./spec.ts";
import { compileWhere } from "./where.ts";

/** Zod validator for a column spec. */
export const columnSpecSchema = z.object({
	type: z.enum(["text", "integer", "real", "boolean", "json", "date"]),
	schema: schemaSpecSchema.optional(),
	primaryKey: z.boolean().optional(),
	autoIncrement: z.boolean().optional(),
	unique: z.boolean().optional(),
	references: z
		.object({
			table: z.string(),
			column: z.string().optional(),
			onDelete: z.enum(["cascade", "restrict", "set null", "no action"]).optional(),
		})
		.optional(),
});

/** Zod validator for a {@link TableSpec}, shared with other MCP modules. */
export const tableSpecSchema = z.object({
	name: z.string().min(1),
	columns: z.record(columnSpecSchema),
	indexes: z
		.array(z.object({ columns: z.array(z.string()), unique: z.boolean().optional() }))
		.optional(),
});

function memorySqlite(): Dialect & { close: () => void } {
	const database = new Database(":memory:");
	return {
		name: "sqlite",
		exec(sql, params = []) {
			const result = database.run(sql, params as never[]);
			return { changes: result.changes, lastInsertRowid: Number(result.lastInsertRowid) };
		},
		all: (sql, params = []) => database.query(sql).all(...(params as never[])) as never,
		close: () => database.close(),
	};
}

/** MCP tools for designing tables and queries with `@arachnejs/db`. */
export const mcpModule = defineMcpModule({
	name: "db",
	version: "0.0.1",
	tools: [
		{
			name: toolName("db", "table_sql"),
			description:
				"Generate CREATE TABLE and CREATE INDEX SQL for a table spec (columns: type, SchemaSpec, primaryKey, autoIncrement, unique, references). Nullability follows the schema.",
			inputSchema: { table: tableSpecSchema },
			handler: (args) => {
				const table = tableFromSpec(args["table"] as TableSpec);
				return jsonResult({ table: createTableSQL(table), indexes: createIndexSQL(table) });
			},
		},
		{
			name: toolName("db", "where_sql"),
			description:
				"Compile a filter ({ col: value | { gt, gte, lt, lte, ne, in, notIn, like, isNull }, $or, $and }) to parameterised SQL for a table spec.",
			inputSchema: { table: tableSpecSchema, where: z.record(z.unknown()) },
			handler: (args) =>
				jsonResult(
					compileWhere(
						tableFromSpec(args["table"] as TableSpec),
						args["where"] as Record<string, unknown>,
					),
				),
		},
		{
			name: toolName("db", "simulate"),
			description:
				"Create a table spec in in-memory SQLite, insert rows (validated), then select with an optional filter. Nothing persists.",
			inputSchema: {
				table: tableSpecSchema,
				rows: z.array(z.record(z.unknown())),
				where: z.record(z.unknown()).optional(),
			},
			handler: async (args) => {
				const table = tableFromSpec(args["table"] as TableSpec);
				const dialect = memorySqlite();
				const db = createDb({ dialect, tables: { [table.name]: table } });
				try {
					await db.sync();
					for (const row of args["rows"] as Record<string, unknown>[]) {
						await db.insert(table).values(row as never);
					}
					const query = db.select(table);
					if (args["where"]) query.where(args["where"] as never);
					return jsonResult({ rows: await query.all() });
				} catch (error) {
					return jsonResult({ error: (error as Error).message }, true);
				} finally {
					dialect.close();
				}
			},
		},
		{
			name: toolName("db", "api_summary"),
			description: "Summarize @arachnejs/db public API.",
			handler: () =>
				textResult(
					[
						"col.text/integer/real/boolean/json(schema, opts?) · col.date(opts?)",
						"opts: primaryKey, autoIncrement, unique, notNull, default: () => value, references: { table, column, onDelete }",
						"defineTable(name, columns, { indexes: [{ columns, unique }] }) · InferRow / InferInsert",
						"createDb({ dialect, tables }) · db.sync()",
						"db.insert(t).values(row) / .many(rows) — defaults applied, generated id returned",
						"db.select(t).where(filter).orderBy(col, dir).limit(n).offset(n).all() / get() / count()",
						"filter: { col: value | null | { eq, ne, gt, gte, lt, lte, in, notIn, like, isNull }, $or: [...], $and: [...] }",
						"db.update(t).set(values).where(filter).run() → changed rows · db.delete(t).where(filter).run()",
						"db.transaction(async (tx) => …) — savepoints when nested · db.query(sql, params) · db.execute(sql, params)",
						"Drivers: @arachnejs/db-sqlite (bun:sqlite)",
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
