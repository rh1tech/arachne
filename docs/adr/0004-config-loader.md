# ADR 0004: @arachnejs/config typed loader

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

Apps need 12-factor configuration: a typed file (`arachne.config.ts`),
environment overrides, and optional CLI flags — validated at boot with clear
errors.

## Decision

`@arachnejs/config` provides:

1. A **schema** built from plain TypeScript validators (Standard Schema–
   compatible shape: `{ "~standard": { validate, version, vendor } }`) plus a
   small built-in schema DSL (`string`, `number`, `boolean`, `object`,
   `optional`, `defaulted`) so Phase 0 does not depend on `@arachnejs/schema`.
2. **Load order** (later wins): defaults → config file → env (`ARACHNE_*` or
   custom prefix, nested via `__`) → explicit overrides / CLI.
3. **Fail-fast**: invalid config throws `ConfigError` with a path-keyed
   message list. Required secrets missing at boot are errors, not warnings.
4. **Runtime-agnostic** file loading via injected `readFile` / `importConfig`
   hooks so Bun, Node, and tests share one path.

Depends only on `@arachnejs/core` (for `ConfigError` base / logger optional).

## Alternatives considered

1. **zod / valibot only** — fine, but we want Standard Schema from day one and
   a zero-dep path for the kernel.
2. **cosmicconfig** — overkill; we own the file name and load rules.

## Consequences

- Apps call `loadConfig(schema, options)` once at boot.
- `@arachnejs/schema` will later implement the richer DSL; config keeps its thin
  built-in validators for bootstrap.
