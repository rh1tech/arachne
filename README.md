# Arachne

Universal, modular, high-performance web framework for TypeScript / Bun.

> Status: **pre-release** (0.x): APIs can still change. Static, server and API
> apps work end to end; see [docs/framework/PROGRESS.md](docs/framework/PROGRESS.md).
> Website and docs: <https://arachne.rh1.tech>.

```bash
bunx @arachnejs/kit create my-app --template server   # static | server | api
cd my-app && bun install && bun run dev               # hot reload
bun run build && bun run start                        # production
```

Packages are published as `@arachnejs/*` (the unscoped `arachne` package on
npm is unrelated). See [Getting started](docs/getting-started.md).

Start with the [framework guide](docs/framework/README.md).

## Principles

- **Autonomous modules** — every `@arachnejs/*` package is usable alone
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

Every `@arachnejs/*` package exports `./mcp`
([ADR 0007](docs/adr/0007-mcp-everywhere.md)). To use them from an editor or
agent, add a stdio server to its MCP config (run from the repository root):

```json
{ "mcpServers": { "arachne": { "command": "bun", "args": ["run", "packages/mcp/bin/arachne-mcp.ts"] } } }
```

App kit and CLI: [`@arachnejs/kit`](packages/kit) ([ADR 0015](docs/adr/0015-universal-framework.md)).
Accounts and permissions: [`@arachnejs/auth`](packages/auth) + [`@arachnejs/acl`](packages/acl).
Mail, files, migrations: [`@arachnejs/mailer`](packages/mailer), [`@arachnejs/storage`](packages/storage), [`@arachnejs/migrate`](packages/migrate).
Domain schemas: [`@arachnejs/schema`](packages/schema) ([ADR 0008](docs/adr/0008-schema-dsl.md)).
Boot config stays on [`@arachnejs/config`](packages/config).
HTTP: [`@arachnejs/server`](packages/server) + [`@arachnejs/router`](packages/router).
JSX bundling: [`@arachnejs/vite`](packages/vite) (Bun + Vite plugins).
Data: [`@arachnejs/db`](packages/db) + [`@arachnejs/db-sqlite`](packages/db-sqlite).
UI: [`@arachnejs/ui`](packages/ui) + [`@arachnejs/forms`](packages/forms)
([ADR 0013](docs/adr/0013-ui-forms.md)).

See [`docs/adr/`](docs/adr/) for architecture decisions.

## License

[MIT](LICENSE-MIT) OR [Apache-2.0](LICENSE-APACHE)
