import { describe, expect, test } from "bun:test";
import { col, createDb, defineTable } from "@arachne/db";
import { s } from "@arachne/schema";
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
