# ADR 0015: Universal framework — static, server and API from one codebase

- **Status:** Accepted
- **Date:** 2026-09-30
- **Deciders:** Arachne core

## Context

The packages so far are building blocks (signals, JSX, render, router, a thin
HTTP kernel, schema, SQLite). The product goal is one framework that ships
three kinds of project from the same code:

1. **Static**: pre-rendered HTML per route, hydrated, client-side routing, no
   server at all.
2. **Server**: SSR pages plus API routes, sessions and account features.
3. **API only**: validated JSON/form/multipart endpoints, uploads, OpenAPI.

The server must provide the usual account system: registration, login,
email verification, password reset, mail, access levels, user blocking.
Development needs hot reload.

## Decision

### Runtime and tooling

Bun 1.3 stays the runtime, bundler, test runner and SQLite/S3/password
provider. We rely on built-ins where they are good: `Bun.serve`, `Bun.build`,
`Bun.password` (argon2id), `bun:sqlite`, `Bun.S3Client`, `Bun.CryptoHasher`,
`fs.watch`. Validation stays on Standard Schema; API description is
OpenAPI 3.1 generated from the same schemas (JSON Schema 2020-12).

### Package map (new and extended)

| Package | Role |
|---|---|
| `@arachnejs/schema` | + string formats, coercion, `refine`/`transform`, `record`, `file`, `toJSONSchema` |
| `@arachnejs/server` | + `route()` with schema-validated params/query/body/response, body and multipart parsing, `HttpError`, cookies, CORS, security headers + CSP nonce, rate limiting, static files, route groups, OpenAPI document |
| `@arachnejs/db` | + `update`, operators, ordering, paging, `count`, nullable/json columns, indexes, transactions |
| `@arachnejs/migrate` | versioned migrations with a journal table |
| `@arachnejs/acl` | core access control (see below) |
| `@arachnejs/mailer` | `Mailer` with pluggable transports (SMTP, memory, console) and templates |
| `@arachnejs/storage` | file storage drivers (memory, local disk, S3) used by uploads |
| `@arachnejs/auth` | accounts, sessions, API tokens, verification/reset flows, blocking, throttling, CSRF, HTTP routes and guards |
| `@arachnejs/router` | + `Link`, click interception, lazy routes, nested layouts, head/title |
| `@arachnejs/kit` | `defineApp`, SSR document rendering, static prerender build, dev server with hot reload, the `arachne` CLI |

`scripts/boundaries.json` gains: `server → schema` (validation and OpenAPI),
`auth → server` (auth mounts routes/guards; the server knows nothing about
auth), and a new top layer `kit` that may depend on everything below it.
`auth` talks to mail through a structural `MailSender` interface, so it does
not depend on `@arachnejs/mailer`.

### Access control model

Access control is a core feature in `@arachnejs/acl`, independent of storage:

- **Permissions** are strings `resource:action` with `*` wildcards
  (`posts:*`, `*:read`, `*`).
- **Groups** (roles) hold permission grants and denials and may inherit
  other groups. A user belongs to any number of groups.
- **Direct grants/denials** on a user override groups; **deny beats allow**.
- **Policies** add attribute checks for a permission (`posts:update` is
  allowed if `resource.authorId === user.id`), so ownership rules sit next
  to role rules.
- **Levels** are an optional numeric rank per group (guest 0, user 10,
  moderator 50, admin 100) for "at least moderator" checks and to stop a
  user managing someone of equal or higher rank.

`auth` stores groups and memberships in the database and feeds them to `acl`.

### API style

REST over HTTP with **OpenAPI 3.1** generated from the route schemas is the
primary API style, plus a **typed client** inferred from the route table
(`createClient<typeof api>()`, the tRPC/Hono-RPC approach): end-to-end types
without code generation, HTTP caching, native multipart uploads, and one
schema for validation, docs and forms. **GraphQL** is planned as an optional
adapter (`@arachnejs/graphql`) over the same schemas for clients that need
flexible queries; it is not the default because it complicates caching,
uploads and per-field authorization.

**Wire format.** JSON is the default (native in browsers and tools,
described by OpenAPI). Bodies go through pluggable **codecs** chosen by
`Content-Type` / `Accept` negotiation; the server ships **CBOR**
(RFC 8949, `application/cbor`) as the binary option. It is compact and
schemaless, so the same schemas validate it. **Protobuf** needs stable field
numbers per message, which the schema DSL does not model yet; it is planned
as a Connect-protocol adapter together with GraphQL.

### MCP first

Every new package ships a `./mcp` module (ADR 0007). On top of that, apps are
MCP servers: a route declared with `mcp: true` (or `mcp: { name, description }`)
becomes an MCP tool whose input schema is generated from the route's
params/query/body schemas and whose handler runs the same validation, auth
and ACL checks as the HTTP call. The kit mounts the app's tools on `/mcp`
(Streamable HTTP), authenticated with the same sessions or API tokens.

### Rendering modes

`defineApp({ pages, api, ... })` describes the app once. The kit then:

- `arachne dev` — dev server: SSR pages, API, file watching; server code is
  reloaded in-process, the browser reloads (CSS is swapped without reload)
  over a WebSocket.
- `arachne build --static` — renders every static route to
  `dist/<path>/index.html`, emits a hashed, minified client bundle that
  hydrates and then routes on the client. Dynamic routes list their params
  via `paths()`.
- `arachne build` / `arachne start` — SSR server bundle plus client assets.
- API-only apps simply have no `pages`.

## Alternatives considered

1. **Adopt Hono/Elysia + Lucia/Better Auth.** Mature, but the public API would
   stop being Arachne-shaped and the "one schema, many outputs" contract
   (validation → OpenAPI → forms) would be split across libraries.
2. **Vite as the dev server.** Good HMR, but a second dependency graph next to
   `Bun.build`; the Bun-native path keeps one bundler. `@arachnejs/vite` stays
   available for teams that want Vite.
3. **Pure RBAC.** Simpler, but ownership rules then leak into handlers;
   policies keep them in one place.

## Consequences

- Three new layers in the boundary map (`kit`, `storage`, `mailer` already
  existed); `server` now depends on `schema`.
- Every export is documented with TSDoc; `bun run docs:check` fails CI on
  undocumented exports in framework packages.
- Progress is tracked in [`docs/framework/PROGRESS.md`](../framework/PROGRESS.md).
