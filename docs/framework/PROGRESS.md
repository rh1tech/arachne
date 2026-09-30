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

Guide for users: [README.md](README.md). Resume here: check "Known gaps /
next steps" at the bottom, run `bun run ci` and `(cd packages/kit && bun run e2e)`.

## Milestones

| # | Milestone | Package(s) | Status |
|---|-----------|------------|--------|
| 1 | Plan + ADR + this log | docs | [x] |
| 2 | Schema: formats, coercion, refine/transform, record, file, JSON Schema export | `@arachnejs/schema` | [x] |
| 3 | Server: typed routes with validation, body/multipart parsing, errors, cookies, CORS, security headers, rate limit, static files, groups, OpenAPI | `@arachnejs/server` | [x] |
| 4 | DB: update, operators, order/limit/offset, count, nullable/json columns, indexes, transactions | `@arachnejs/db`, `@arachnejs/db-sqlite` | [x] |
| 5 | Migrations | `@arachnejs/migrate` | [x] |
| 6 | Access control (core) | `@arachnejs/acl` | [x] |
| 7 | Mail | `@arachnejs/mailer` | [x] |
| 8 | File storage (disk, memory, S3) | `@arachnejs/storage` | [x] |
| 9 | Auth: users, sessions, tokens, registration, verification, reset, blocking, groups, throttling, CSRF, HTTP routes | `@arachnejs/auth` | [x] |
| 10 | Router: `Link`, click interception, lazy routes, layouts, head | `@arachnejs/router` | [x] |
| 11 | Kit: config, SSR pages, static prerender build, dev server with hot reload, `arachne` CLI | `@arachnejs/kit` | [x] |
| 12 | Examples: static site, full-stack, API-only | `packages/kit/templates/*` | [x] |
| 12b | Typed API client inferred from routes | `@arachnejs/server` (`/client`) | [x] |
| 12c | Optional GraphQL adapter over the same schemas | `@arachnejs/graphql` | [ ] |
| 12e | MCP-first apps: routes → MCP tools (with auth/ACL), `/mcp` endpoint | `@arachnejs/server`, `@arachnejs/kit` | [x] |
| 12d | Binary codecs: CBOR in server (content negotiation); protobuf/Connect later | `@arachnejs/server` | [~] CBOR done |
| 13 | Docs + README per package, root README update | docs | [x] |
| 14 | Website (arachne.rh1.tech), built with Arachne from the repo's Markdown | `apps/site` | [x] |
| 15 | npm packages (`@arachnejs/*` 0.1.0), release workflow, self-hosted CI | `scripts/release.ts`, `.github/` | [x] |

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

### M2 — `@arachnejs/schema` (2026-09-30)

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

### M3 — `@arachnejs/server` (2026-09-30)

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
- `codec.ts` + `cbor.ts` (`@arachnejs/server/cbor`, cbor-x): Accept negotiation.
- Middleware: `cors.ts`, `security.ts` (CSP nonce), `rate-limit.ts`
  (pluggable `RateLimitStore`), `request-id.ts`, `static.ts` (`safeJoin`
  traversal guard, ETag, immutable hashed assets), `sse.ts`.
- `openapi.ts`: OpenAPI 3.1 + `apiDocs()` (Scalar explorer with its own CSP).
- `client.ts` (`@arachnejs/server/client`): `createClient<typeof routes>()`.
- `@arachnejs/router/path` entry added so the server doesn't load the DOM router.
- MCP: `arachne_server_dispatch` (validating), `arachne_server_openapi`.
- Tests: `route.test.ts`, `body.test.ts`, `middleware.test.ts`,
  `openapi.test.ts`, `mcp.test.ts`, `index.test.ts`.

### M4 — `@arachnejs/db`, `@arachnejs/db-sqlite` (2026-09-30)

- `table.ts`: `col.text/integer/real/boolean/json/date`, options
  `primaryKey/autoIncrement/unique/notNull/default/references`; nullability
  inferred from the schema; `InferInsert` (defaults/auto-increment optional);
  `encodeValue`/`decodeValue` (bool 0/1, JSON text, dates as epoch ms).
- `ddl.ts`: `createTableSQL`, `createIndexSQL`, dialect type overrides.
- `where.ts`: `Where<C>` with operators and `$or`/`$and`; `compileWhere`.
- `query.ts`: insert (`values`, `many`), select (`where/orderBy/limit/offset/
  all/get/count`), update (`set/where/run`), delete. Unknown columns throw at
  build time; update/delete require `where`.
