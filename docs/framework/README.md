# Arachne framework guide

One framework for three kinds of project, built on Bun, signals and
Standard Schema. Decisions: [ADR 0015](../adr/0015-universal-framework.md).
Status and history: [PROGRESS.md](PROGRESS.md).

## Start a project

```bash
bun run arachne create apps/my-site --template static   # pre-rendered site, no server
bun run arachne create apps/my-app  --template server   # SSR + API + accounts
bun run arachne create apps/my-api  --template api      # API only
bun install && cd apps/my-app && bun run dev
```

> Pre-release: `@arachne/*` isn't on npm yet, and the unscoped `arachne`
> package on npm is unrelated. Run the CLI from a checkout with `bun run arachne`
> (see [Getting started](../getting-started.md)).

| What | Static | Server | API |
|---|---|---|---|
| Pages | pre-rendered HTML, hydrated, client routing | server-rendered, hydrated, client routing | — |
| Data | loaders run at build time → `_data/*.json` | loaders run per request | — |
| Deploy | `dist/` on any static host / CDN | `bun dist/server/index.js` | `bun dist/server/index.js` |
| Zero JS option | `hydrate: false` | — | — |

## How the pieces fit

```
app/routes.tsx ──► @arachne/router (layouts, lazy routes, head, Link)
                    └─ @arachne/render + @arachne/jsx (compiled JSX, SSR + hydration, signals)
app/server.ts  ──► @arachne/server  (typed routes, validation, uploads, OpenAPI, MCP, middleware)
                    ├─ @arachne/schema   (one schema: validation, JSON Schema, OpenAPI, forms)
                    ├─ @arachne/db + db-sqlite + migrate
                    ├─ @arachne/auth + acl  (accounts, sessions, tokens, 2FA, groups, permissions)
                    ├─ @arachne/mailer   (SMTP, Resend, dev console)
                    └─ @arachne/storage  (disk, S3/R2/MinIO)
arachne.config.ts ─► @arachne/kit  (dev server + hot reload, builds, prerendering, CLI)
```

## Guides by task

| Task | Where |
|---|---|
| Pages, layouts, links, titles | [router README](../../packages/router/README.md), [kit: Pages](../../packages/kit/README.md#pages) |
| Page data (loaders), prerendering dynamic routes | [kit: Server](../../packages/kit/README.md#server) |
| API routes, validation, uploads, errors | [server README](../../packages/server/README.md) |
| Schemas, coercion, cross-field rules | [schema README](../../packages/schema/README.md) |
| OpenAPI docs and the typed client | [server: OpenAPI](../../packages/server/README.md#openapi-and-the-typed-client) |
| Sign-up, login, reset, 2FA, API tokens, blocking | [auth README](../../packages/auth/README.md) |
| Groups, permissions, ownership rules | [acl README](../../packages/acl/README.md) |
| Database queries, transactions | [db README](../../packages/db/README.md) |
| Schema changes | [migrate README](../../packages/migrate/README.md), `arachne migrate` |
| Email | [mailer README](../../packages/mailer/README.md) |
| File storage | [storage README](../../packages/storage/README.md) |
| UI components | [UI docs](../ui/README.md) |
| Dev server, builds, deploy, CLI | [kit README](../../packages/kit/README.md) |

## Agents (MCP)

Every package exports an MCP module (`bun run mcp` serves them all). Apps can
expose their own API routes as MCP tools: mark routes `mcp: true` and set
`mcp` in `arachne.config.ts`; calls run through the same validation, auth
and permission checks as HTTP requests.

## Security defaults

- CSP with per-request nonces, HSTS, nosniff, frame and referrer policies.
- Validation on every declared input; 422 with issue paths.
- Parameterised SQL only; `update`/`delete` refuse to run without `where`.
- argon2id passwords, hashed session and API tokens, `__Host-` cookies,
  CSRF via Origin / Fetch Metadata, lockout, rate limits, audit events.
- Safe upload keys; downloads with RFC 6266 `Content-Disposition` and nosniff.

## API reference

Every exported symbol has TSDoc (`bun run docs:check` keeps it that way);
editors show it on hover. Package READMEs are the task-oriented reference.
