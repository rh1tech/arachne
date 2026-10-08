# @arachnejs/kit

## 0.4.0

### Minor Changes

- a0ae864: A route's `head` can set `lang`: the page's `<html lang>`, inner routes winning, for sites in more than one language (`/ru/*` saying `lang: "ru"`). The kit renders it in static, server and dev builds, and the browser's `applyHead` updates it on client navigation, going back to the served page's language on a page that sets none.

### Patch Changes

- Updated dependencies [a0ae864]
  - @arachnejs/router@0.4.0
  - @arachnejs/server@0.4.0
  - @arachnejs/db@0.4.0
  - @arachnejs/jsx@0.4.0
  - @arachnejs/mcp@0.4.0
  - @arachnejs/migrate@0.4.0
  - @arachnejs/render@0.4.0
  - @arachnejs/schema@0.4.0
  - @arachnejs/signals@0.4.0
  - @arachnejs/vite@0.4.0

## 0.3.0

### Patch Changes

- @arachnejs/db@0.3.0
- @arachnejs/jsx@0.3.0
- @arachnejs/mcp@0.3.0
- @arachnejs/migrate@0.3.0
- @arachnejs/render@0.3.0
- @arachnejs/router@0.3.0
- @arachnejs/schema@0.3.0
- @arachnejs/server@0.3.0
- @arachnejs/signals@0.3.0
- @arachnejs/vite@0.3.0

## 0.2.0

### Patch Changes

- 6486f3e: A failed page load no longer renders the page without its data. With no `error` component, the router shows its own `DefaultErrorPage` ("Something went wrong", or "Not found" for a 404) and logs the failure, in the browser and on the server alike. Before, client-side navigation rendered the page with `data` undefined, which crashed pages that read their data. `DefaultErrorPage` is exported for apps that want to wrap it.
- Updated dependencies [6486f3e]
  - @arachnejs/router@0.2.0
  - @arachnejs/server@0.2.0
  - @arachnejs/db@0.2.0
  - @arachnejs/jsx@0.2.0
  - @arachnejs/mcp@0.2.0
  - @arachnejs/migrate@0.2.0
  - @arachnejs/render@0.2.0
  - @arachnejs/schema@0.2.0
  - @arachnejs/signals@0.2.0
  - @arachnejs/vite@0.2.0

## 0.1.1

### Patch Changes

- Client and SSR builds run one at a time, and generated entry files are only rewritten when they change: overlapping builds in one process made Bun on Linux fail intermittently with "EISDIR reading file" for regular files. Build log entries without a source position now show their message.
- Updated dependencies [b6e210c]
  - @arachnejs/render@0.1.1
  - @arachnejs/router@0.1.1
  - @arachnejs/vite@0.1.1
  - @arachnejs/server@0.1.1
  - @arachnejs/db@0.1.1
  - @arachnejs/jsx@0.1.1
  - @arachnejs/mcp@0.1.1
  - @arachnejs/migrate@0.1.1
  - @arachnejs/schema@0.1.1
  - @arachnejs/signals@0.1.1

## 0.1.0

### Minor Changes

- 7d5880f: Universal framework: static sites, server-rendered apps and API-only services.

  - schema: formats, coercion, refine/transform, record, file, JSON Schema export
  - server: typed validated routes, uploads, OpenAPI, typed client, CBOR, middleware, MCP endpoint
  - db: operators, update, paging, count, json/date columns, FKs, indexes, transactions
  - router: layouts, lazy routes, data loading, head, Link, base paths
  - render: dev-mode DOM walkers with hydration-mismatch warnings
  - new: migrate, acl, mailer, storage, auth, kit (dev server with hot reload, builds, CLI, templates)

### Patch Changes

- Updated dependencies [e5b07e4]
- Updated dependencies [1c29d58]
- Updated dependencies [7d5880f]
- Updated dependencies [1c29d58]
  - @arachnejs/render@0.1.0
  - @arachnejs/signals@0.1.0
  - @arachnejs/schema@0.1.0
  - @arachnejs/server@0.1.0
  - @arachnejs/db@0.1.0
  - @arachnejs/router@0.1.0
  - @arachnejs/migrate@0.1.0
  - @arachnejs/mcp@0.1.0
  - @arachnejs/vite@0.1.0
  - @arachnejs/jsx@0.1.0
