import { beforeEach, describe, expect, test } from "bun:test";
import { s } from "@arachne/schema";
import { testDialect } from "./fixtures/bun-sqlite.ts";
import {
	col,
	createDb,
	createTableSQL,
	defineTable,
	type InferInsert,
	type InferRow,
} from "./index.ts";

const users = defineTable(
	"users",
	{
		id: col.integer(s.integer(), { primaryKey: true, autoIncrement: true }),
		email: col.text(s.email(), { unique: true }),
		name: col.text(s.string({ min: 1 })),
		age: col.integer(s.nullable(s.integer({ min: 0 })), { default: () => null }),
		active: col.boolean(s.boolean(), { default: () => true }),
		profile: col.json(s.object({ bio: s.optional(s.string()), tags: s.array(s.string()) }), {
			default: () => ({ tags: [] }),
		}),
		createdAt: col.date({ default: () => new Date("2026-09-30T00:00:00.000Z") }),
	},
	{ indexes: [{ columns: ["name", "age"] }] },
);

const posts = defineTable("posts", {
	id: col.text(s.string(), { primaryKey: true, default: () => crypto.randomUUID() }),
	authorId: col.integer(s.integer(), {
		references: { table: "users", column: "id", onDelete: "cascade" },
	}),
	title: col.text(s.string()),
});

let db: ReturnType<typeof makeDb>;
const makeDb = () => createDb({ dialect: testDialect(), tables: { users, posts } });

beforeEach(async () => {
	db = makeDb();
	await db.sync();
	for (const [email, name, age] of [
		["ada@example.com", "Ada", 36],
		["bob@example.com", "Bob", 17],
		["cy@example.com", "Cy", null],
	] as const) {
		await db.insert(users).values({ email, name, age });
	}
});

describe("schema DDL", () => {
	test("columns, defaults, references and indexes", () => {
		const sql = createTableSQL(posts);
		expect(sql).toContain(
			'"authorId" INTEGER NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE',
		);
		expect(createTableSQL(users)).toContain('"id" INTEGER PRIMARY KEY AUTOINCREMENT');
		expect(createTableSQL(users)).toContain('"age" INTEGER,');
		expect(createTableSQL(users)).toContain('"email" TEXT NOT NULL UNIQUE');
	});

	test("insert types: defaults and auto-increment keys are optional", () => {
		const insert: InferInsert<typeof users.columns> = { email: "d@e.fg", name: "D" };
		const row: InferRow<typeof users.columns> | undefined = undefined;
		expect(insert.name).toBe("D");
		expect(row).toBeUndefined();
	});
});

