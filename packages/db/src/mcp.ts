import { Database } from "bun:sqlite";
import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { type SchemaSpec, schemaFromSpec } from "@arachne/schema";
import { schemaSpecSchema } from "@arachne/schema/mcp";
import { z } from "zod";
import { createDb } from "./client.ts";
import { createIndexSQL, createTableSQL } from "./ddl.ts";
import type { Dialect } from "./dialect.ts";
import {
	type ColumnDef,
	type ColumnMap,
	type ColumnOptions,
	col,
	defineTable,
	type SqlType,
	type TableDef,
} from "./table.ts";
import { compileWhere } from "./where.ts";

/** A column described with a SchemaSpec (MCP input). */
interface ColumnSpec {
	type: SqlType;
	schema?: SchemaSpec;
	primaryKey?: boolean;
	autoIncrement?: boolean;
	unique?: boolean;
	references?: {
		table: string;
		column?: string;
		onDelete?: "cascade" | "restrict" | "set null" | "no action";
	};
}

/** A table described with SchemaSpecs (MCP input). */
interface TableSpec {
	name: string;
	columns: Record<string, ColumnSpec>;
	indexes?: Array<{ columns: string[]; unique?: boolean }>;
}

const columnSpecSchema = z.object({
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

const tableSpecSchema = z.object({
	name: z.string().min(1),
	columns: z.record(columnSpecSchema),
	indexes: z
		.array(z.object({ columns: z.array(z.string()), unique: z.boolean().optional() }))
		.optional(),
});

/** Schema used when a column spec omits one. */
const DEFAULT_SPECS: Record<Exclude<SqlType, "date">, SchemaSpec> = {
	text: { kind: "string" },
	integer: { kind: "number", int: true },
	real: { kind: "number" },
	boolean: { kind: "boolean" },
	json: { kind: "object", fields: {} },
};

function toColumn(spec: ColumnSpec): ColumnDef {
	const options = {
		...(spec.primaryKey ? { primaryKey: true } : {}),
		...(spec.autoIncrement ? { autoIncrement: true } : {}),
		...(spec.unique ? { unique: true } : {}),
		...(spec.references ? { references: spec.references } : {}),
	};
	if (spec.type === "date") return col.date(options) as ColumnDef;
	const schema = schemaFromSpec(spec.schema ?? DEFAULT_SPECS[spec.type]);
	const build = col[spec.type] as (schema: never, options: ColumnOptions) => ColumnDef;
	return build(schema as never, options);
}

function toTable(spec: TableSpec): TableDef {
	const columns: ColumnMap = {};
	for (const [name, column] of Object.entries(spec.columns)) columns[name] = toColumn(column);
	return defineTable(spec.name, columns, { indexes: spec.indexes ?? [] });
}

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

/** MCP tools for designing tables and queries with `@arachne/db`. */
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
				const table = toTable(args["table"] as TableSpec);
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
						toTable(args["table"] as TableSpec),
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
				const table = toTable(args["table"] as TableSpec);
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
			description: "Summarize @arachne/db public API.",
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
