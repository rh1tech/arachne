# @arachne/vite

Bundler plugins that compile `.tsx` / `.jsx` through `@arachne/jsx` into
`@arachne/render` calls ([ADR 0011](../../docs/adr/0011-vite-jsx-plugins.md)).

## Bun

```ts
import { bunPlugin } from "@arachne/vite";

await Bun.build({
  entrypoints: ["./app.tsx"],
  plugins: [bunPlugin()],
});
```

## Vite

```ts
import { defineConfig } from "vite";
import { vitePlugin } from "@arachne/vite";

export default defineConfig({
  plugins: [vitePlugin()],
});
```
