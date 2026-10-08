# @arachnejs/router

## 0.2.0

### Patch Changes

- 6486f3e: A failed page load no longer renders the page without its data. With no `error` component, the router shows its own `DefaultErrorPage` ("Something went wrong", or "Not found" for a 404) and logs the failure, in the browser and on the server alike. Before, client-side navigation rendered the page with `data` undefined, which crashed pages that read their data. `DefaultErrorPage` is exported for apps that want to wrap it.
  - @arachnejs/mcp@0.2.0
  - @arachnejs/render@0.2.0
  - @arachnejs/signals@0.2.0

## 0.1.1

### Patch Changes

- Updated dependencies [b6e210c]
  - @arachnejs/render@0.1.1
  - @arachnejs/mcp@0.1.1
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
  - @arachnejs/render@0.1.0
  - @arachnejs/signals@0.1.0
  - @arachnejs/mcp@0.1.0
