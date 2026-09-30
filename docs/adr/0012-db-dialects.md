# ADR 0012: @arachnejs/db + dialect packages

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

“One schema, many outputs” needs a persistence layer that validates with
`@arachnejs/schema` and talks to real databases without locking the core to a
single driver.

## Decision

1. **`@arachnejs/db`** owns:
   - `column.*` / `defineTable` — columns pair SQL types with Standard Schema
   - `createDb({ dialect, tables })` — typed `insert` / `select` / `delete`
   - `sync()` — `CREATE TABLE IF NOT EXISTS` from table defs
   - Dialect interface (`exec` / `all` / `close`)
2. **Driver packages** (`@arachnejs/db-sqlite`, later postgres/mysql/mongo) implement
   the dialect. Phase 0 ships **SQLite via `bun:sqlite`**.
3. Query surface is intentionally small (equality `where`, no joins yet). Richer
   SQL builders land later without changing `defineTable`.

## Alternatives considered

1. **Drizzle / Kysely as the public API** — rejected; wrong package boundary.
2. **ORM-only with no raw dialect** — rejected; dialects must stay swappable.

## Consequences

- Apps depend on `@arachnejs/db` + one `@arachnejs/db-*` driver.
- Migrations package (`@arachnejs/migrate`) will consume the same table defs.
