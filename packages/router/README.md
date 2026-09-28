# @arachne/router

Signal-driven client router for Arachne. Path patterns share the compiler that
future `@arachne/server` route tables will use ([ADR 0009](../../docs/adr/0009-router.md)).

## Install

```bash
bun add @arachne/router
```

## Example

```ts
import { createRouter, memoryHistory } from "@arachne/router";
import { render } from "@arachne/render";

const router = createRouter({
  history: memoryHistory("/"),
  routes: [
    { path: "/", component: () => "home" },
    { path: "/users/:id", component: (p) => `user:${p.params.id}` },
    { path: "*", component: () => "404" },
  ],
});

render(() => router.Outlet(), document.getElementById("app")!);
router.navigate("/users/42");
```