- `client.ts`: `transaction()` with savepoints and a gate so outside queries
  wait; `query`/`execute` raw SQL.
- `db-sqlite`: `name`, WAL + busy timeout for files, **direct** change counts
  (bun:sqlite's `run().changes` includes FK cascades — we read `changes()`).
- Tests use a real in-memory bun:sqlite fixture (`src/fixtures/bun-sqlite.ts`)
  instead of the old regex fake.
- MCP: `arachne_db_table_sql`, `arachne_db_where_sql`, `arachne_db_simulate`.

### M5 — `@arachnejs/migrate` (2026-09-30)

- `migration.ts`: `defineMigration`, helpers `sql`, `createTable`,
  `addColumn`, `dropTable`.
- `runner.ts`: `migrate`, `rollback({ steps })`, `migrationStatus` (applied /
  pending / unknown), journal `_arachne_migrations`, one transaction per
  migration, `assertOrdered` (unique ascending ids).
- `plan.ts`: `planSchema(db, tables)` via SQLite PRAGMAs → statements +
  warnings (drops, type changes, NOT NULL adds are never auto-planned);
  `renderMigration(id, plan)` → module source.
- `load.ts`: `loadMigrations(dir)`.
- `@arachnejs/db` gained public `columnSQL` and `tableFromSpec`/`TableSpec`
  (moved from its MCP module); db MCP exports `tableSpecSchema`.
- MCP: `arachne_migrate_plan`. Workspace MCP registry lists migrate, storage,
  mailer, kit.

### M6 — `@arachnejs/acl` (2026-09-30)

- `acl.ts`: `createAcl({ permissions?, conditions, groups })` → `can`,
  `assert` (`AccessDenied`), `explain`, `permissions`, `level`, `atLeast`,
  `canManage`, `with`. Rules are strings (`x:y`, wildcards, `!deny`,
  `@cond,cond`) so they can live in the DB; config errors throw at creation.
- Order: blocked → scopes → direct user rules → group rules (deny wins in a tier).
- Typed permissions when a registry is given (`const P`).
- MCP: `arachne_acl_check` (with assumed conditions), `arachne_acl_permissions`.

### M7 — `@arachnejs/mailer` (2026-09-30)

- `message.ts`: `prepareMessage` validates addresses (`"Name <a@b>"`,
  objects), single-line subject/headers (injection guard), derives `text`.
- `html.ts`: `mailHtml` (escaping tagged template), `raw`, `SafeHtml`,
  `escapeHtml`, `htmlToText`.
- `mailer.ts`: `createMailer({ transport, from, templates, retry })` →
  `send`, `sendTemplate` (typed data), `defineTemplate`.
- `transports.ts`: `smtpTransport` (nodemailer 10), `resendTransport`,
  `memoryTransport` (`last`, `links`, `clear`), `fileTransport` (.eml via
  nodemailer MailComposer), `consoleTransport`.
- Tests include a real SMTP exchange against an in-process sink (Bun.listen).
- MCP: `arachne_mailer_preview`, `arachne_mailer_html_to_text`.
- Boundary map: `mailer` may use `schema`.

### M8 — `@arachnejs/storage` (2026-09-30)

- `storage.ts`: `Storage` interface, `assertKey` (traversal/empty/control
  chars), `guessType`, `saveUpload` (UUID keys, size/type limits,
  `originalName` metadata), `toResponse` (streaming, RFC 6266 disposition).
- `drivers.ts`: `memoryStorage`, `diskStorage` (sidecar metadata in
  `.arachne-meta/`). `s3.ts`: `s3Storage` over `Bun.S3Client` or an injected
  `S3Like`; presigned GET/PUT; `publicUrl` for CDNs.
- Same behavioural suite runs against all three drivers (`describe.each`).
- MCP: `arachne_storage_check_key`.

### M9 — `@arachnejs/auth` (2026-09-30)

- Files: `core.ts` (shared helpers, DB-backed ACL, one-time tokens, events,
  mail), `accounts.ts` (register/verify/login/MFA step/reset/change/email
  change), `sessions.ts` (sessions + API tokens), `mfa.ts` (TOTP, recovery
  codes, replay protection, AES-GCM secret sealing), `admin.ts` (users,
  groups, grants, blocking, events; permission + level + "only grant what you
  hold" checks), `http.ts` (middleware, CSRF, route-meta guards, module
  augmentation of `ContextState`/`RouteMeta`), `routes.ts` (`/auth/*`),
  `tables.ts`, `crypto.ts`, `mail.ts` (default templates), `errors.ts`
  (`AuthError` extends `HttpError`).
- Security review fixes (tests included): privilege escalation through
  grants/groups; login CSRF via foreign `Origin`.
- Tests: `accounts.test.ts`, `admin.test.ts`, `http.test.ts` (real server,
  memory mailbox, controllable clock via `fixtures/setup.ts`), `mcp.test.ts`.
- MCP: `arachne_auth_routes`, `arachne_auth_policy`, `arachne_auth_password_check`.
- Boundary map: `auth` may use `server` and `schema`.

### M10 — `@arachnejs/router` (2026-09-30)

- `router.ts`: nested layouts (`children`, index `path: ""`), `lazy` routes
  (resolved per definition, cached), `load(match)` data with `pending`,
  race-safe navigation (latest wins; URL + view switch together), `error`
  component, `initialData` for hydration, `ready`, `base` path, `href`,
  `resolve`, `preload`, `interceptLinks`, scroll top/hash/restore,
  `View` component form. Sync behaviour kept when nothing is async (old tests).
- `head.ts`: `mergeHeads`, `renderHead` (escaped), `applyHead` (client).
- `links.ts`: `shouldIntercept`. `link.tsx`: `Link` (compiled for SSR and
  DOM — verified via a real SSR build; tests use the JSX runtime + happy-dom).
- Router tsconfig and `tsconfig.tests.json` gained JSX settings.
- MCP: `arachne_router_resolve`.

### M11 — `@arachnejs/kit` (2026-09-30)

Project layout: `arachne.config.ts`, `app/routes.tsx` (pages),
`app/server.ts` (`defineServer`: routes, middleware, loaders, paths, openapi,
db/tables, dispose), `public/`. Modes: static / server / api.

- `config.ts` (`defineConfig`, `resolveConfig`, `normalizeBase`),
  `server-def.ts` (`defineServer`, `loadServer`, loaders by route id),
  `document.ts` (`renderDocument`, `serializeJson` — script-safe JSON).
- `entries.ts`: generated `.arachne/client.tsx` (hydrate + router +
  `interceptLinks` + data fetching: `/__arachne/data/*` in server mode,
  `_data/*.json` in static mode; `initialData` + `initialError` from the boot
  script) and `.arachne/ssr.tsx` (`render`, `match`, `routeList`, `buildPath`;
  wraps render in `withRouter` for concurrent requests).
- `bundle.ts`: `buildClient` (in memory, hashed, split, CSS entries +
  component CSS), `buildSsr` (fresh file per build, signals external).
- `handler.ts`: security headers → assets → public → app middleware → API →
  `/openapi.json`+`/docs` → `/mcp` → data routes → SSR fallback (404/HttpError
  statuses, boot data, nonce).
- `prerender.ts` (static: pages, `_data`, `404.html`, `sitemap.xml`),
  `build.ts` (static; or `dist/client` + `dist/server/index.js` bundling
  `@arachnejs/*`, app deps external), `app.ts` (`createAppServer`,
  `createProductionServer`), `preview.ts`.
- `dev.ts` (`startDevServer` child: rebuild + WS reload / CSS swap / error
  overlay; restart via exit code 75 when `app/server.ts`'s import graph —
  from `Bun.build` metafile — or the config changes; `runDev` supervisor),
  `cli.ts` (dev, build, start, preview, create, routes, openapi, migrate),
  `create.ts` (templates, `workspace:*` → `^version`).
- Tests: `kit.test.ts`, `templates.test.ts` (API template over HTTP;
  production bundles run as processes; create), `dev.test.ts` (real `arachne
  dev` process: reload, CSS swap, error overlay + recovery, server restart),
  `mcp.test.ts`. `scripts/test.ts` runs each file in its own process (Bun
  gets flaky after many `Bun.build`s in one process — EISDIR/"Unseekable").
- E2E (`bun run e2e`, Playwright Chromium, also a CI job): static build, SSR,
  dev server (no hydration-mismatch warnings) and the full-stack template
  (sign-up → verify → sign-in → notes CRUD → sign-out → 401 page, MCP).

Framework fixes found by these tests: router error/404 pages render inside
layouts; `initialError` so server-rendered error pages hydrate; dynamic
`head()` skipped on errors and guarded; `withRouter`/`listRoutes` exported;
`@arachnejs/render` gained dev walkers `getFirstChild`/`getNextSibling`
(dev-mode compiles never worked before; they now warn on hydration
mismatches); auth mail failures no longer fail the action (`mail.failed`
event); `db` `update().set()` accepts `undefined` values (PATCH bodies).

### M12 — templates (2026-09-30)

`packages/kit/templates/` (workspaces; `arachne create --template`):
- `static` — "Field Notes" blog: layout, build-time loaders + `paths`,
  per-page head/OG, sitemap, favicon, zero-JS option.
- `server` — "Notebook": SQLite, auth (register/verify/login/reset, console
  mailer in dev), ACL owner conditions, typed API client in pages, OpenAPI,
  MCP (`create_note`).
- `api` — "Projects API": API tokens, CRUD with refine rules, pagination
  (stable order), tag filter, multipart upload/download via storage, CORS,
  rate limit, OpenAPI, MCP.

### M12e — MCP-first apps (2026-09-30)

- `@arachnejs/server` `mcpRoute({ name, version, routes, dispatch })`: stateless
  MCP Streamable-HTTP JSON-RPC (`initialize`, `tools/list`, `tools/call`,
  `ping`, notifications → 202), Origin check (DNS rebinding). Routes with
  `mcp: true | { name, description }` become tools; input schema
  `{ params, query, body }` from route schemas; calls go through `dispatch`
  with the caller's `Authorization`, so validation/auth/ACL apply.
- Kit: `mcp: { name, version, path }` in config mounts it.

### M14 — website (2026-09-30)

`apps/site` ([README](../../apps/site/README.md)): static Arachne build
deployed to arachne.rh1.tech. `app/nav.ts` maps repository Markdown to
pages; `app/content/` renders it at build time (`Bun.markdown`, GitHub-style
heading ids, link rewriting, Shiki with CSS-variable colours) and builds the
search index. Getting started (`docs/getting-started.md`) was written by
building its app step by step. Tests: `bun test app`, `bun run e2e`
(Chromium: search, navigation, static 404, mobile drawer, axe light/dark).

Framework fixes found while building it (tests included):
- kit: the dev server restarts when `app/server.ts`/`app/routes.tsx` is
  created or deleted (the mode changes) — `dev-entries.test.ts`.
- kit: build errors report `file:line:column` and the source line instead
  of Bun's bare "Bundle failed" (`bundle()` in `bundle.ts`).
- kit: CSS `url("/…")` pointing at `public/` files is left as written.
- kit + router: a static host's `404.html` served at a URL a dynamic route
  matches hydrated that route with no data and crashed; the boot data now
  carries `notFound` and the router takes `initialNotFound`.
- render: `classList={{ … }}` never worked — the compiler emits it as an
  attribute. DOM `setAttribute` now diffs it as a class list; SSR merges it
  into the element's `class` attribute.
- render: SSR rendered `false` boolean attributes as `="false"`
  (`disabled="false"` disables the button until hydration); they are now
  omitted, as in the DOM (`aria-*` keep `"true"`/`"false"`).
- kit: chunk-to-chunk imports 404'd (Bun drops a chunk sub-directory from
  them); chunks are now flat `assets/chunk-*.js` — `chunks.test.ts`.
