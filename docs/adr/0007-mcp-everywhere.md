# ADR 0007: MCP servers for every package

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

AI agents are first-class consumers of Arachne (dev, admin, content, ops). The
roadmap already planned an MCP surface in Phase 5; we elevate it to a
**non-negotiable package contract** from Phase 0 onward so agents can drive
the framework as packages land—not as an afterthought.

## Decision

1. **Every `@arachne/*` package exports `./mcp`** — an `ArachneMcpModule`
   registering tools, resources, and/or prompts for that package’s domain.
2. **`@arachne/mcp`** is the kernel: module protocol, server factory, stdio +
   Streamable HTTP transports, workspace aggregator.
3. **Naming:** tools are `arachne_<package>_<action>` (e.g.
   `arachne_schema_validate`, `arachne_jsx_compile`) to avoid collisions when
   many modules are composed.
4. **Composition:** `createArachneMcpServer({ modules })` merges modules.
   `createWorkspaceMcpServer()` discovers installed `@arachne/*/mcp` exports.
5. **CLI:** `arachne mcp` (later via `@arachne/cli`) and package bin
   `arachne-mcp` for stdio. HTTP mode for Cursor remote / cloud agents.
6. **Safety:** MCP tools that mutate (migrate, deploy, write files) require an
   explicit `confirm: true` argument or dry-run default. No secrets in tool
   results.
7. **New packages:** the package checklist includes ADR + public API + tests +
   README + **`./mcp` module** before merge.

## Alternatives considered

1. **Single monolith MCP only** — harder to tree-shake and violates autonomous
   modules.
2. **Wait until Phase 5** — agents cannot help build the vertical slice.
3. **Generate MCP only from OpenAPI** — good later for HTTP APIs; too late for
   compile/dev tooling.

## Consequences

- Phase 1 packages (`signals`, `jsx`, `render`, …) ship MCP tools immediately.
- Cursor / Claude Desktop connect via `.cursor/mcp.json` → `bun run mcp`.
- CI may smoke-test that each package’s `./mcp` export loads and registers ≥1
  tool or resource.
