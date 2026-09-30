# Getting started with @arachnejs/ui

`@arachnejs/ui` is a component kit for Arachne: 330+ components built on `@arachnejs/render` (JSX) and `@arachnejs/signals`. They are accessible by default, they server-render, and you can restyle them without forking.

Guides: **getting started** · [customization](customization.md) · [theming](theming.md) · [accessibility](accessibility.md) · [SSR & hydration](ssr.md) · [component reference](components/README.md)

## Install

```sh
bun add @arachnejs/ui @arachnejs/render @arachnejs/signals
bun add -d @arachnejs/vite
```

The package ships TypeScript/JSX source. Your bundler compiles it together with your app through the Arachne JSX plugin, which handles `.tsx` files in `node_modules` too:

```ts
// build.ts (Bun)
import { bunPlugin } from "@arachnejs/vite";

await Bun.build({ entrypoints: ["./src/client.tsx"], outdir: "dist", plugins: [bunPlugin()] });
```

```ts
// vite.config.ts
import { vitePlugin } from "@arachnejs/vite";

export default { plugins: [vitePlugin()] };
```

TypeScript needs the Arachne JSX runtime:

```json
{ "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "@arachnejs/render" } }
```

## Stylesheet

Import the stylesheet once, from your entry module or your HTML:

```ts
import "@arachnejs/ui/styles.css";
```

All kit rules live in `@layer arachne.tokens, arachne.components`, so your own (unlayered) CSS always wins without specificity fights. See [customization](customization.md).

## First component

```tsx
import { render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { Button, FormField, Stack, TextInput, Title } from "@arachnejs/ui";

function Profile() {
	const name = signal("");
	return (
		<Stack gap="1rem">
			<Title order={1}>Profile</Title>
			<FormField label="Display name" labelFor="name" help="Shown on your public page.">
				<TextInput id="name" value={name()} onInput={(e) => name.set((e.target as HTMLInputElement).value)} />
			</FormField>
			<Button onClick={() => console.info("saved", name())}>Save</Button>
		</Stack>
	);
}

render(() => <Profile />, document.getElementById("app")!);
```

Components take plain values; read signals in JSX (`value={name()}`) and the compiler keeps the binding live. Event delegation is set up automatically by compiled modules, so you don't call `delegateEvents` yourself.

## Next steps

- Browse the [component reference](components/README.md). Every entry has an example, its slots and its props, generated from the source.
- Run the playground (`bun run --cwd apps/playground start`) for live previews of every component.
- Read about [theming](theming.md) (palettes, dark mode, tokens) and [customization](customization.md) (props, slots, `configureUI`).