- Docs: `bunx arachne` would run an unrelated npm package; READMEs now use
  `bun run arachne` from a checkout until the first release. Root script
  `bun run arachne` added.

### M14b — live UI examples on the site (2026-09-30)

Component pages render every example from `packages/ui/examples` live
(`apps/site/app/ui/previews.tsx`, a lazy chunk: ~118 KB JS + 32 KB CSS gzipped,
only on those pages), with the event log for examples that report
callbacks. All 332 mount without errors; axe is clean on all 21 pages in
light and dark. Fixes found on the way:
- ui: titles and default text inside accent/dark `Hero`s kept the dark ink
  (contrast failure); they now inherit the hero's colour. `Figure` media
  shrinks to fit. The toast demo's buttons wrap.
- ui: `DocExample` and `DocPage` take `titleOrder` (heading level; defaults
  2 and 1) so embedded examples keep the page outline valid.
- `scripts/gen-ui-docs.ts`: `<` in table cells was escaped inside code spans
  (showed `&lt;` literally, e.g. ``DataTableColumn&lt;T>[]``) —
  `scripts/md-cell.ts` + test.
- kit: version skew — a tab opened before a deploy kept its old JS/CSS and
  rendered new page data with it (the site's live-example slots showed
  unstyled "Loading…"). Boot data and every data response now carry a build
  id (`build-id.ts`, from the hashed entry/style URLs); on a mismatch the
  client does a full page load. Tested in `kit.test.ts` and the browser e2e.
