# @arachnejs/render

## 0.1.1

### Patch Changes

- b6e210c: `hydrate(code, element, { renderId })` hydrates markup rendered with `renderToString(…, { renderId })`, so several islands can hydrate separately inside one page without hydration-key collisions.
  - @arachnejs/mcp@0.1.1
  - @arachnejs/signals@0.1.1

## 0.1.0

### Minor Changes

- 1c29d58: Runtime correctness for components, SSR and hydration.

  **Behaviour changes**

  - `untrack()` keeps the current owner. Effects created in component bodies are now disposed with the component, where they used to leak listeners, timers and scroll locks after unmount.
  - `<Show>`, `<For>` and `<Suspense>` render into comment-marker ranges (`NodeRange`) instead of a `<span style="display:contents">` host. The resulting DOM is valid inside `<ul>`, `<table>` and `<select>`. Code that selected those wrapper spans must be updated.
  - `<Show>` keeps element children mounted while the condition stays truthy. Function children `(value) => …` still re-run whenever the value changes.
  - ARIA booleans serialize as `"true"` / `"false"`, on the client and in SSR.
  - Component `effect()`s never run on the server and are deferred until hydration finishes. Renderer bindings use the new `renderEffect()`.

  **New**

  - `spread`, `ref`, `splitProps`, `omitProps`, `createUniqueId` (SSR/hydration-stable ids), `NodeRange`, SSR `Portal`, and `withoutEffects` / `isServerRender` / `deferEffects` in signals.
  - `mergeProps` accepts function sources, and later sources win unless their value is `undefined`.

  **Fixes**

  - SSR:
    - implements the compiler's `ssrClassName`, `ssrStyle`, `ssrStyleProperty` and `ssrGroup` helpers (dynamic `class`/`style` used to crash);
    - no longer double-escapes attributes, spread children or markers;
    - omits closing tags for void elements;
    - never serializes handlers.
  - Hydration:
    - claims server nodes by their `data-hk` keys and follows the compiler's marker contract (`getNextMarker`, `insert(…, initial)`);
    - no longer duplicates content;
    - falls back to fresh rendering if a claimed element's tag doesn't match.
  - DOM:
    - camelCase style keys work;
    - text updates patch nodes in place;
    - templates with table-part roots (`<tr>`, `<td>`, …) parse in every DOM implementation.

  Performance: updating 1,000 rows is about 2× faster, thanks to in-place text patching.

- 7d5880f: Universal framework: static sites, server-rendered apps and API-only services.

  - schema: formats, coercion, refine/transform, record, file, JSON Schema export
  - server: typed validated routes, uploads, OpenAPI, typed client, CBOR, middleware, MCP endpoint
  - db: operators, update, paging, count, json/date columns, FKs, indexes, transactions
  - router: layouts, lazy routes, data loading, head, Link, base paths
  - render: dev-mode DOM walkers with hydration-mismatch warnings
  - new: migrate, acl, mailer, storage, auth, kit (dev server with hot reload, builds, CLI, templates)

### Patch Changes

- e5b07e4: Fix three reactivity bugs that made interactive UI look dead:

  - `<Show>` now tracks its children and fallback. A dynamic child such as `<Show when={a()}>{b() ? <X /> : null}</Show>` used to render once and never update. Components inside are still created untracked, so element children stay stable.
  - `insert()` gives arrays that contain accessors their own effect. This covers a component returning a fragment with a dynamic part (`<><Button />{open() ? <Panel /> : null}</>`). Before, its dependencies leaked to whichever effect inserted it: state changes either did nothing or re-rendered, and so reset, the whole enclosing tree.
  - A `Portal` is now also torn down when the owner it was created in is disposed. A portal from a discarded render pass (its bridge never connected) used to stay in `document.body` and cover the page.

- Updated dependencies [1c29d58]
- Updated dependencies [7d5880f]
  - @arachnejs/signals@0.1.0
  - @arachnejs/mcp@0.1.0
