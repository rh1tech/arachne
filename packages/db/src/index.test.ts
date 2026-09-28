import { describe, expect, test } from "bun:test";
import { s } from "@arachne/schema";
import { createDb } from "../src/client.ts";
import type { Dialect } from "../src/dialect.ts";
import { col, createTableSQL, defineTable } from "../src/table.ts";

function memoryDialect(): Dialect & {
	store: Map<string, Record<string, unknown>[]>;
} {
	const store = new Map<string, Record<string, unknown>[]>();
	return {
		store,
		exec(sql, params = []) {
			const create = /^CREATE TABLE IF NOT EXISTS "([^"]+)"/i.exec(sql);
			if (create?.[1] && !store.has(create[1])) store.set(create[1], []);

			const insert = /^INSERT INTO "([^"]+)" \(([^)]+)\) VALUES/i.exec(sql);
			if (insert?.[1] && insert[2]) {
				const keys = insert[2].split(",").map((k) => k.trim().replaceAll('"', ""));
				const row: Record<string, unknown> = {};
				keys.forEach((key, i) => {
					row[key] = params[i];
				});
				store.get(insert[1])?.push(row);
			}

			const del = /^DELETE FROM "([^"]+)" WHERE "([^"]+)" = \?/i.exec(sql);
			if (del?.[1] && del[2]) {
				const list = store.get(del[1]) ?? [];
				store.set(
					del[1],
					list.filter((row) => row[del[2] as string] !== params[0]),
				);
			}
		},
		all(sql, params = []) {
			const select = /^SELECT \* FROM "([^"]+)"(?: WHERE "([^"]+)" = \?)?/i.exec(sql);
			if (!select?.[1]) return [];
			const list = store.get(select[1]) ?? [];
			if (!select[2]) return [...list];
			return list.filter((row) => row[select[2] as string] === params[0]);
		},
	};
}

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