- router: every navigation re-created the whole chain, layouts included (the
  site's sidebar lost its scroll position and open sections, the header was
  rebuilt). Layouts now stay mounted while the same route definition is at
  their depth; their props are live getters; pages are still re-created —
  `layouts-dom.test.ts`.
- site: the mobile contents drawer didn't scroll (the desktop
  `align-self: start` shrank the fixed drawer to its content).

### M15 — npm and CI (2026-09-30)

- All 21 packages published as `@arachnejs/*` **0.1.0** (fixed version
  group), with provenance; tags `<name>@0.1.0`. Verified from the public
  registry: `bunx @arachnejs/kit create` (server, static) → install → build
  → start. How releases work: [releasing.md](../releasing.md).
- CI runs on the self-hosted runner `rbx1-arachne-ci` (unprivileged user,
  systemd limits); fork PRs on GitHub-hosted runners with approval; the
  publish job on GitHub-hosted runners (provenance/OIDC).
- Publishing is token-free: npm trusted publishing (OIDC) for every
  package; the `NPM_TOKEN` secret is deleted. 0.1.1 released this way.

### M14c — pre-rendered live examples (2026-09-30)

- The site renders all 332 UI examples to HTML at build time and hydrates
  them in the browser: no "Loading…" placeholders, styled without JS.
