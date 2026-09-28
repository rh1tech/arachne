# Arachne

Universal, modular, high-performance web framework for TypeScript / Bun.

> Status: **Phase 0** — foundations. Not production-ready.

## Principles

- **Autonomous modules** — every `@arachne/*` package is usable alone
- **Performance first** — budgets enforced in CI
- **One schema, many outputs** — models → DB, forms, admin, OpenAPI, search
- **Security by default** — CSP nonces, CSRF, argon2id, parameterized queries
- **Standards over invention** — Standard Schema, OpenTelemetry, OpenAPI 3.1

## Monorepo

```bash
bun install
bun run ci          # lint + boundaries + typecheck + test
bun run playground  # http://localhost:3920 — live Show/For demo
bun run mcp         # stdio MCP server (all package modules)
bun run mcp:http    # Streamable HTTP on :3921/mcp
```

Cursor: see [`.cursor/mcp.json`](.cursor/mcp.json). Every `@arachne/*` package
exports `./mcp` ([ADR 0007](docs/adr/0007-mcp-everywhere.md)).

Domain schemas: [`@arachne/schema`](packages/schema) ([ADR 0008](docs/adr/0008-schema-dsl.md)).
Boot config stays on [`@arachne/config`](packages/config).
HTTP: [`@arachne/server`](packages/server) + [`@arachne/router`](packages/router).
JSX bundling: [`@arachne/vite`](packages/vite) (Bun + Vite plugins).
Data: [`@arachne/db`](packages/db) + [`@arachne/db-sqlite`](packages/db-sqlite).

See [`docs/adr/`](docs/adr/) for architecture decisions.

## License

[MIT](LICENSE-MIT) OR [Apache-2.0](LICENSE-APACHE)
