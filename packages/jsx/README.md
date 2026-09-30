# @arachnejs/jsx

Compiles Arachne JSX to DOM or SSR targets via
[`@dom-expressions/compiler`](https://github.com/ryansolid/dom-expressions) (Oxc, MIT).

```ts
import { compile } from "@arachnejs/jsx";

const { code } = compile(source, { target: "dom", filename: "App.tsx" });
```

Island modules (`"use island"`) get a `data-h` hydration strategy hint for the
SSR wrapper transform.
