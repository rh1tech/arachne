# ADR 0003: @arachnejs/core kernel design

- **Status:** Accepted
- **Date:** 2026-09-27
- **Deciders:** Arachne core

## Context

Every higher-level package needs shared primitives for dependency injection,
module lifecycle, events, and logging — without importing concrete servers,
databases, or UI.

## Decision

`@arachnejs/core` provides:

1. **Tokens + Container** — symbol/string tokens, singleton and transient
   scopes, constructor and factory providers, child containers for request
   scope. Resolution is synchronous; async factories are supported via
   `resolveAsync`.
2. **Modules** — `defineModule({ name, providers, imports, setup, dispose })`.
   Modules are composable; the app boots modules in topological order and
   disposes in reverse.
3. **Events** — typed `EventBus` with `on` / `once` / `emit` / `off`. No
   global singleton; the bus is a container provider.
4. **Logger** — `Logger` interface (`trace|debug|info|warn|error|child`).
   Default `consoleLogger`; adapters (Pino, OTel) live elsewhere.
5. **App** — `createApp({ modules, logger? })` wires container + bus +
   lifecycle (`boot` / `dispose`).

`@arachnejs/core` has **zero** runtime dependencies and must not import any other
`@arachnejs/*` package.

## Alternatives considered

1. **tsyringe / inversify** — heavy, decorator-centric, less tree-shakeable.
2. **Effect Context** — powerful, but couples the kernel to Effect's runtime.
3. **No DI** — module-level singletons fight testing and multi-tenancy.

## Consequences

- All framework services register through providers.
- Request-scoped children enable per-request services without globals.
- Later packages depend on interfaces from core, not concrete adapters.
