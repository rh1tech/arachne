# @arachne/ui

JSX UI primitives for Arachne ([ADR 0013](../../docs/adr/0013-ui-forms.md)).

330+ accessible, server-renderable components, grouped in the [component reference](../../docs/ui/components/README.md):

- **Buttons & actions**, **Inputs**, **Date & colour pickers**, **Form layout**
- **Overlays**, **Navigation**, **Feedback & status**
- **Data display**, **Stats & charts**, **Layout**, **Typography & content**
- **Commerce & billing**, **Developer & ops**, **Documentation**

Start with the [guides](../../docs/ui/README.md): getting started, customization, theming, accessibility, SSR.

```ts
import {
  Card, CardHeader, CardContent, Hero, HeroBody, Footer, Media,
  Message, MessageHeader, MessageBody, Panel, Tile,
  Icon, IconBadge, Group, Timeline, TimelineItem,
  applyPalette, applyRadius, palettes, paletteStyle,
  m, p, textColor, util,
} from "@arachne/ui";
import "@arachne/ui/styles.css";

applyPalette("graphite"); // or "harbor" | "lagoon" | "meadow" | …
applyRadius("sm"); // none | sm | lg — sm is default
// scoped: <div style={paletteStyle("lagoon")}>…</div>
```

## Customization

Four levels, lightest first (see [ADR 0014](../../docs/adr/0014-ui-customization.md)):

```tsx
// 1. Tokens: global, scoped, or per component
<div style={{ "--a-accent": "#7c3aed", "--a-radius": "12px" }}>…</div>
<Modal styles={{ panel: { "--a-modal-width": "40rem" } }} … />
document.documentElement.dataset.theme = "dark"; // or "system"

// 2. Plain CSS always wins; the kit lives in @layer arachne.*
.a-btn[data-variant="solid"] { border-radius: 999px; }

// 3. Per instance: forwarded attrs, slot classes/styles, content slots, unstyled
<Button data-track="save" aria-label="Save" start={<Icon name="check" />}>Save</Button>
<Modal classes={{ panel: "glass", footer: "sticky" }} … />
<Popover trigger={(t) => <MyButton {...t.attrs}>More</MyButton>} … />
<Tabs unstyled classes={{ tab: "my-tab" }} … />   // state via data-state="active"

// 4. App theme: defaults and classes for every instance
configureUI({ components: { Button: { defaultProps: { size: "sm" } }, Modal: { classes: { panel: "glass" } } } });
```

Motion: overlays run enter/exit keyframes keyed on `data-state="open|closed"`.
Everything collapses under `prefers-reduced-motion`.

## Examples, reference and checks

Each component has one example in `examples/` (grouped by source module; `examples/catalog-map.ts` assigns reference categories and sub-component parts). The same examples feed:

- the customization contract, SSR and hydration tests;
- the playground reference pages (`bun run --cwd apps/playground start`);
- the generated docs (`bun run ui:docs`; CI runs `ui:docs --check`).

`bun run ui:props` fails when a declared prop is never read, or when a prop is read but not claimed in `setup()` and so leaks onto the DOM.
