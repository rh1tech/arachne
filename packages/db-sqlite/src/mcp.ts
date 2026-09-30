import { col, createDb, defineTable } from "@arachnejs/db";
import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { s } from "@arachnejs/schema";
import { z } from "zod";
import { sqlite } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "db-sqlite",
	version: "0.0.1",
	tools: [
		{
			name: toolName("db_sqlite", "roundtrip"),
			description: "Create an in-memory SQLite DB, insert a user, select it back.",
			inputSchema: {
				id: z.string().default("1"),
				name: z.string().default("Ada"),
			},
			handler: async (args) => {
				const users = defineTable("users", {
					id: col.text(s.string({ min: 1 }), { primaryKey: true }),
					name: col.text(s.string({ min: 1 })),
				});
				const db = createDb({
					dialect: sqlite({ path: ":memory:" }),
					tables: { users },
				});
				await db.sync();
				await db.insert(users).values({
					id: String(args["id"] ?? "1"),
					name: String(args["name"] ?? "Ada"),
				});
				const rows = await db.select(users).all();
				await db.close();
				return jsonResult({ rows });
			},
		},
		{
			name: toolName("db_sqlite", "api_summary"),
			description: "Summarize @arachnejs/db-sqlite public API.",
			handler: () => textResult("sqlite({ path?: string }) → Dialect for createDb (bun:sqlite)"),
		},
	],
	resources: [
		{
			name: "arachne-db-sqlite-readme",
			uri: "arachne://db-sqlite/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
