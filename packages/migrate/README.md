# @arachnejs/migrate

Versioned migrations for [`@arachnejs/db`](../db), plus a schema planner that
diffs your table definitions against the live database and writes the
migration for you.

```ts
// migrations/0001_users.ts
import { createTable, defineMigration } from "@arachnejs/migrate";
import { users } from "../src/tables.ts";
export default defineMigration({ id: "0001_users", ...createTable(users) });

// migrations/0002_user_name.ts
import { addColumn, defineMigration } from "@arachnejs/migrate";
export default defineMigration({ id: "0002_user_name", ...addColumn(users, "name") });

// migrations/0003_backfill.ts — hand-written steps get a transaction-scoped client
export default defineMigration({
  id: "0003_backfill",
  up: async (db) => { await db.execute("UPDATE users SET name = email WHERE name IS NULL"); },
  down: async () => {},
});
```

```ts
import { loadMigrations, migrate, migrationStatus, rollback } from "@arachnejs/migrate";

const migrations = await loadMigrations("./migrations");
await migrate(db, migrations);              // → { applied: [...] }
await rollback(db, migrations, { steps: 1 }); // → { rolledBack: [...] }
await migrationStatus(db, migrations);      // → { applied, pending, unknown }
```

- Ids must be unique and sort ascending (`0001_…` or timestamps).
- Each migration and its journal row (`_arachne_migrations`) commit together;
  a failure rolls that migration back and stops the run (SQLite DDL is transactional).
- `rollback` checks every target has `down()` before touching anything.
- `unknown` lists journal ids with no file (renamed or deleted migrations).

Helpers: `createTable(table)`, `addColumn(table, name)`, `dropTable(name, recreate?)`,
`sql(up, down?)`.

## Planning

```ts
import { planSchema, renderMigration } from "@arachnejs/migrate";

const plan = await planSchema(db, { users, posts });
// plan.statements: ALTER TABLE … ADD COLUMN …, CREATE INDEX …, CREATE TABLE …
// plan.warnings:   drops, type changes, NOT NULL adds — never planned automatically
await Bun.write("migrations/0004_sync.ts", renderMigration("0004_sync", plan));
```

`planSchema` introspects SQLite (`PRAGMA table_info` / `index_list`). The kit
CLI wraps this as `arachne migrate generate`.

## MCP

`arachne_migrate_plan` (current schema SQL + desired table specs → plan and
migration source), `arachne_migrate_api_summary`.
