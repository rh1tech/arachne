# @arachne/render

DOM and SSR runtime helpers consumed by code emitted from `@arachne/jsx`
(`@dom-expressions/compiler`). Algorithms adapted from
[dom-expressions](https://github.com/ryansolid/dom-expressions) (MIT).

```ts
import { render, hydrate, Show, For, Suspense } from "@arachne/render";
import { renderToString, renderToStream } from "@arachne/render/ssr";
```

Control-flow builtins (`Show` / `For` / `Suspense`) match the compiler
`builtIns` list. SSR returns trusted `{ t }` fragments so `escape` does not
double-encode component HTML.

Islands: see `@arachne/render/islands`.
