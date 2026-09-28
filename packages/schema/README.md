# @arachne/schema

Standard Schema V1 DSL for Arachne domain models — the “one schema, many
outputs” layer (DB, forms, admin, OpenAPI).

Boot config stays on `@arachne/config`’s thin `c.*` helpers ([ADR 0004](../../docs/adr/0004-config-loader.md)).
See [ADR 0008](../../docs/adr/0008-schema-dsl.md).

## Install

```bash
bun add @arachne/schema
```

## Example

```ts
import { s, parse, type Infer } from "@arachne/schema";

const User = s.object({
  id: s.string({ min: 1 }),
  age: s.number({ min: 0, int: true }),
  role: s.enum(["admin", "user"]),
  tags: s.array(s.string()),
  nickname: s.optional(s.string()),
});

type User = Infer<typeof User>;

const user = parse(User, {
  id: "u1",
  age: 32,
  role: "admin",
  tags: ["core"],
});
```
