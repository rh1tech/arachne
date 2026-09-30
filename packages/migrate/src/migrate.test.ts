import { beforeEach, describe, expect, test } from "bun:test";
import { col, createDb, type DbClient, defineTable } from "@arachnejs/db";
import { sqlite } from "@arachnejs/db-sqlite";
import { s } from "@arachnejs/schema";
import {
	addColumn,
	createTable,
	defineMigration,
	migrate,
	migrationStatus,
	planSchema,
	renderMigration,
	rollback,
	sql,
} from "./index.ts";

const usersV1 = defineTable("users", {
	id: col.integer(s.integer(), { primaryKey: true, autoIncrement: true }),
	email: col.text(s.email(), { unique: true }),
});
const usersV2 = defineTable(
	"users",
	{
		...usersV1.columns,
		name: col.text(s.nullable(s.string()), { default: () => null }),
	},
	{ indexes: [{ columns: ["name"] }] },
);
const posts = defineTable("posts", {
	id: col.integer(s.integer(), { primaryKey: true, autoIncrement: true }),
	title: col.text(s.string()),
});

const migrations = [
	defineMigration({ id: "0001_users", ...createTable(usersV1) }),
	defineMigration({ id: "0002_user_name", ...addColumn(usersV2, "name") }),
	defineMigration({
		id: "0003_seed",
		up: async (db) => {
			await db.execute("INSERT INTO users (email) VALUES (?)", ["root@example.com"]);
		},
		down: async (db) => {
			await db.execute("DELETE FROM users WHERE email = ?", ["root@example.com"]);
		},
	}),
];

// biome-ignore lint/suspicious/noExplicitAny: tables vary per test
let db: DbClient<any>;
beforeEach(() => {
	db = createDb({ dialect: sqlite(), tables: {} });
});

const columns = async (table: string) =>
	(await db.query<{ name: string }>(`PRAGMA table_info("${table}")`)).map((c) => c.name);

describe("migrate", () => {
	test("applies pending migrations in order and records them", async () => {
		const result = await migrate(db, migrations);
		expect(result.applied).toEqual(["0001_users", "0002_user_name", "0003_seed"]);
		expect(await columns("users")).toEqual(["id", "email", "name"]);
		const status = await migrationStatus(db, migrations);
		expect(status.pending).toEqual([]);
		expect(status.applied.map((m) => m.id)).toEqual(["0001_users", "0002_user_name", "0003_seed"]);
		expect((await migrate(db, migrations)).applied).toEqual([]);
	});

	test("a failing migration rolls back and stops the run", async () => {
		const broken = [
			...migrations.slice(0, 1),
			defineMigration({
				id: "0002_broken",
				up: async (tx) => {
					await tx.execute('ALTER TABLE users ADD COLUMN "nick" TEXT');
					await tx.execute("THIS IS NOT SQL");
				},
			}),
			migrations[2] as (typeof migrations)[number],
		];
		await expect(migrate(db, broken)).rejects.toThrow("0002_broken");
		expect(await columns("users")).toEqual(["id", "email"]);
		expect((await migrationStatus(db, broken)).pending.map((m) => m.id)).toEqual([
			"0002_broken",
			"0003_seed",
		]);
	});

	test("rollback undoes the latest migrations", async () => {
		await migrate(db, migrations);
		const result = await rollback(db, migrations, { steps: 2 });
		expect(result.rolledBack).toEqual(["0003_seed", "0002_user_name"]);
		expect(await columns("users")).toEqual(["id", "email"]);
		expect(await db.query("SELECT * FROM users")).toEqual([]);
	});

	test("rollback refuses migrations without down()", async () => {
		const oneWay = [defineMigration({ id: "0001", ...sql("CREATE TABLE t (id INTEGER)") })];
		await migrate(db, oneWay);
		await expect(rollback(db, oneWay)).rejects.toThrow("0001 has no down()");
	});

	test("ids must be unique and sorted", () => {
		expect(() => migrationStatus(db, [migrations[1], migrations[0]] as never)).toThrow("order");
		expect(() => migrationStatus(db, [migrations[0], migrations[0]] as never)).toThrow("duplicate");
	});

	test("status flags applied migrations missing from the list", async () => {
		await migrate(db, migrations);
		const status = await migrationStatus(db, migrations.slice(0, 2));
		expect(status.unknown).toEqual(["0003_seed"]);
	});
});

describe("planSchema", () => {
	test("lists statements for missing tables, columns and indexes", async () => {
		await migrate(db, migrations.slice(0, 1));
		const plan = await planSchema(db, { users: usersV2, posts });
		expect(plan.statements).toEqual([
			'ALTER TABLE "users" ADD COLUMN "name" TEXT',
			'CREATE INDEX IF NOT EXISTS "users_name_idx" ON "users" ("name")',
			'CREATE TABLE IF NOT EXISTS "posts" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "title" TEXT NOT NULL)',
		]);
		expect(plan.warnings).toEqual([]);
	});

	test("warns about changes it cannot apply automatically", async () => {
		await db.execute(
			'CREATE TABLE "users" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "email" TEXT, "legacy" TEXT)',
		);
		const plan = await planSchema(db, { users: usersV1 });
		expect(plan.warnings).toEqual([
			"users.legacy exists in the database but not in the schema (drop it in a migration if intended)",
		]);
	});

	test("renderMigration writes a migration module for the plan", async () => {
		const plan = await planSchema(db, { posts });
		const source = renderMigration("0004_posts", plan);
		expect(source).toContain('import { defineMigration, sql } from "@arachnejs/migrate";');
		expect(source).toContain('id: "0004_posts"');
		expect(source).toContain("CREATE TABLE IF NOT EXISTS");
	});
});
