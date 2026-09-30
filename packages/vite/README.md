# @arachnejs/vite

Bundler plugins that compile `.tsx` / `.jsx` through `@arachnejs/jsx` into
`@arachnejs/render` calls ([ADR 0011](../../docs/adr/0011-vite-jsx-plugins.md)).

## Bun

```ts
import { bunPlugin } from "@arachnejs/vite";

await Bun.build({
  entrypoints: ["./app.tsx"],
  plugins: [bunPlugin()],
});
```

## Vite

```ts
import { defineConfig } from "vite";
import { vitePlugin } from "@arachnejs/vite";

export default defineConfig({
  plugins: [vitePlugin()],
});
```
