# Theming

The kit's look comes from CSS custom properties (`--a-*`) declared in `@layer arachne.tokens`. Palettes, dark mode and per-component tokens all come down to setting those variables.

Guides: [getting started](getting-started.md) · [customization](customization.md) · **theming** · [accessibility](accessibility.md) · [SSR & hydration](ssr.md) · [component reference](components/README.md)

## Core tokens

| Token | Role |
| --- | --- |
| `--a-ink` | Body text |
| `--a-paper` | Surfaces (cards, inputs, menus) |
| `--a-canvas` | Page background, recessed areas |
| `--a-surface`, `--a-surface-raised` | Alternate and raised surfaces |
| `--a-muted` | Secondary text; meets 4.5:1 on paper and canvas |
| `--a-line`, `--a-hairline` | Borders and dividers |
| `--a-accent`, `--a-accent-soft` | Brand colour and its tinted wash |
| `--a-danger`, `--a-success`, `--a-warning`, `--a-info` | Semantic tones |
| `--a-accent-ink`, `--a-danger-ink`, `--a-success-ink`, `--a-warning-ink`, `--a-info-ink` | Text on a solid tone fill (buttons, badges); chosen for AA contrast |
| `--a-radius` (`--a-radius-none` / `-sm` / `-lg`) | Corner radius |
| `--a-font`, `--a-font-display`, `--a-font-mono` | Typefaces |
| `--a-shadow`, `--a-shadow-md`, `--a-shadow-lg`, `--a-shadow-xl` | Elevation |
| `--a-ring`, `--a-focus-ring` | Focus indication |
| `--a-duration-fast`, `--a-duration`, `--a-duration-slow`, `--a-ease`, `--a-ease-out`, `--a-ease-spring` | Motion |
| `--a-z-sticky`, `--a-z-dropdown`, `--a-z-overlay`, `--a-z-toast`, `--a-z-tooltip` | Stacking order |

If you set tokens by hand, check each tone's `-ink` partner: white text on a light custom accent needs `--a-accent-ink` set to a dark colour. `applyPalette` does this for you when `accentInk` is omitted.

Components add their own tokens on top, e.g. `--a-btn-height`, `--a-modal-width` and `--a-tab-x`. Set them on the component through `style`/`styles`, or in a CSS rule for the component class.

## Palettes

Thirty-two named presets map a brand palette onto these roles. Graphite is the default.

```ts
import { applyPalette, applyRadius, paletteStyle, palettes } from "@arachnejs/ui";

const restore = applyPalette("lagoon"); // writes --a-* variables on <html>; returns an undo function
applyRadius("lg"); // "none" | "sm" (default) | "lg"
applyPalette({ accent: "#7c3aed" }); // partial palette over the defaults; accentInk is picked for contrast
Object.keys(palettes); // preset names
```

Scope a palette to one subtree with an inline style:

```tsx
<section style={paletteStyle("marina")}>…</section>
```

`applyPalette` sets inline custom properties, and inline properties outrank the dark-theme rules. So a palette and dark mode are alternatives on the same element. To support both, apply palettes to a subtree, or switch the palette when the theme changes.

## Dark mode

Three ways to opt in:

```html
<html data-theme="dark">    <!-- always dark -->
<html data-theme="system">  <!-- follow prefers-color-scheme -->
<div class="a-theme-dark">  <!-- one dark subtree -->
```

The dark token set swaps surfaces and ink, uses amber as the accent, and pairs each tone with a dark `-ink`, so filled buttons and badges stay readable. `ThemeToggle` renders the switch. Apply the theme in its `onChange`:

```tsx
<ThemeToggle
	value={theme()}
	onChange={(next) => {
		theme.set(next);
		document.documentElement.dataset.theme = next;
	}}
/>
```

## Motion

Enter and exit animations use the motion tokens and run on `data-state="open" | "closed"`, managed by `createPresence`. Under `prefers-reduced-motion: reduce` every transition and animation collapses, and overlays unmount immediately. To change the feel app-wide, set the duration and easing tokens.
