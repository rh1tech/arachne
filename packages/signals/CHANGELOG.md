# @arachnejs/signals

## 0.4.0

### Patch Changes

- @arachnejs/mcp@0.4.0

## 0.3.0

### Patch Changes

- @arachnejs/mcp@0.3.0

## 0.2.0

### Patch Changes

- @arachnejs/mcp@0.2.0

## 0.1.1

### Patch Changes

- @arachnejs/mcp@0.1.1

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

### Patch Changes

- Updated dependencies [7d5880f]
  - @arachnejs/mcp@0.1.0
