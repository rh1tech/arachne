# SSR & hydration

Every `@arachne/ui` component renders on the server and hydrates on the client without rebuilding the DOM. `packages/ui/src/ssr.test.ts` renders every example to a string; `packages/ui/src/hydrate.test.ts` checks the full server → client round trip.

Guides: [getting started](getting-started.md) · [customization](customization.md) · [theming](theming.md) · [accessibility](accessibility.md) · **SSR & hydration** · [component reference](components/README.md)

## Build twice, both hydratable

Compile the app, and with it the kit's `.tsx` sources, once for the server and once for the browser. Hydration keys are only emitted and claimed when both builds set `hydratable: true` (the plugin default is `false`):

```ts
import { bunPlugin } from "@arachne/vite";

await Bun.build({
	entrypoints: ["./src/entry-server.tsx"],
	target: "bun",
	plugins: [bunPlugin({ target: "ssr", hydratable: true })],
});
await Bun.build({
	entrypoints: ["./src/entry-client.tsx"],
	target: "browser",
	plugins: [bunPlugin({ target: "dom", hydratable: true })],
});
```

With `target: "ssr"`, the plugin remaps the kit's `@arachne/render` imports to `@arachne/render/ssr`. The Vite plugin (`vitePlugin`) takes the same options.

## Render and hydrate

```tsx
// entry-server.tsx
import { renderToString, type SSRPayload } from "@arachne/render/ssr";
import { App } from "./app.tsx";

export const html = () => renderToString(() => (<App />) as SSRPayload);
```

```tsx
// entry-client.tsx
import { hydrate } from "@arachne/render";
import { App } from "./app.tsx";

hydrate(() => <App />, document.getElementById("app")!);
```

Include `@arachne/ui/styles.css` in the server-rendered page, as a `<link>` in the document head, so the first paint is already styled.

## What runs where

- **Markup and computeds** run on both sides. Server and client claim elements in the same order, keyed by `data-hk`.
- **Effects are client-only.** Anything a component does in `effect()` is skipped during SSR and starts after hydration finishes. That covers listeners, timers, `ResizeObserver`/`IntersectionObserver`, focus, positioning and measuring. Component code never touches `window` or `document` during render, so the kit is safe to import on the server.
- **Ids are stable.** Generated ids (`createId` → `createUniqueId`) come from a per-render counter, so the ids that link labels, descriptions and ARIA relationships match between server and client. An explicit `id` prop always wins. Pass `renderId` to `renderToString` when one page renders several independent roots.
- **Portals are client-only.** Dialogs (`Modal`, `Drawer`, `BottomSheet`, `ConfirmDialog`) portal to `document.body`: the server emits nothing for them, and they mount after hydration. Start overlays closed on the server and open them from client state.
- **Floating UI is positioned on the client.** `Tooltip`, `Popover` and `Menu` use `autoPosition` with `position: fixed` inside normal DOM order. The server emits them unpositioned; they are placed when they open.

## Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Content is duplicated after hydration | One of the builds lacks `hydratable: true`, or server and client render different trees (e.g. branching on `typeof window`). |
| A label or `aria-describedby` points at the wrong element after hydration | The client renders components in a different order than the server; keep conditional UI driven by the same state on both sides. |
| A component "does nothing" until reload | An event handler or effect depends on data that exists only on the server; pass it to the client (serialized props or an island). |
