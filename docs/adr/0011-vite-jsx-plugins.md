# ADR 0011: @arachne/vite — JSX transform plugins

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

`@arachne/jsx` wraps `@dom-expressions/compiler`, but apps need a bundler hook so
`.tsx` files compile to `@arachne/render` calls. Bun is the primary toolchain;
Vite remains the common app bundler.

## Decision

1. **`@arachne/vite`** exports:
   - `bunPlugin(options?)` — Bun.universal plugin (`onLoad` for `.[jt]sx`)
   - `vitePlugin(options?)` — Vite-compatible `{ name, enforce, transform }`
     object (no hard dependency on `vite`)
2. Both call `compile()` from `@arachne/jsx` with `moduleName: "@arachne/render"`
   (DOM) by default; `target: "ssr"` selects `@arachne/render/ssr`.
3. Playground / apps pass `bunPlugin()` into `Bun.build({ plugins })`.

## Alternatives considered

1. **Only document manual `compile()`** — too awkward for apps.
2. **Put plugins inside `@arachne/jsx`** — keep JSX package compiler-only;
   bundler adapters live in `vite` per the layer map.

## Consequences

- Apps write real JSX. Bun must not apply its React JSX transform to those
  files — the plugin returns already-compiled JS/TS.