- render: `hydrate(code, el, { renderId })` matches
  `renderToString(…, { renderId })`, so several islands hydrate separately
  inside a page without key collisions.
- site: previews no longer clip overflow (Safari clipped a SplitButton's
  menu with `overflow-x: clip` alone); every component page is checked at
  375px in e2e.
- kit: the long-standing "EISDIR reading file" CI flake was overlapping
  build steps in one process (the client and SSR builds of `rebuild()`).
  Reproduced on rbx1 (6–8 of 40 runs of the server-template e2e); build steps
  now run one at a time (`exclusive()` in bundle.ts) and entry files are only
  rewritten when they change: 0 of 40.

## Known gaps / next steps

- **Docs backlog:** pre-existing packages not yet in `docs-check.json`
  (counts on 2026-09-30): core 77, router 44, mcp 37, jsx 37, forms 36,
  testing 35, config 25, render 24, signals 21, vite 2. `ui` uses its own
  generator (`bun run ui:docs`).
- Server: no WebSocket helper yet (Bun.serve `websocket` passthrough); no
  compression middleware (expected at the CDN/proxy); multipart bodies are
  buffered in memory up to `bodyLimit` (no streaming to storage yet).
- Kit: no streaming SSR (`renderToString` only); no per-route code-split
  CSS injection (chunk CSS isn't linked); dev reload is full-page (no
  component-state-preserving HMR); `arachne start` needs `node_modules` for
  the app's non-Arachne deps; no Node adapter (Bun only).
- Repository: github.com/rh1tech/arachne (public, `origin`). Default branch
  `master`; the site links repo files without a page to `…/blob/master/<path>`. Packages are published as `@arachnejs/*`
  (`@arachne` belongs to another project; so does the unscoped `arachne`).
  Releases: see `docs/releasing.md`.
- Not started: 12c GraphQL adapter; protobuf/Connect; Postgres/MySQL
  dialects; OAuth/passkeys; job queue/outbox for mail; i18n.
- Lint: new code adds ~9 `noExcessiveCognitiveComplexity` warnings (body
  `assign`, cors/security/static middleware, server `fetch`, openapi
  `operation`, client `call`, schema `validateObject`/`string`) — split in
  a polish pass.
- DB: no joins/aggregates beyond `count` (use `db.query`); no Postgres/MySQL
  driver yet (Dialect has `types`/`autoIncrement` hooks; Postgres needs `?`→`$n`
  and `RETURNING` for generated ids).
- Auth: no OAuth/social login, passkeys (WebAuthn) or magic links yet; the
  ACL cache is per process (multi-instance deployments must reload groups,
  e.g. `auth.setup()` on an interval or a pub/sub hook); lockout can be used
  to lock a known account (bounded by rate limits).
- Mailer: no queue/outbox yet (send is inline with retries); JSX email
  templates are possible via `renderToString` but not wrapped.
- Schema: async validators are rejected (sync-only by design); no
  discriminated-union optimisation; `lazy`/recursive schemas not supported.

## How to verify

```bash
bun install
bun run ci            # lint, boundaries, docs, mcp contract, typecheck, tests
```
