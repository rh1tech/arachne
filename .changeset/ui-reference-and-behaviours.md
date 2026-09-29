---
"@arachne/ui": minor
---

Component reference, real implementations for promised behaviours, and duplicate clean-up.

**Documentation**

- Guides in `docs/ui/`: getting started, customization, theming, accessibility, SSR & hydration.
- A component reference generated from the shared examples and the types (`bun run ui:docs`). CI runs `ui:docs --check`.
- Components are grouped into semantic categories (`examples/catalog-map.ts`), with sub-components documented on their parent's page.
- Deprecated props are flagged in the reference.

**Behaviour now implemented**

- `InfiniteScroll` loads automatically through an `IntersectionObserver` on its sentinel. New `rootMargin` prop; the button stays as a fallback.
- `ShareButton` uses the Web Share API (`url`, `title`, `text`) and falls back to copying the link (`copiedLabel`, `onShared`, `data-copied`).
- `Hotkey` can listen for its keys: `onTrigger`, `ignoreInInputs`, and an exported `matchesHotkey()`.
- `CommandBar` and `FloatingToolbar` are ARIA toolbars with roving focus (`label`, `orientation`).
- `KanbanBoard`:
  - drag and drop, plus Alt+arrow keyboard moves;
  - `onMove(cardId, toColumnId, index)`;
  - `columnId` / `cardId` props;
  - moves announced to screen readers.
- `Button` sets `data-disabled` (documented, previously missing), which also covers link buttons.
- `SettingsRow` takes `labelId` / `descriptionId`, and `ToggleRow` labels its switch with them.

**New props**

- `order` (heading level) on `FormArea` (default 4), `ProductCard` (default 4), `ReviewCard` (default 4) and `ArticleTitle` (default 1), so titles fit the page outline.
- `Prose` `measure` (default `true`).
- `Panel` `label`, which names its `<nav>` landmark.
- `AppShell` `contentAs="div"`, for shells nested inside an existing `<main>`.
- `DocPage` / `DocExample` `description` accepts content, not just strings.

**Accessibility fixes**

- `Tree`: a caller's `aria-label` now wins over `label`.
- `RingProgress` / `SemiCircleProgress` have a default accessible name.
- `ScrollArea`, `Reel` and the `CodeBlock` `<pre>` are keyboard-focusable, with a focus ring.
- Contrast:
  - warning headings in `Message` and `Alert`;
  - `JsonTree` strings and booleans, and `LogViewer` timestamps;
  - `HttpMethodBadge` POST/PATCH;
  - dark-theme `ProductCard` badge and `LocaleSwitcher` active state, which now use `--a-accent-ink`.
- The default `--a-muted` is `#56627a`, which meets 4.5:1 on paper and canvas.

**Deprecated**

- `Content` → `Prose` with `measure={false}`.
- `Buttons` → `ButtonGroup` with `attached={false}`.
- `Field` → `FormField`, using `labelFor` / `help`. `FormField` also links the help text with `aria-describedby`.

The deprecated components still work; each is now a thin alias of its replacement.

**Interactive examples**

- Every example now holds real state: controlled components (tabs, inputs, pickers, trees, kanban, …) update when used, and dismissible components can be dismissed and restored.
- Callback-only props use `action()` (`examples/actions.ts`), and the playground shows the calls under each preview.
- Generated snippets are self-contained: they include the helper component, the module-level data it uses, and plain `() => {}` handlers.
- `ScrollSpy` follows sections inside a scroll container (not just the window), activates the last section at the end of the scroll, and highlights a clicked item immediately.
- `Lightbox` demo: arrow keys now change the image (the demo passed `onIndexChange` instead of `onChange`).
