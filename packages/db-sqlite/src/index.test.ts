import { describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { col, createDb, defineTable } from "@arachnejs/db";
import { s } from "@arachnejs/schema";
import { sqlite } from "../src/index.ts";

describe("sqlite dialect", () => {
	test("roundtrip insert/select/delete", async () => {
		const notes = defineTable("notes", {
			id: col.text(s.string({ min: 1 }), { primaryKey: true }),
			body: col.text(s.string({ min: 1 })),
			pinned: col.boolean(s.boolean()),
		});
		const db = createDb({
			dialect: sqlite({ path: ":memory:" }),
			tables: { notes },
		});
		await db.sync();
		await db.insert(notes).values({ id: "n1", body: "hello", pinned: false });
		expect(await db.select(notes).where({ id: "n1" }).get()).toEqual({
			id: "n1",
			body: "hello",
			pinned: false,
		});
		await db.delete(notes).where({ id: "n1" }).run();
		expect(await db.select(notes).all()).toEqual([]);
		await db.close();
	});
});

describe("sqlite dialect details", () => {
	test("changes count direct rows, not foreign-key cascades", async () => {
		const dialect = sqlite();
		await dialect.exec("CREATE TABLE a (id INTEGER PRIMARY KEY)");
		await dialect.exec(
			"CREATE TABLE b (id INTEGER PRIMARY KEY, a INTEGER REFERENCES a(id) ON DELETE CASCADE)",
		);
		await dialect.exec("INSERT INTO a VALUES (1), (2)");
		const insert = await dialect.exec("INSERT INTO b (a) VALUES (?)", [1]);
		expect(insert).toEqual({ changes: 1, lastInsertRowid: 1 });
		expect(await dialect.exec("DELETE FROM a WHERE id = ?", [1])).toMatchObject({ changes: 1 });
		dialect.close?.();
	});

	test("file databases use WAL and a busy timeout", () => {
		const path = `${tmpdir()}/arachne-sqlite-${Date.now()}.db`;
		const dialect = sqlite({ path });
		expect(dialect.database.query("PRAGMA journal_mode").get()).toEqual({ journal_mode: "wal" });
		expect(dialect.database.query("PRAGMA busy_timeout").get()).toEqual({ timeout: 5000 });
		expect(dialect.name).toBe("sqlite");
		dialect.close?.();
		rmSync(path, { force: true });
	});
});
