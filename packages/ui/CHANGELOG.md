# @arachnejs/ui

## 0.3.0

### Minor Changes

- eb8fb55: `DateRangePicker` shows a weekday row, and takes `weekStartsOn` (0 Sunday, the default, … 6) and `locale`. The trigger shows readable dates ("1 Oct 2026 → 8 Oct 2026") instead of ISO strings; each day button is named with its full date, today is marked (`aria-current="date"`), and days carry `data-date`.

### Patch Changes

- d5444be: `DataTable` scrolls sideways when its columns need more width than the container, instead of clipping the last columns out of sight.
  - @arachnejs/jsx@0.3.0
  - @arachnejs/mcp@0.3.0
  - @arachnejs/render@0.3.0
  - @arachnejs/signals@0.3.0

## 0.2.0

### Minor Changes

- f0d5ac3: `DataTable` grows what an admin console needs, all opt-in (tables without the new props render as before):

  - Column layout: `width` (a CSS grid track such as `"9rem"`, `"2fr"` or `"minmax(8rem,1fr)"`; default `minmax(0, 1fr)`), `align` (`start` / `center` / `end`) and `sortable` (a sort button without `sortValue`, for server sorting; `false` hides it).
  - Server sorting: `sort` (controlled; wins over internal state) and `manualSort` (rows render in the given order and a header click only calls `onSortChange`). The asc → desc → none cycle and `aria-sort` work in every mode, and the sort arrows are now a chevron icon with a faint hint on unsorted sortable headers.
  - Row selection: `selectable`, `selected` (controlled ids), `onSelectionChange` and `selectionLabel`. A checkbox column with a "Select all" header (indeterminate when partial, acts on the rows shown and keeps other ids); selected rows get `data-selected`, `aria-selected="true"` and an accent-soft background.
  - Row links: `rowHref` makes a whole row clickable through a stretched link in the first data cell; checkboxes, buttons and links in cells stay clickable above it, and the row shows a hover style and a focus ring.
  - `stack`: below a 40rem table width (container query) each row becomes a card whose cells show their column header (`data-label`); "Select all" stays available.
  - New slots `select` (checkbox cells) and `link` (row link).

- 2482d11: `TextInput` (and `TextField` in forms) takes an optional `icon`: a leading adornment drawn inside the field, decorative and `aria-hidden`. `TextField` also forwards `autocomplete`. New icons: `key`, `unlink`, `ban`, `logout`, `smartphone`, `shield`.

### Patch Changes

- @arachnejs/jsx@0.2.0
- @arachnejs/mcp@0.2.0
- @arachnejs/render@0.2.0
- @arachnejs/signals@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6e210c]
  - @arachnejs/render@0.1.1
  - @arachnejs/jsx@0.1.1
  - @arachnejs/mcp@0.1.1
  - @arachnejs/signals@0.1.1

## 0.1.0

### Minor Changes

- 1c29d58: Customization system, redesign and accessibility pass across the whole kit. See ADR 0014.

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

- b5613d7: Component reference, real implementations for promised behaviours, and duplicate clean-up.

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

  **Review fixes**

  - `Tree`: node `icon`, `badge` and `disabled`; `filter` for search (shows matches with their ancestors, expanded and highlighted); `icons="auto"` for folder/file icons; `expandOnClick` (default true); `onToggle`.
  - `DatePicker` / `DateRangePicker` dropdowns use `autoPosition`, so overflow and later siblings no longer hide them.
  - `PinInput`: each Backspace deletes one digit.
  - `SearchInput`: uses the search icon, and hides the browser's native clear button (it showed two).
  - `ButtonGroup` (attached): 1px shared borders instead of 2px.
  - `Burger`: the X lines cross at the centre.
  - `AngleSlider`: the arm starts at a hub around the value, so it no longer covers the text.
  - `LoadingOverlay` keeps its parent's rounded corners.
  - `Mark` and `Highlight`: highlighter yellow by default (`--a-highlight`), with the difference documented. `Highlight` gets `tone`.
  - New `variant="plain"` on `Quote` and `Marquee` (no background).
  - `CodeBlock`: new `radius` prop.
  - `ColorSwatch`: new `selected` prop.
  - `Subtitle` defaults to size 3 (1.125rem, above body text).
  - `BackgroundImage` no longer double-encodes URLs (data URIs rendered blank).
  - `CreditCardPreview` uses card proportions.
  - `ProfileHeader`: no `@@` handle, and the avatar overlaps the cover.
  - `PhoneFrame`, `BrowserFrame` and `AspectRatio` media fills the frame.
  - `Thumbnav`: larger thumbnails with a ring on the active one.
  - `TableOfContents`: straight active bar.
  - `Masonry` images fill their column.

  **Complete API docs**

  - Every prop and every field of the data types they use has a JSDoc description (1,170 added). They show in editors, and in the reference as a Default column plus a Types section: object types with field tables, unions with their values.
  - `bun run ui:docs --check` (in CI) fails if any prop or data-type field is undocumented.
  - The reference is one taxonomy of 22 categories, with related components documented together as families (e.g. Colour: ColorInput, ColorPicker, ColorSwatch).

### Patch Changes

- Updated dependencies [e5b07e4]
- Updated dependencies [1c29d58]
- Updated dependencies [7d5880f]
  - @arachnejs/render@0.1.0
  - @arachnejs/signals@0.1.0
  - @arachnejs/mcp@0.1.0
  - @arachnejs/jsx@0.1.0
