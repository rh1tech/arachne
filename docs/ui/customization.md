# Customization

Every `@arachne/ui` component supports the same four customization layers, lightest first. A contract test enforces the per-instance guarantees for every component. See [ADR 0014](../adr/0014-ui-customization.md) for the design.

Guides: [getting started](getting-started.md) · **customization** · [theming](theming.md) · [accessibility](accessibility.md) · [SSR & hydration](ssr.md) · [component reference](components/README.md)

## 1. Tokens

Design tokens are CSS custom properties (`--a-*`). Set them globally, on a subtree, or on one component:

```tsx
<div style={{ "--a-accent": "#7c3aed", "--a-radius": "12px" }}>…</div>
<Modal styles={{ panel: { "--a-modal-width": "40rem" } }} open={open()} onClose={close} />
```

The token list and palette presets are covered in [theming](theming.md).

## 2. Plain CSS

Kit styles live in `@layer arachne.components`, so any unlayered rule overrides them, whatever its specificity. Components expose their state as attributes (`data-state`, `data-variant`, `data-size`, `data-placement`, `data-tone`, …), so you rarely need internal class names:

```css
.a-btn[data-variant="solid"] { border-radius: 999px; }
.a-tab[data-state="active"] { font-weight: 700; }
```

Component JSDoc lists each component's state attributes (`State: data-copied`, …).

## 3. Per instance

### Shared props

Every component accepts these props in addition to its own:

| Prop | What it does |
| --- | --- |
| `id`, `title`, `role`, `tabindex`, `hidden`, `lang`, `dir`, … | Forwarded to the host element. |
| `data-*`, `aria-*` | Forwarded to the host element. A caller's `aria-label` always wins over the component's default name. |
| `on*` handlers (`onClick`, `onPointerEnter`, …) | Forwarded to the host element. |
| `class` | Merged with the built-in classes on the host (root slot). |
| `style` | Merged onto the host; a string or an object (custom properties allowed). |
| `classes` | Classes for named slots: `classes={{ panel: "glass", footer: "sticky" }}`. |
| `styles` | Styles for named slots: `styles={{ panel: { "--a-modal-width": "40rem" } }}`. |
| `unstyled` | Drops the built-in `a-*` classes; state stays on `data-*` attributes for your own CSS. |

The host is the element that best represents the component. For form controls that is the native `<input>`/`<select>`, so `name`, `required` and `aria-*` land where assistive tech and forms expect them. The wrapper is then targeted with `classes.root`. The [component reference](components/README.md) lists each component's slots.

Pass-through props are typed explicitly, so a misspelled prop is a compile error rather than a silent DOM attribute.

### Content slots

Many components take markup props instead of fixed markup: `start`/`end` on `Button`, `icon`, `action`, `footer`, `trigger`, `render`, `chevron`, and so on.

```tsx
<Button start={<Icon name="plus" />}>New project</Button>
<Popover trigger={(t) => <MyButton {...t.attrs}>More</MyButton>} open={open()} onOpenChange={setOpen}>…</Popover>
```

### Headless use

`unstyled` plus your own classes turns a component into a behaviour-only building block. Keyboard handling, ARIA and focus management stay intact:

```tsx
<Tabs unstyled classes={{ root: "tabs", tab: "tab" }} items={items} value={tab()} onChange={setTab} />
```

```css
.tab[data-state="active"] { border-bottom: 2px solid currentColor; }
```

## 4. App theme

`configureUI` registers default props, slot classes and slot styles per component, for every instance in the app:

```ts
import { configureUI } from "@arachne/ui";

configureUI({
	components: {
		Button: { defaultProps: { size: "sm" }, classes: { root: "btn" } },
		Modal: { classes: { panel: "glass" }, styles: { panel: { "--a-modal-width": "40rem" } } },
	},
});
```

Instance props override theme defaults, and instance classes are added after theme classes. A later `configureUI` call replaces the whole theme, so merge objects yourself when layering themes.

## Precedence summary

From weakest to strongest:

1. Kit CSS (`@layer arachne.*`).
2. `configureUI` defaults and classes.
3. Instance props, `class`/`classes`, `style`/`styles`.
4. Your unlayered CSS, which beats the kit layer. Between your own rules, normal specificity applies.
