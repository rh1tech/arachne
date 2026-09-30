import { describe, expect, test } from "bun:test";
import { s } from "@arachnejs/schema";
import { testDialect as memoryDialect } from "./fixtures/bun-sqlite.ts";
import { col, createDb, createTableSQL, defineTable } from "./index.ts";

describe("defineTable", () => {
	test("emits create table SQL", () => {
		const users = defineTable("users", {
			id: col.text(s.string(), { primaryKey: true }),
			active: col.boolean(s.boolean()),
		});
		expect(createTableSQL(users)).toContain('"id" TEXT PRIMARY KEY');
		expect(createTableSQL(users)).toContain('"active" INTEGER');
	});
});

describe("createDb", () => {
	test("insert select delete with validation", async () => {
		const users = defineTable("users", {
			id: col.text(s.string({ min: 1 }), { primaryKey: true }),
			name: col.text(s.string({ min: 1 })),
			age: col.integer(s.number({ int: true, min: 0 })),
			active: col.boolean(s.boolean()),
		});
		const dialect = memoryDialect();
		const db = createDb({ dialect, tables: { users } });
		await db.sync();
		await db.insert(users).values({ id: "1", name: "Ada", age: 36, active: true });
		expect(await db.select(users).where({ id: "1" }).get()).toEqual({
			id: "1",
			name: "Ada",
			age: 36,
			active: true,
		});
		await db.delete(users).where({ id: "1" }).run();
		expect(await db.select(users).all()).toEqual([]);
	});

	test("rejects invalid insert", async () => {
		const users = defineTable("users", {
			id: col.text(s.string({ min: 1 }), { primaryKey: true }),
			age: col.integer(s.number({ int: true, min: 0 })),
		});
		const db = createDb({ dialect: memoryDialect(), tables: { users } });
		await db.sync();
		await expect(db.insert(users).values({ id: "", age: 1 })).rejects.toThrow();
	});
});
