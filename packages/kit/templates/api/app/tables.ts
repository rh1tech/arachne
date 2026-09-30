import { col, defineTable } from "@arachnejs/db";
import { s } from "@arachnejs/schema";

export const projects = defineTable(
	"projects",
	{
		id: col.text(s.uuid(), { primaryKey: true, default: () => crypto.randomUUID() }),
		ownerId: col.text(s.string(), { references: { table: "users", onDelete: "cascade" } }),
		name: col.text(s.string({ min: 1, max: 120 })),
		status: col.text(s.enum(["planned", "active", "done"]), { default: () => "planned" }),
		budget: col.real(s.nullable(s.number({ min: 0 })), { default: () => null }),
		tags: col.json(s.array(s.string()), { default: () => [] }),
		dueDate: col.date({ schema: s.nullable(s.date()), default: () => null }),
		createdAt: col.date({ default: () => new Date() }),
	},
	{ indexes: [{ columns: ["ownerId", "status"] }] },
);

export const attachments = defineTable("attachments", {
	id: col.text(s.uuid(), { primaryKey: true, default: () => crypto.randomUUID() }),
	projectId: col.text(s.string(), { references: { table: "projects", onDelete: "cascade" } }),
	key: col.text(s.string()),
	name: col.text(s.string()),
	type: col.text(s.string()),
	size: col.integer(s.integer({ min: 0 })),
	createdAt: col.date({ default: () => new Date() }),
});
