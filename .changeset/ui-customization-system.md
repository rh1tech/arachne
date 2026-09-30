---
"@arachnejs/ui": minor
---

Customization system, redesign and accessibility pass across the whole kit. See ADR 0014.

**Customization**

The system covers every component and is enforced by a contract test:

- attributes (`id`, `data-*`, `aria-*`, `on*`, …) are forwarded to the host element;
- a caller's `aria-label` always wins;
- `classes` / `styles` target named slots;
- `unstyled` drops the built-in look;
- `configureUI()` sets app-wide defaults and slot classes;
- all styles live in `@layer arachne.*`, so plain app CSS always overrides them.

Pass-through props are explicitly typed, so misspelled props are compile errors.

**Design and motion**

- A dark theme: `data-theme="dark"`, `"system"`, or a `.a-theme-dark` subtree.
- On-tone ink tokens with guaranteed AA contrast.
- A z-index scale.
- Enter/exit animations through `createPresence()`, and a global reduced-motion policy.
- A redesigned Button (soft, outline and link variants), Tabs (line, pills, enclosed and segmented, with a sliding indicator), Menu, Toast (positions, actions, pause on hover), Accordion and dialogs.

**Behaviour**

- axe reports no violations of any severity, in light or dark, across the showcase.
- A deterministic DOM budget test guards against wrapper and layer regressions.
- Tooltip, Popover and Menu flip and shift to stay in the viewport, and escape `overflow` clipping (`autoPosition`).
- Modal and Drawer:
  - trap focus and restore it on close;
  - Escape closes only the topmost layer;
  - scroll lock compensates for scrollbar width (`--a-scrollbar-gap`).
- WAI-ARIA keyboard models: Tabs, Menu, Tree (with type-ahead), Calendar grid, Navbar menubar, Autocomplete, Rating, PinInput and Spotlight.
- About 40 components stopped freezing their props at mount, and many NaN, leak and timer bugs are fixed.
- Every component server-renders, and hydration keeps ids stable.

**Breaking**

- On `Switch`, `NumberInput` and `SearchInput`, `class` and forwarded attributes now apply to the native `<input>`; style the wrapper through `classes.root`.
- `FeatureCompare`'s root class is `.a-feature-compare` (it used to collide with BeforeAfter's `.a-compare`).
- `ConfirmDialog` renders on the Modal frame as `role="alertdialog"`.
- `Steps` without `onChange` renders no buttons.
- `Spotlight` options are `role="option"` elements.
- Tree markup is `ul[role=tree] > li[role=treeitem]`.
- The default success colour is `#047857`, because white text on the old `#059669` failed AA.
- `Title`: `order` sets the heading level (default `<h2>`) and `size` is visual only. Previously `size` also picked the tag, so `size={5}` produced `<h5>` and broke the outline. `Subtitle` renders a `<p>` unless it has an `order`.
- `FormSection` takes an `order` prop for its title level (default `<h3>`, as before).
