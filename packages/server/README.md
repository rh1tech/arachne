# @arachnejs/server

HTTP server for Arachne: typed, schema-validated routes, uploads, OpenAPI 3.1,
a typed client, and the middleware an API needs. Runs on `Bun.serve`; `fetch`
works in tests without a port. See [ADR 0010](../../docs/adr/0010-server.md)
and [ADR 0015](../../docs/adr/0015-universal-framework.md).

```bash
bun add @arachnejs/server @arachnejs/schema
```

## Routes

```ts
import { s } from "@arachnejs/schema";
import { createServer, group, HttpError, route } from "@arachnejs/server";

const Order = s.describe(
  s.object({ id: s.uuid(), email: s.email(), total: s.number() }),
  { title: "Order" },
);

export const routes = group({ prefix: "/api/v1", tags: ["orders"] }, [
  route({
    method: "GET",
    path: "/orders/:id",
    params: s.object({ id: s.uuid() }),
    response: { 200: Order },
    handler: async (ctx) => {
      const order = await orders.find(ctx.params.id); // ctx.params.id: string
      if (!order) throw new HttpError(404, "Order not found");
      return order; // serialised with the negotiated codec (JSON by default)
    },
  }),
  route({
    method: "POST",
    path: "/orders",
    query: s.object({ dryRun: s.defaulted(s.coerce.boolean(), false) }),
    body: s.object({
      email: s.email(),
      items: s.array(s.object({ sku: s.string({ min: 1 }), qty: s.integer({ min: 1 }) })),
    }),
    handler: async (ctx) => {
      ctx.status(201);
      return orders.create(ctx.body, { dryRun: ctx.query.dryRun });
    },
  }),
]);

createServer({ routes }).listen(3000);
```

- Without a `params` schema, params are typed from the path (`/users/:id` → `{ id: string }`).
- Failed validation answers **422** with every issue:
  `{ error: { status, code: "validation_failed", message, issues: [{ location, path, message }] } }`.
- Handlers return a `Response` or a value (`undefined` → 204). `ctx.status()`
  and `ctx.header()` shape serialised results.
- Unknown path → 404; known path, other method → **405** with `Allow`; `HEAD` uses `GET`.
- Thrown non-`HttpError`s become a generic 500 (`onError` sees the original).
- Plain `{ method, path, handler }` objects still work.

## Bodies and uploads

| Content-Type | Parsed as |
|---|---|
| `application/json`, `*+json` | JSON |
| `multipart/form-data` | object; files are `File` (validate with `s.file({ maxSize, types })`) |
| `application/x-www-form-urlencoded` | object |
| `application/cbor` | CBOR, with `codecs: [cbor()]` from `@arachnejs/server/cbor` |

Form keys nest: `items[0][qty]`, `address.city`, `tags[]`; repeated keys become
arrays; `__proto__`/`constructor`/`prototype` keys are dropped. Use
`s.coerce.*` to turn form strings into numbers/booleans/dates. Limits:
`bodyLimit` (server, default 1 MiB) and per-route `bodyLimit` → 413.
Responses use the codec picked from `Accept` (JSON by default).

## Context

`ctx.params` · `ctx.query` · `ctx.body` · `ctx.searchParams` ·
`ctx.cookies.get/set/delete` · `ctx.state` (typed via declaration merging) ·
`ctx.route` (`{ method, path, meta, tags }`) · `ctx.ip` · `ctx.requestId` ·
`ctx.nonce` · `ctx.status()` · `ctx.header()`.

```ts
declare module "@arachnejs/server" {
  interface ContextState { user?: { id: string } }
  interface RouteMeta { permission?: string }
}
```

## Middleware

```ts
createServer({
  routes,
  middleware: [
    requestId(),
    securityHeaders(),               // CSP with per-request nonce, HSTS, nosniff, …
    cors({ origin: ["https://app.example"], credentials: true }),
    rateLimit({ windowMs: 60_000, max: 100 }), // RateLimit-* headers, 429 + Retry-After
    serveStatic({ root: "./public", maxAge: 3600 }), // ETag/304, hashed files immutable
  ],
});
```

Middleware sets headers with `ctx.header()` so they also land on error
responses. Headers on a `Response` a handler returns take precedence.
`sse(async (send, signal) => …)` streams server-sent events.

## OpenAPI and the typed client

```ts
import { apiDocs, openapi } from "@arachnejs/server";
createServer({ routes: [...routes, ...apiDocs({ info: { title: "Shop", version: "1" }, routes })] });
// GET /openapi.json (3.1) · GET /docs (Scalar explorer; pass explorerScript to self-host)
```

Titled schemas (`s.describe(schema, { title })`) become `components.schemas`;
bodies containing `s.file()` are documented as `multipart/form-data`;
`openapi: false` hides a route.

```ts
import { createClient } from "@arachnejs/server/client"; // browser-safe
import type { routes } from "./routes.ts";

const api = createClient<typeof routes>({ baseUrl: "https://shop.example" });
const order = await api.get("/api/v1/orders/:id", { params: { id } }); // typed Order
```

Non-2xx responses throw `ApiError` (`status`, `code`, `issues`). Bodies with
`File`s are sent as multipart automatically.

## MCP

`arachne_server_dispatch` (try routes with validation), `arachne_server_openapi`
(OpenAPI from route specs), `arachne_server_api_summary`.
