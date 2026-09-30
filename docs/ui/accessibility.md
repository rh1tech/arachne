# Accessibility

`@arachnejs/ui` targets WCAG 2.2 AA. Every showcase page is audited with axe in light and dark themes, and the customization contract test checks every component. This guide covers what the kit guarantees and what is still up to you.

Guides: [getting started](getting-started.md) · [customization](customization.md) · [theming](theming.md) · **accessibility** · [SSR & hydration](ssr.md) · [component reference](components/README.md)

## What the kit guarantees

- **Semantic markup.** Buttons are `<button>`, links are `<a>`, tables are `<table>`, and lists render real `<ul>`/`<li>`. Control flow renders into comment ranges rather than wrapper elements, so list and table structure stays valid.
- **Accessible names.** Components that need a name have a sensible default (`Spinner` → "Loading", `Pagination` → "Pagination", `RingProgress` → "Progress", …). A caller's `aria-label` always wins, because defaults are placed before the attribute spread. Many components also take a `label` prop for the name.
- **Keyboard models** follow the WAI-ARIA Authoring Practices:
  - Tabs: arrows, Home/End, automatic or manual activation.
  - Menu: arrows, Home/End, type-ahead, Escape.
  - ContextMenu: opens with Shift+F10 or the ContextMenu key; arrows and Escape.
  - Tree: arrows and type-ahead.
  - Calendar: a date grid with arrows, PageUp/PageDown and Home/End.
  - Navbar: a menubar.
  - Autocomplete, Rating, PinInput and Spotlight.
  - CommandBar and FloatingToolbar: toolbars with roving focus.
  - KanbanBoard: Alt+arrows move cards, and moves are announced.
- **Focus management.**
  - Modal, Drawer, BottomSheet and ConfirmDialog trap focus and restore it on close.
  - Escape closes only the topmost layer.
  - Scroll lock compensates for the scrollbar width.
- **Visible focus.** Every interactive element shows a focus ring (`--a-focus-ring`) for keyboard users, and scrollable regions (`ScrollArea`, `Reel`, `CodeBlock`) are keyboard-focusable.
- **Contrast.**
  - Text tokens meet 4.5:1 in both themes.
  - Each tone has an `-ink` partner for text on solid fills.
  - `applyPalette` picks a readable `accentInk` automatically.
- **Reduced motion.** Under `prefers-reduced-motion: reduce` all animations and transitions collapse, and overlays unmount without exit animations.
- **Live regions.** Toasts, `KanbanBoard` moves and async states announce through `role="status"` / `aria-live`.

## What is up to you

- **Label every form control.** Wrap it in `FormField` (`label` + `labelFor`), which also links `help` and `error` text with `aria-describedby`, or pass `aria-label`:

  ```tsx
  <FormField label="Email" labelFor="email" help="We never share it." error={error()}>
  	<TextInput id="email" type="email" value={email()} />
  </FormField>
  <SearchInput aria-label="Search projects" value={q()} onChange={setQ} />
  ```

- **Keep the heading outline.** Components with titles take an `order` prop for the heading level; `size` is visual only. Examples: `Title`, `Subtitle`, `FormSection`, `FormArea`, `ProductCard`, `ReviewCard`, `ArticleTitle`. Pick the level that fits where the component sits on your page.
- **Name repeated landmarks.** When a page has several `Panel`s (each is a `<nav>`), give each a `label`. Nest an `AppShell` inside an existing `<main>` with `contentAs="div"`.
- **Give skip links a target.** `SkipLink` defaults to `#main`: put `id="main"` (and `tabindex="-1"`) on your main landmark.
- **Provide text alternatives.** Set `alt` on `Image`, `imageAlt` on `ProductCard`, and `beforeAlt`/`afterAlt` on `BeforeAfter`. Leave them empty only for decorative images.
- **Choose colours carefully.** If you override tone tokens, re-check contrast, including the `-ink` partners.

## Testing your app

The kit's own checks are a good template:

- The **contract test** (`packages/ui/src/contract.test.ts`) renders every example and asserts attribute forwarding and that a caller's `aria-label` wins.
- **axe**: run `axe-core` against your pages in a real browser, in both themes, after entry animations finish.
- Test **keyboard paths** end to end (Tab order, Escape, arrows) in Playwright.
