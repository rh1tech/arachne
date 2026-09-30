# ADR 0001: Monorepo tooling and package boundaries

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

Arachne is a large framework of independently publishable packages. We need a
monorepo that stays fast for local development, enforces downward-only
dependency flow, and produces independently versioned `@arachnejs/*` packages.

## Decision

1. **Bun workspaces** as the package manager and primary test runner.
2. **Turborepo** for the task graph (`build` / `test` / `typecheck`).
3. **Changesets** for versioning and changelogs.
4. **Biome** for lint and format (no ESLint/Prettier).
5. **TypeScript 5.9+** with `strict`, `exactOptionalPropertyTypes`, and
   `noUncheckedIndexedAccess`.
6. **Layer map** enforced by `scripts/check-boundaries.ts`:

   ```
   signals → jsx → render → router → server
   schema → db → db-* → migrate
   schema → forms/table → admin
   acl → db (hooks only; no concrete drivers)
   core composes modules and knows nothing concrete
   ```

   Allowed package-to-package edges are declared in
   `scripts/boundaries.json`. Imports that climb the layer graph fail CI.

## Alternatives considered

1. **pnpm + Nx** — excellent DX, but Bun is the primary runtime; Bun workspaces
   avoid a second package manager.
2. **dependency-cruiser** — mature, but a small Bun script over the declared
   graph is enough for Phase 0 and keeps zero extra Node tooling.

## Consequences

- Every package is independently publishable under `@arachnejs/*`.
- CI runs `bun run boundaries` before typecheck/tests.
- New packages must register allowed edges in `scripts/boundaries.json`.
