# @arachne/config

Typed, schema-validated configuration loader. Merges defaults → file → env →
CLI/overrides and fails fast on invalid input.

## Install

```bash
bun add @arachne/config
```

## Example

```ts
import { loadConfig, c } from "@arachne/config";

const schema = c.object({
  port: c.defaulted(c.number(), 3000),
  databaseUrl: c.string({ min: 1 }),
  debug: c.defaulted(c.boolean(), false),
});

const config = await loadConfig(schema, {
  file: "./arachne.config.ts",
  env: process.env,
  envPrefix: "ARACHNE_",
});
```

Env keys use `__` for nesting (`ARACHNE_DATABASE__HOST`). See
[ADR 0004](../../docs/adr/0004-config-loader.md).
