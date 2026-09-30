# ADR 0009: @arachnejs/router — signal-driven client router

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

Phase 1 UI needs URL-driven views. Server routing arrives with `@arachnejs/server`;
the client still needs a first-class router that speaks signals and the
`@arachnejs/render` component model.

## Decision

1. **`@arachnejs/router`** owns client routing: path patterns (`:param`, `*rest`),
   nested route tables, `navigate` / `back`, and an `Outlet` that renders the
   matched route component via `@arachnejs/render`.
2. **Location is a signal** (path + search + params). Route components read
   params from router context / props — no VDOM router abstractions.
3. **History adapters**: `memoryHistory` (tests / SSR prep) and
   `browserHistory` (`pushState` / `popstate`). Server URL matching is deferred
   to `@arachnejs/server` and will share the same path compiler.
4. Depends on `signals`, `render`, `jsx` (boundaries), and `mcp`.

## Alternatives considered

1. **Adopt TanStack / Solid Router wholesale** — wrong package boundary; we
   need Arachne-shaped APIs.
2. **Defer all routing to the server package** — blocks playground / SPA demos.

## Consequences

- Playground and future apps use `createRouter` + `Outlet`.
- Path compiler is the shared contract for later server route tables.
