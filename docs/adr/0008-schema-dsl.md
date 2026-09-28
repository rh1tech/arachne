# ADR 0008: @arachne/schema — Standard Schema DSL

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

README promises “one schema, many outputs” (DB, forms, admin, OpenAPI, search).
`@arachne/config` already ships a thin Standard Schema–compatible DSL for boot
config (ADR 0004) and must stay free of a `@arachne/schema` dependency.

## Decision

1. **`@arachne/schema`** owns the rich application schema DSL: `string`,
   `number`, `boolean`, `literal`, `enum`, `object`, `array`, `optional`,
   `nullable`, `defaulted`, `union`, plus `parse` / `safeParse` and
   `Infer<S>` helpers.
2. Schemas implement **Standard Schema V1** (`~standard.validate`).
3. **Config keeps its own thin `c.*` DSL** for bootstrap; apps migrate
   domain models to `s.*` from `@arachne/schema`.
4. Downstream packages (`db`, `forms`, `table`, `admin`, OpenAPI) consume
   Standard Schema values — not a proprietary AST — so third-party schemas
   (zod, valibot, arktype) remain usable where they expose `~standard`.

## Alternatives considered

1. **Promote config’s `c` into schema and re-export** — couples boot config to
   the broader framework; rejected.
2. **zod as the only public API** — rejected; Standard Schema is the contract.

## Consequences

- New packages register `schema` edges in `boundaries.json` (already present).
- MCP surface: validate-via-spec tool + README resource (ADR 0007).
