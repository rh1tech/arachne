import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

function tool(name: string) {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

const table = {
	name: "users",
	columns: {
		id: {
			type: "integer",
			schema: { kind: "number", int: true },
			primaryKey: true,
			autoIncrement: true,
		},
		email: { type: "text", schema: { kind: "string", format: "email" }, unique: true },
		age: { type: "integer", schema: { kind: "nullable", of: { kind: "number", int: true } } },
	},
	indexes: [{ columns: ["age"] }],
};

test("table_sql returns CREATE TABLE and index DDL", async () => {
	const out = parse(await tool("arachne_db_table_sql").handler({ table }));
	expect(out.table).toBe(
		'CREATE TABLE IF NOT EXISTS "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT NOT NULL UNIQUE, "age" INTEGER)',
	);
	expect(out.indexes).toEqual(['CREATE INDEX IF NOT EXISTS "users_age_idx" ON "users" ("age")']);
});

test("where_sql compiles filters to parameterised SQL", async () => {
	const out = parse(
		await tool("arachne_db_where_sql").handler({
			table,
			where: { age: { gte: 18 }, $or: [{ email: { like: "%@x.io" } }, { age: null }] },
		}),
	);
	expect(out).toEqual({
		sql: '"age" >= ? AND (("email" LIKE ?) OR ("age" IS NULL))',
		params: [18, "%@x.io"],
	});
});

test("simulate runs inserts and a query against in-memory SQLite", async () => {
	const out = parse(
		await tool("arachne_db_simulate").handler({
			table,
			rows: [
				{ email: "a@x.io", age: 20 },
				{ email: "b@x.io", age: null },
			],
			where: { age: { gte: 18 } },
		}),
	);
	expect(out.rows).toEqual([{ id: 1, email: "a@x.io", age: 20 }]);
});
