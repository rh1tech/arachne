# ADR 0006: JSX / signals stack — reuse-first

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

Phase 1 needs fine-grained reactivity and a dual DOM/SSR JSX compile. Writing
both from scratch is the highest-risk “bicycle” in the roadmap. Permissively
licensed building blocks already exist.

## Decision

| Layer | Choice |
|---|---|
| Signals algorithm | **alien-signals** (MIT) — wrapped by `@arachnejs/signals` |
| JSX transform | **`@dom-expressions/compiler`** (Oxc, MIT) — wrapped by `@arachnejs/jsx` |
| DOM/SSR runtime helpers | Implement `@arachnejs/render` against the compiler’s emitted API (template / insert / ssr / hydration), algorithms adapted from **dom-expressions** / Solid (MIT) with attribution |
| Islands, streaming orchestration, serializers, loaders | **Arachne-owned** in `@arachnejs/render` + later packages |

Public APIs stay `@arachnejs/*`. We do **not** adopt Solid/Astro/Qwik as the
application framework.

### Compiled-output contract

Unchanged in spirit from the earlier draft: template hoist + fine-grained
bindings (DOM); escaped string/stream concat (SSR); islands via `<a-island>`;
hydration claim markers. Exact helper names follow what
`@dom-expressions/compiler` emits with `moduleName: "@arachnejs/render"`
(and `@arachnejs/render/ssr`).

### Equivalence invariant

`hydrate(DOM(C), SSR(C, props), props)` ≡ fresh `DOM(C)(props)` mount —
enforced by fixture tests.

## Alternatives considered

1. **Greenfield signals + JSX** — rejected; too much risk for no product gain.
2. **Ship Solid as the UI layer** — rejected; wrong package boundary.
3. **babel-plugin-jsx-dom-expressions only** — fallback if Oxc compiler gaps
   appear; Oxc is preferred (matches Vite/oxc direction).

## Consequences

- `@arachnejs/signals` depends on `alien-signals`.
- `@arachnejs/jsx` depends on `@dom-expressions/compiler`.
- `@arachnejs/render` stays small and owns islands / streaming integration.
- NOTICE / README attribution for reused MIT code.
