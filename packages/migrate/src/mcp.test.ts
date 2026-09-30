import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

const tool = (name: string) => {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
};
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

test("plan diffs desired tables against the current schema and renders a migration", async () => {
	const out = parse(
		await tool("arachne_migrate_plan").handler({
			id: "0002_add_name",
			existing: ['CREATE TABLE "users" ("id" INTEGER PRIMARY KEY, "email" TEXT NOT NULL)'],
			tables: [
				{
					name: "users",
					columns: {
						id: { type: "integer", primaryKey: true },
						email: { type: "text" },
						name: { type: "text", schema: { kind: "nullable", of: { kind: "string" } } },
					},
				},
			],
		}),
	);
	expect(out.statements).toEqual(['ALTER TABLE "users" ADD COLUMN "name" TEXT']);
	expect(out.warnings).toEqual([]);
	expect(out.source).toContain('id: "0002_add_name"');
});
