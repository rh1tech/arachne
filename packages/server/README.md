# @arachne/server

Bun HTTP kernel for Arachne. Same path language as `@arachne/router`
(`:param`, `*rest`). See [ADR 0010](../../docs/adr/0010-server.md).

## Install

```bash
bun add @arachne/server
```

## Example

```ts
import { createServer, json } from "@arachne/server";

const app = createServer({
  port: 3000,
  routes: [
    { method: "GET", path: "/api/health", handler: () => json({ ok: true }) },
    {
      method: "GET",
      path: "/api/users/:id",
      handler: (ctx) => json({ id: ctx.params.id }),
    },
  ],
});

const { url } = app.listen();
console.log(url);
```

Use `app.fetch(request)` in tests without binding a port.
