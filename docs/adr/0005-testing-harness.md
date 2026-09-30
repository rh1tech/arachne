# ADR 0005: @arachnejs/testing harness

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

Packages need shared test helpers without pulling Playwright, Testcontainers,
or DB drivers into every unit test.

## Decision

Phase 0 ships a thin `@arachnejs/testing` with:

1. **`createTestApp`** — boots `@arachnejs/core` modules and returns
   `{ app, container, bus, dispose }` with automatic dispose.
2. **`factory`** — typed object factory with overrides and sequences.
3. **`tempDir`** — creates and cleans a temporary directory.
4. **`waitFor`** — polling helper for async conditions.
5. **`mockLogger`** — capturing `Logger` for assertions.

Later phases extend this package (DB fixtures, render helpers, Playwright
fixtures) without breaking these primitives. Optional peer deps are declared
when those helpers land.

Depends on `@arachnejs/core` only.

## Alternatives considered

1. **Per-package ad-hoc helpers** — duplication and drift.
2. **Full harness in Phase 0** — premature; no server/DB yet.

## Consequences

- Unit tests across packages share one harness API.
- Coverage of testing helpers themselves is required (≥ 80%).
