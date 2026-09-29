# Universal framework — progress log

The single source of truth for the "universal web framework" effort (started
2026-09-30). Update this file whenever a milestone lands. A new session should
read this file first, then [ADR 0015](../adr/0015-universal-framework.md).

## Goal (from the product owner)

One framework that builds:

1. **Static sites.** No server; pre-rendered HTML per route, JS routing after
   hydration, minimal bundle, deployable to any static host.
2. **Server-rendered sites.** SSR, API routes, sessions, the works.
3. **API-only services.** Full API features: validation of params/query/body
   (JSON, forms, multipart), file upload, OpenAPI, errors, rate limits, CORS.

The server side must ship the usual account features: registration, login,
logout, email verification, password reset, email sending, access levels
(core ACL), user blocking, sessions and API tokens. Hot reload in development.

## Status legend

- [x] done, tested
- [~] partially done (see notes)
- [ ] not started

## Milestones

| # | Milestone | Package(s) | Status |
|---|-----------|------------|--------|
| 1 | Plan + ADR + this log | docs | [x] |
| 2 | Schema: formats, coercion, refine/transform, record, file, JSON Schema export | `@arachne/schema` | [x] |
| 3 | Server: typed routes with validation, body/multipart parsing, errors, cookies, CORS, security headers, rate limit, static files, groups, OpenAPI | `@arachne/server` | [x] |
| 4 | DB: update, operators, order/limit/offset, count, nullable/json columns, indexes, transactions | `@arachne/db`, `@arachne/db-sqlite` | [ ] |
| 5 | Migrations | `@arachne/migrate` | [ ] |
| 6 | Access control (core) | `@arachne/acl` | [ ] |
| 7 | Mail | `@arachne/mailer` | [ ] |
| 8 | File storage (disk, memory, S3) | `@arachne/storage` | [ ] |
| 9 | Auth: users, sessions, tokens, registration, verification, reset, blocking, groups, throttling, CSRF, HTTP routes | `@arachne/auth` | [ ] |
| 10 | Router: `Link`, click interception, lazy routes, layouts, head | `@arachne/router` | [ ] |
| 11 | Kit: `defineApp`, SSR pages, static prerender build, dev server with hot reload, `arachne` CLI | `@arachne/kit` | [ ] |
| 12 | Examples: static site, full-stack, API-only | `apps/examples/*` | [ ] |
| 12b | Typed API client inferred from routes | `@arachne/server` (`/client`) | [x] |
| 12c | Optional GraphQL adapter over the same schemas | `@arachne/graphql` | [ ] |
| 12e | MCP-first apps: routes → MCP tools (with auth/ACL), `/mcp` endpoint | `@arachne/server`, `@arachne/kit` | [ ] |
| 12d | Binary codecs: CBOR in server (content negotiation); protobuf/Connect later | `@arachne/server` | [~] CBOR done |
| 13 | Docs + README per package, root README update | docs | [ ] |

## Implemented (detail)

### Tooling (2026-09-30)

- `bun run docs:check` (`scripts/check-docs.ts`): every export of the
  packages listed in `scripts/docs-check.json` and every member of exported
  interfaces/classes must have a TSDoc comment. Tested in
  `scripts/check-docs.test.ts`. **Add each package to `docs-check.json` once it
  is fully documented.**
- `bun run typecheck:tests` (`tsconfig.tests.json`): typechecks test files
  (package tsconfigs exclude them). Add each framework package's `src` here.
- `bun run test:scripts`: tests for repo scripts.
- All three run in `bun run ci` and GitHub CI.

### M2 — `@arachne/schema` (2026-09-30)

- Files: `primitives.ts` (string + formats, number, integer, boolean,
  literal, enum, date, file, unknown), `composites.ts` (object with
  `unknownKeys`, pick/omit/partial/extend, array, record, union, optional,
  nullable, defaulted, refine, transform, preprocess, describe,
  `toJSONSchema`), `coerce.ts` (`s.coerce.*`), `helpers.ts` (`~meta`
  metadata: `json()` + `optional`).
- Object types: keys accepting `undefined` are optional (`ObjectType`);
  absent optional keys stay absent in the output.
- `InferInput<S>` exported next to `Infer<S>`.
- MCP: new `arachne_schema_json_schema`; specs accept string `format` and
  `record`.
- Tests: `src/extended.test.ts`, `src/mcp.test.ts`.

### M3 — `@arachne/server` (2026-09-30)

- `route()` (`route.ts`): params/query/headers/body/response schemas; params
  typed from the path when no schema; handler returns `Response` or a value;
  phantom `~types` for the client. `group()` prefixes/tags/meta/middleware and
  flattens nested groups (type-level too — see `PrefixAll` comment).
- `server.ts`: 404 envelope, 405 + `Allow`, HEAD→GET, errors → envelope
  (`errors.ts`), `onError`, `exposeErrors`, `validateResponses`, `trustProxy`,
  `ctx.ip` from `Bun.serve`. Response headers beat `ctx.header()` defaults.
- `context.ts`: `ContextState` / `RouteMeta` are open interfaces for
  declaration merging (auth will add `user`, `permission`).
- `body.ts`: JSON / multipart / urlencoded / codecs, streaming size limit,
  `formToObject` (nested keys, prototype-pollution guard).
- `codec.ts` + `cbor.ts` (`@arachne/server/cbor`, cbor-x): Accept negotiation.
- Middleware: `cors.ts`, `security.ts` (CSP nonce), `rate-limit.ts`
  (pluggable `RateLimitStore`), `request-id.ts`, `static.ts` (`safeJoin`
  traversal guard, ETag, immutable hashed assets), `sse.ts`.
- `openapi.ts`: OpenAPI 3.1 + `apiDocs()` (Scalar explorer with its own CSP).
- `client.ts` (`@arachne/server/client`): `createClient<typeof routes>()`.
- `@arachne/router/path` entry added so the server doesn't load the DOM router.
- MCP: `arachne_server_dispatch` (validating), `arachne_server_openapi`.
- Tests: `route.test.ts`, `body.test.ts`, `middleware.test.ts`,
  `openapi.test.ts`, `mcp.test.ts`, `index.test.ts`.

## Known gaps / next steps

- **Docs backlog:** pre-existing packages not yet in `docs-check.json`
  (counts on 2026-09-30): core 77, router 44, mcp 37, jsx 37, forms 36,
  testing 35, config 25, render 24, signals 21, vite 2. `ui` uses its own
  generator (`bun run ui:docs`).
- Server: no WebSocket helper yet (Bun.serve `websocket` passthrough); no
  compression middleware (expected at the CDN/proxy); multipart bodies are
  buffered in memory up to `bodyLimit` (no streaming to storage yet).
- Lint: new code adds ~9 `noExcessiveCognitiveComplexity` warnings (body
  `assign`, cors/security/static middleware, server `fetch`, openapi
  `operation`, client `call`, schema `validateObject`/`string`) — split in
  a polish pass.
- Schema: async validators are rejected (sync-only by design); no
  discriminated-union optimisation; `lazy`/recursive schemas not supported.

## How to verify

```bash
bun install
bun run ci            # lint, boundaries, docs, mcp contract, typecheck, tests
```
