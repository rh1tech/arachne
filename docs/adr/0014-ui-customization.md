# ADR 0014: UI customization, motion and accessibility primitives

- **Status:** Accepted
- **Date:** 2026-09-29
- **Deciders:** Arachne core

## Context

`@arachne/ui` components accepted only `class`. Apps could not forward `id`,
`data-*`, `aria-*`, `style` or handlers, restyle inner parts, or set app-wide
defaults. The stylesheet was unlayered, so overrides fought specificity.
Overlays mounted and unmounted with no exit motion, and keyboard/focus
behaviour differed across components.

## Decision

Every component supports the same four layers, from lightest to heaviest:

1. **Tokens.** `--a-*` custom properties in `@layer arachne.tokens`, plus
   per-component tokens (`--a-btn-height`, `--a-modal-width`, `--a-tab-x`, …).
   Dark theme: `<html data-theme="dark">`, `data-theme="system"`, or a
   `.a-theme-dark` subtree.
2. **Unlayered CSS wins.** All kit rules live in `@layer arachne.components`,
   so any app CSS overrides them regardless of specificity. State is exposed
   as `data-state`, `data-variant`, `data-size`, `data-placement`, … for
   styling without internal class names.
3. **Per-instance props.**
   - Unknown props are forwarded to the host element (`splitProps` + spread).
   - `classes` / `styles` target named slots (`<Modal classes={{ panel, body }}/>`).
   - `unstyled` drops the built-in `a-*` classes.
   - Content slots (`start`/`end`, `icon`, `trigger`, `render`, `chevron`) replace markup.
4. **App theme.** `configureUI({ components: { Button: { defaultProps, classes, styles } } })`.

Shared primitives:

- `createPresence`: exit animations. The component stays mounted while its
  CSS animation plays, and unmounts immediately under reduced motion.
- `trapFocus` / `whenConnected` / `rovingIndex`: focus management.
- `watchEscape`: a layer stack, so Escape closes only the topmost overlay.
- `DialogFrame`: the shared base for Modal and Drawer, and the intended base
  for BottomSheet and ConfirmDialog.

Framework prerequisites fixed in `@arachne/render` / `@arachne/signals`:

- `untrack` preserves ownership, so component effects are disposed on unmount.
- `spread`, `ref` and `splitProps` are exported; they were emitted by the
  compiler but missing from the runtime.
- `mergeProps` supports function sources.
- ARIA booleans serialize as `"true"` / `"false"`.
- `Show` keeps element children stable while the condition stays truthy.

### Runtime decisions made during the rollout

- **Control flow renders into comment ranges.** `NodeRange` replaces the old
  `display:contents` wrapper spans. Wrapper elements made `<ul>`, `<table>` and
  `<select>` invalid: axe reported 1,100+ list violations from `<For>`.
- **Effects are client-only and hydrate late.** `effect()` is skipped during
  SSR and deferred until hydration finishes, while renderer bindings use
  `renderEffect()`. Server and client then claim nodes in the same order. This
  mirrors Solid's `createEffect` / `createRenderEffect` split.
- **Floating UI uses `position: fixed`, not portals.** `autoPosition()` flips
  and shifts, and corrects for transformed ancestors. Keeping overlays in DOM
  order preserves tab order and outside-click detection.
- **Callers win on accessible names.** Components place their default
  `aria-label` before the attribute spread. The contract test checks this for
  every component.

## Consequences

- Styling precedence changed: kit rules now lose to any unlayered CSS. App
  styles that were accidentally overridden by the kit now apply.
- `Show` function children receive the value and re-run per value; element
  children are no longer recreated on unrelated dependency changes.
- Ids come from `createId` → `createUniqueId`. They are stable between SSR and
  hydration (per-render counter). An explicit `id` prop always wins.
