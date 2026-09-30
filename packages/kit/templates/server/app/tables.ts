import { col, defineTable } from "@arachnejs/db";
import { s } from "@arachnejs/schema";

/** A note belongs to one user; deleting the user deletes their notes. */
export const notes = defineTable(
	"notes",
	{
		id: col.text(s.uuid(), { primaryKey: true, default: () => crypto.randomUUID() }),
		userId: col.text(s.string(), { references: { table: "users", onDelete: "cascade" } }),
		title: col.text(s.string({ min: 1, max: 200 })),
		body: col.text(s.string({ max: 10_000 }), { default: () => "" }),
		createdAt: col.date({ default: () => new Date() }),
	},
	{ indexes: [{ columns: ["userId", "createdAt"] }] },
);
