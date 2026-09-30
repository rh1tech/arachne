# ADR 0010: @arachnejs/server — Bun HTTP kernel

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

Client routing landed in `@arachnejs/router`. Apps still need a server that can
match the same path language, speak Request/Response, and boot under Bun
without pulling in Express/Hono as the public API.

## Decision

1. **`@arachnejs/server`** wraps `Bun.serve` with a small route table:
   `{ method, path, handler }`, plus optional middleware and a fallback
   handler (SPA / 404).
2. **Path matching reuses `compilePath` from `@arachnejs/router`** so
   `:param` / `*rest` mean the same on client and server.
3. Handlers receive a **Context** (`request`, `params`, `query`, `url`) and
   return a Web `Response`. Helpers: `json`, `text`, `html`.
4. **`createServer` returns `{ fetch, listen, stop }`** — `fetch` is
   testable without binding a port; `listen` starts Bun.
5. Depends on `router`, `render`, `core`, `config`, `mcp` (layer map). Phase 0
   uses `router` + `mcp` (+ optional `core` later for request-scoped DI).

## Alternatives considered

1. **Export Hono / Elysia as Arachne** — rejected; wrong boundary.
2. **Defer server until after DB** — blocks end-to-end demos.

## Consequences

- Playground can migrate onto `@arachnejs/server`.
- Future SSR will plug `renderToString` into route handlers.
