import { col, createDb, defineTable } from "@arachne/db";
import { sqlite } from "@arachne/db-sqlite";
import { s } from "@arachne/schema";

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
	body: "Schema → SQLite via @arachne/db",
	createdAt: new Date().toISOString(),
});
