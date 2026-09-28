# @arachne/testing

Shared test helpers for Arachne packages.

## Install

```bash
bun add -d @arachne/testing
```

## Helpers

| Export | Purpose |
|---|---|
| `createTestApp` | Boot core modules; returns disposable harness |
| `factory` | Typed object factory with overrides / sequences |
| `tempDir` | Temp directory with cleanup |
| `waitFor` | Poll until predicate passes |
| `createMockLogger` | Capturing logger for assertions |

See [ADR 0005](../../docs/adr/0005-testing-harness.md).