describe("insert", () => {
	test("fills defaults, returns the stored row with the generated id", async () => {
		const row = await db.insert(users).values({ email: "dee@example.com", name: "Dee" });
		expect(row).toEqual({
			id: 4,
			email: "dee@example.com",
			name: "Dee",
			age: null,
			active: true,
			profile: { tags: [] },
			createdAt: new Date("2026-09-30T00:00:00.000Z"),
		});
	});

	test("json and date columns round-trip", async () => {
		await db.insert(users).values({
			email: "e@example.com",
			name: "E",
			profile: { bio: "hi", tags: ["x"] },
			createdAt: new Date("2020-01-02T03:04:05.000Z"),
		});
		const row = await db.select(users).where({ email: "e@example.com" }).get();
		expect(row?.profile).toEqual({ bio: "hi", tags: ["x"] });
		expect(row?.createdAt).toEqual(new Date("2020-01-02T03:04:05.000Z"));
	});

	test("validation and constraint errors reject", async () => {
		await expect(db.insert(users).values({ email: "bad", name: "X" })).rejects.toThrow("email");
		await expect(
			db.insert(users).values({ email: "ada@example.com", name: "Dup" }),
		).rejects.toThrow();
	});

	test("many() inserts several rows", async () => {
		const rows = await db.insert(posts).many([
			{ authorId: 1, title: "One" },
			{ authorId: 1, title: "Two" },
		]);
		expect(rows).toHaveLength(2);
		expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe("select", () => {
	test("operators, ordering and paging", async () => {
		const adults = await db
			.select(users)
			.where({ age: { gte: 18 } })
			.all();
		expect(adults.map((u) => u.name)).toEqual(["Ada"]);
		const named = await db
			.select(users)
			.where({ name: { in: ["Ada", "Cy"] } })
			.orderBy("name", "desc")
			.all();
		expect(named.map((u) => u.name)).toEqual(["Cy", "Ada"]);
		const noAge = await db.select(users).where({ age: null }).all();
		expect(noAge.map((u) => u.name)).toEqual(["Cy"]);
		const like = await db
			.select(users)
			.where({ email: { like: "%@example.com" }, name: { ne: "Bob" } })
			.all();
		expect(like).toHaveLength(2);
		const page = await db.select(users).orderBy("id").limit(1).offset(1).all();
		expect(page.map((u) => u.name)).toEqual(["Bob"]);
	});

	test("$or groups and count", async () => {
		const either = db.select(users).where({ $or: [{ name: "Ada" }, { age: { lt: 18 } }] });
		expect((await either.all()).map((u) => u.name).sort()).toEqual(["Ada", "Bob"]);
		expect(await either.count()).toBe(2);
		expect(await db.select(users).count()).toBe(3);
	});

	test("where values are parameters, never SQL", async () => {
		const sneaky = await db.select(users).where({ name: "x' OR '1'='1" }).all();
		expect(sneaky).toEqual([]);
	});

	test("unknown columns are rejected", () => {
		expect(() => db.select(users).where({ nope: 1 } as never)).toThrow('unknown column "nope"');
		expect(() => db.select(users).orderBy("nope" as never)).toThrow('unknown column "nope"');
	});
});

describe("update and delete", () => {
	test("update validates, sets and returns the affected count", async () => {
		const count = await db
			.update(users)
			.set({ active: false })
			.where({ age: { lt: 18 } })
			.run();
		expect(count).toBe(1);
		expect((await db.select(users).where({ name: "Bob" }).get())?.active).toBe(false);
		await expect(db.update(users).set({ email: "nope" }).where({ id: 1 }).run()).rejects.toThrow();
	});

	test("update and delete refuse to run without where()", async () => {
		await expect(db.update(users).set({ active: false }).run()).rejects.toThrow("where");
		await expect(db.delete(users).run()).rejects.toThrow("where");
	});

	test("delete cascades through foreign keys", async () => {
		await db.insert(posts).values({ authorId: 1, title: "Hello" });
		expect(await db.delete(users).where({ id: 1 }).run()).toBe(1);
		expect(await db.select(posts).count()).toBe(0);
	});
});

describe("transactions", () => {
	test("commit on success, roll back on error", async () => {
		await db.transaction(async (tx) => {
			await tx.insert(users).values({ email: "t1@example.com", name: "T1" });
		});
		await expect(
			db.transaction(async (tx) => {
				await tx.insert(users).values({ email: "t2@example.com", name: "T2" });
				throw new Error("abort");
			}),
		).rejects.toThrow("abort");
		expect(
			await db
				.select(users)
				.where({ name: { in: ["T1", "T2"] } })
				.count(),
		).toBe(1);
	});

	test("queries outside wait for a running transaction", async () => {
		const order: string[] = [];
		const tx = db.transaction(async (t) => {
			await t.insert(users).values({ email: "w@example.com", name: "W" });
			await new Promise((resolve) => setTimeout(resolve, 20));
			order.push("tx done");
		});
		const outside = db
			.select(users)
			.count()
			.then((n) => {
				order.push(`outside saw ${n}`);
			});
		await Promise.all([tx, outside]);
		expect(order).toEqual(["tx done", "outside saw 4"]);
	});
});

describe("raw SQL", () => {
	test("query and execute take parameters", async () => {
		const rows = await db.query<{ n: number }>(
			"SELECT COUNT(*) AS n FROM users WHERE age > ?",
			[20],
		);
		expect(rows[0]?.n).toBe(1);
		const result = await db.execute("UPDATE users SET name = ? WHERE id = ?", ["Ada L.", 1]);
		expect(result.changes).toBe(1);
	});
});
