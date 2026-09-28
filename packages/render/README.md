# @arachne/render

DOM and SSR runtime helpers consumed by code emitted from `@arachne/jsx`
(`@dom-expressions/compiler`). Algorithms adapted from
[dom-expressions](https://github.com/ryansolid/dom-expressions) (MIT).

```ts
import { render, hydrate } from "@arachne/render";
import { renderToString, renderToStream } from "@arachne/render/ssr";
```

Islands: see `@arachne/render/islands`.
