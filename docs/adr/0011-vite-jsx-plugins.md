# ADR 0011: @arachnejs/vite — JSX transform plugins

- **Status:** Accepted
- **Date:** 2026-09-28
- **Deciders:** Arachne core

## Context

`@arachnejs/jsx` wraps `@dom-expressions/compiler`, but apps need a bundler hook so
`.tsx` files compile to `@arachnejs/render` calls. Bun is the primary toolchain;
Vite remains the common app bundler.

## Decision

1. **`@arachnejs/vite`** exports:
   - `bunPlugin(options?)` — Bun.universal plugin (`onLoad` for `.[jt]sx`)
   - `vitePlugin(options?)` — Vite-compatible `{ name, enforce, transform }`
     object (no hard dependency on `vite`)
2. Both call `compile()` from `@arachnejs/jsx` with `moduleName: "@arachnejs/render"`
   (DOM) by default; `target: "ssr"` selects `@arachnejs/render/ssr`.
3. Playground / apps pass `bunPlugin()` into `Bun.build({ plugins })`.

## Alternatives considered

1. **Only document manual `compile()`** — too awkward for apps.
2. **Put plugins inside `@arachnejs/jsx`** — keep JSX package compiler-only;
   bundler adapters live in `vite` per the layer map.

## Consequences

- Apps write real JSX. Bun must not apply its React JSX transform to those
  files — the plugin returns already-compiled JS/TS.
