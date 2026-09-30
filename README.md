# Arachne

Universal, modular, high-performance web framework for TypeScript / Bun.

> Status: **pre-release** (0.0.x). Static, server and API apps work end to
> end; see [docs/framework/PROGRESS.md](docs/framework/PROGRESS.md).

```bash
bun run arachne create apps/my-app --template server   # static | server | api
cd apps/my-app && bun install && bun run dev         # hot reload
bun run build && bun run start                  # production
```

> Pre-release: `@arachne/*` isn't on npm yet, and the unscoped `arachne`
> package on npm is unrelated. Run the CLI from a checkout with `bun run arachne`
> (see [Getting started](docs/getting-started.md)).

Start with the [framework guide](docs/framework/README.md).

## Principles

- **Autonomous modules** — every `@arachne/*` package is usable alone
- **Performance first** — budgets enforced in CI
- **One schema, many outputs** — models → DB, forms, admin, OpenAPI, search
- **Security by default** — CSP nonces, CSRF, argon2id, parameterized queries
- **Standards over invention** — Standard Schema, OpenTelemetry, OpenAPI 3.1

## Monorepo

```bash
bun install
bun run ci          # lint + boundaries + docs + MCP + typecheck + test
(cd packages/kit && bun run e2e)   # real-browser journeys (Playwright Chromium)
bun run playground  # http://localhost:3920 — live Show/For demo
bun run mcp         # stdio MCP server (all package modules)
bun run mcp:http    # Streamable HTTP on :3921/mcp
```

Cursor: see [`.cursor/mcp.json`](.cursor/mcp.json). Every `@arachne/*` package
exports `./mcp` ([ADR 0007](docs/adr/0007-mcp-everywhere.md)).

App kit and CLI: [`@arachne/kit`](packages/kit) ([ADR 0015](docs/adr/0015-universal-framework.md)).
Accounts and permissions: [`@arachne/auth`](packages/auth) + [`@arachne/acl`](packages/acl).
Mail, files, migrations: [`@arachne/mailer`](packages/mailer), [`@arachne/storage`](packages/storage), [`@arachne/migrate`](packages/migrate).
Domain schemas: [`@arachne/schema`](packages/schema) ([ADR 0008](docs/adr/0008-schema-dsl.md)).
Boot config stays on [`@arachne/config`](packages/config).
HTTP: [`@arachne/server`](packages/server) + [`@arachne/router`](packages/router).
JSX bundling: [`@arachne/vite`](packages/vite) (Bun + Vite plugins).
Data: [`@arachne/db`](packages/db) + [`@arachne/db-sqlite`](packages/db-sqlite).
UI: [`@arachne/ui`](packages/ui) + [`@arachne/forms`](packages/forms)
([ADR 0013](docs/adr/0013-ui-forms.md)).

See [`docs/adr/`](docs/adr/) for architecture decisions.

## License

[MIT](LICENSE-MIT) OR [Apache-2.0](LICENSE-APACHE)
