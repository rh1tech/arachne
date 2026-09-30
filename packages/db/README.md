# @arachnejs/db

Schema-aware database client: every column pairs a storage class with an
`@arachnejs/schema` schema, so writes and reads are validated and rows are typed.
Drivers: [`@arachnejs/db-sqlite`](../db-sqlite). See
[ADR 0012](../../docs/adr/0012-db-dialects.md).

```ts
import { col, createDb, defineTable } from "@arachnejs/db";
import { sqlite } from "@arachnejs/db-sqlite";
import { s } from "@arachnejs/schema";

export const users = defineTable(
  "users",
  {
    id: col.integer(s.integer(), { primaryKey: true, autoIncrement: true }),
    email: col.text(s.email(), { unique: true }),
    name: col.text(s.string({ min: 1 })),
    age: col.integer(s.nullable(s.integer({ min: 0 })), { default: () => null }), // nullable column
    active: col.boolean(s.boolean(), { default: () => true }),
    settings: col.json(s.object({ theme: s.enum(["light", "dark"]) }), { default: () => ({ theme: "light" }) }),
    createdAt: col.date({ default: () => new Date() }),
  },
  { indexes: [{ columns: ["name"] }] },
);

export const posts = defineTable("posts", {
  id: col.text(s.uuid(), { primaryKey: true, default: () => crypto.randomUUID() }),
  authorId: col.integer(s.integer(), { references: { table: "users", onDelete: "cascade" } }),
  title: col.text(s.string()),
});

const db = createDb({ dialect: sqlite({ path: "app.db" }), tables: { users, posts } });
await db.sync(); // CREATE TABLE / INDEX IF NOT EXISTS — use @arachnejs/migrate for changes
```

- **Nullability comes from the schema**: a column whose schema accepts `null` is nullable.
- **Inserts**: columns with `default` or `autoIncrement` (or optional schemas) are optional
  in `InferInsert`; `values()` returns the stored row including the generated id.

## Queries

```ts
await db.insert(users).values({ email: "ada@example.com", name: "Ada" });
await db.insert(posts).many([{ authorId: 1, title: "One" }, { authorId: 1, title: "Two" }]);

const adults = await db
  .select(users)
  .where({ age: { gte: 18 }, $or: [{ active: true }, { email: { like: "%@example.com" } }] })
  .orderBy("name")
  .limit(20)
  .offset(40)
  .all();
const total = await db.select(users).where({ age: null }).count();

await db.update(users).set({ active: false }).where({ id: 1 }).run(); // → changed rows
await db.delete(users).where({ id: { in: [2, 3] } }).run();         // → deleted rows
```

Operators: `eq ne gt gte lt lte in notIn like isNull`; `null` means `IS NULL`;
`$or` / `$and` nest. Values are always bound parameters. Unknown columns throw
while the query is built. `update`/`delete` refuse to run without `where()`.

## Transactions and raw SQL

```ts
await db.transaction(async (tx) => {
  const user = await tx.insert(users).values({ email, name });
  await tx.insert(posts).values({ authorId: user.id, title: "Hello" });
  await tx.transaction(async (inner) => { /* savepoint */ });
}); // commit, or roll back if the callback throws

const rows = await db.query<{ n: number }>("SELECT COUNT(*) AS n FROM users WHERE age > ?", [20]);
await db.execute("UPDATE users SET name = ? WHERE id = ?", ["Ada", 1]);
```

While a transaction runs, queries issued outside it wait, so concurrent
requests never interleave with it on the single connection.

## Dialects

A `Dialect` implements `exec` (returns `{ changes, lastInsertRowid }`), `all`,
optional `close`, and optional DDL overrides (`types`, `autoIncrement`). SQL
uses `?` placeholders and double-quoted identifiers.

## MCP

`arachne_db_table_sql`, `arachne_db_where_sql`, `arachne_db_simulate`, `arachne_db_api_summary`.
