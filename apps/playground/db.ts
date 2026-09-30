import { col, createDb, defineTable } from "@arachnejs/db";
import { sqlite } from "@arachnejs/db-sqlite";
import { s } from "@arachnejs/schema";

export const notes = defineTable("notes", {
	id: col.text(s.string({ min: 1 }), { primaryKey: true }),
	body: col.text(s.string({ min: 1 })),
	createdAt: col.text(s.string({ min: 1 })),
});

export const db = createDb({
	dialect: sqlite({ path: ":memory:" }),
	tables: { notes },
});

await db.sync();
await db.insert(notes).values({
	id: "seed",
	body: "Schema → SQLite via @arachnejs/db",
	createdAt: new Date().toISOString(),
});
