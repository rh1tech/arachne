# @arachne/kit

Build **static sites**, **server-rendered apps** and **API-only services**
from one project layout, with a dev server that reloads as you type. See
[ADR 0015](../../docs/adr/0015-universal-framework.md).

```bash
bun run arachne create apps/my-app --template server   # or static | api
cd apps/my-app && bun install && bun run dev
```

> Pre-release: `@arachne/*` isn't on npm yet, and the unscoped `arachne`
> package on npm is unrelated. Run the CLI from a checkout with `bun run arachne`
> (see [Getting started](../../docs/getting-started.md)).

## Project layout

```
arachne.config.ts   defineConfig({ … })          optional
app/routes.tsx      export const routes = [...]   pages (shared by server and browser)
app/server.ts       export default defineServer(…) API, loaders, middleware (server only)
public/             copied as-is (favicon, robots.txt, images)
```

| Mode | When | Output |
|---|---|---|
| `static` | `mode: "static"`, or pages without `app/server.ts` | `dist/**/index.html`, `dist/_data/**.json`, `dist/assets/*`, `404.html`, `sitemap.xml` — host anywhere |
| `server` | pages + `app/server.ts` (default) | `dist/client/*` + `dist/server/index.js` (run with Bun) |
| `api` | no `app/routes.tsx`, or `mode: "api"` | `dist/server/index.js` |

## Pages

`app/routes.tsx` exports `routes` for [`@arachne/router`](../router): nested
layouts, lazy routes, `head`. Optional exports: `NotFound` (404 page) and
`ErrorPage` (loader errors; receives `props.error` with `status`/`message`).
Both render inside the root / matched layouts.

```tsx
export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Layout,                          // props.children = the page
    children: [
      { path: "", component: Home, head: { title: "Home" } },
      { path: "blog/:slug", component: Post, head: ({ data }) => ({ title: (data as Post).title }) },
    ],
  },
];
```

Pages are rendered on the server (or at build time), then hydrated: the
browser adopts the HTML, and `<Link>`s / plain `<a href>`s navigate on the
client, fetching each page's data as JSON. Page data carries the build it came from:
after a deploy, a tab still running the previous build loads the next page
in full instead of mixing old code with new data.

## Server

```ts
// app/server.ts
export default defineServer(async ({ dev, mode, config }) => {
  const db = createDb({ dialect: sqlite({ path: "data/app.db" }), tables });
  const auth = createAuth({ db, mailer, baseUrl: process.env.BASE_URL!, secret: process.env.AUTH_SECRET });
  await auth.setup();
  return {
    middleware: [auth.middleware()],
    routes: [...auth.routes(), ...api],            // @arachne/server routes
    openapi: { title: "My API", version: "1.0.0" }, // → /openapi.json, /docs
    loaders: {                                      // by route id (= full pattern)
      "/blog/:slug": async ({ params, ctx }) => (await posts.find(params.slug)) ?? notFound(),
    },
    paths: { "/blog/:slug": async () => (await posts.all()).map((p) => ({ slug: p.slug })) }, // static builds
    db, tables,                                     // for `arachne migrate`
    dispose: () => db.close(),
  };
});
```

- Loaders run on the server for the first load and behind
  `GET /__arachne/data/<path>` for client navigations (static builds: at build
  time, saved as `_data/<path>.json`). `ctx.state.user` is available after
  auth middleware. Throw `HttpError(404)` for missing records.
- The factory runs once at boot; in static mode only at build time.

## Configuration

```ts
export default defineConfig({
  mode: "server",                               // static | server | api
  base: "/",                                    // e.g. "/docs/" for sub-path deploys
  title: { template: "%s · Site", default: "Site" },
  styles: ["app/styles.css"],                   // bundled, minified, hashed
  head: `<link rel="icon" href="%base%favicon.svg">`,
  hydrate: true,                                // false = zero-JS static pages
  siteUrl: "https://example.com",               // sitemap.xml
  lang: "en",
  port: 3000,                                   // PORT env wins
  server: { bodyLimit: 1_048_576, trustProxy: false, securityHeaders: {} /* or false */ },
  mcp: { name: "my-app", version: "1.0.0" },    // POST /mcp for routes with `mcp: true`
  migrations: { dir: "migrations" },
  document: (parts) => `<!doctype html>…`,      // custom HTML shell
});
```

Security headers (CSP with a per-request nonce, HSTS, nosniff, …) are on by
default in server mode.

## Development

`arachne dev` serves from source:

- Component/page edits rebuild the client and SSR bundles and reload the
  browser; CSS edits swap stylesheets in place; build errors show an overlay
  and recover on the next save.
- Edits to anything `app/server.ts` imports (or the config) restart the
  server process; the browser reconnects and reloads. So does creating or
  deleting `app/server.ts` or `app/routes.tsx`, which changes the mode.
- Dev builds warn in the console about hydration mismatches.

Build errors name the file, line and column.

Stylesheets can point at files in `public/` with root URLs
(`url("/fonts/body.woff2")`); those are left as written. Other absolute
URLs that don't exist fail the build.

## Build and deploy

```bash
arachne build              # mode from config
arachne build --mode static --base /docs/
arachne preview            # serve a static build locally (404.html honoured)
arachne start              # run dist/server/index.js (server/api modes)
```

The server bundle inlines `@arachne/*`; the app's other dependencies stay in
`node_modules`, so deploy with `bun install --production` next to `dist/`.

## CLI

| Command | Description |
|---|---|
| `arachne dev [--port]` | dev server with hot reload |
| `arachne build [--mode] [--out] [--base]` | production build |
| `arachne start [--port]` / `arachne preview [--port]` | run a build |
| `arachne create <dir> --template static\|server\|api` | new project |
| `arachne routes` | list pages and API routes |
| `arachne openapi [--out file]` | OpenAPI document |
| `arachne migrate [up\|down\|status\|generate] [--steps n] [--name x]` | migrations (`db`/`tables` from `app/server.ts`) |

## Templates

- [`templates/static`](templates/static) — editorial blog, build-time data, sitemap
- [`templates/server`](templates/server) — accounts (sign-up, verification, reset), per-user notes with ACL, typed API client, OpenAPI, MCP
- [`templates/api`](templates/api) — projects API: API tokens, validation, pagination, uploads, CORS, rate limits, OpenAPI, MCP

## Programmatic API

`createAppServer({ root, dev })` (in-memory build + `fetch`/`listen`),
`build(root, options)`, `preview({ dir })`, `startDevServer({ root })`,
`resolveConfig(root)`, `defineConfig`, `defineServer`.

## MCP

`arachne_kit_config`, `arachne_kit_routes`, `arachne_kit_build` and
`arachne_kit_create` (both need `confirm: true`), `arachne_kit_api_summary`.

## Testing

`bun test` covers config, SSR, data endpoints, static builds, templates
(including production bundles run as processes) and hot reload.
`bun run e2e` drives Chromium through the fixture (static, SSR, dev) and the
full-stack template.
