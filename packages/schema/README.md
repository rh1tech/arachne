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

## Formats, coercion and cross-field rules

```ts
const Signup = s.refine(
  s.object({
    email: s.email(),                         // trimmed, format-checked
    password: s.string({ min: 12 }),
    confirm: s.string(),
    newsletter: s.defaulted(s.coerce.boolean(), false), // "on" / "true" / "1"
  }),
  (v) => v.password === v.confirm,
  { message: "passwords do not match", path: ["confirm"] },
);

const Query = s.object({
  page: s.defaulted(s.coerce.integer({ min: 1 }), 1),   // "?page=2"
  tag: s.optional(s.coerce.array(s.string())),          // "?tag=a&tag=b"
});

const Upload = s.object({ avatar: s.file({ maxSize: 2_000_000, types: ["image/*"] }) });
```

Keys whose schema accepts `undefined` (`optional`, `defaulted`) are optional
in `InferInput<typeof S>`; `Infer<typeof S>` is the parsed output.

| Builder | Notes |
|---|---|
| `s.string({ min, max, pattern, format, trim, lowercase })` | `format`: `email`, `url`, `uuid`, `date-time`, `date` |
| `s.email()` `s.url()` `s.uuid()` `s.datetime()` `s.isoDate()` | format shorthands |
| `s.number({ min, max, int })` `s.integer()` | never `NaN` |
| `s.date()` `s.file({ maxSize, types })` `s.unknown()` | `types` accepts `image/*` |
| `s.object(shape, { unknownKeys })` | `strip` (default), `reject`, `passthrough` |
| `s.pick` `s.omit` `s.partial` `s.extend` | derive objects from a shape |
| `s.record(value)` `s.array(item)` `s.union([...])` | |
| `s.refine(schema, check, { message, path })` | cross-field checks |
| `s.transform(schema, fn)` `s.preprocess(fn, schema)` | map output / input |
| `s.describe(schema, { title, description, example })` | doc metadata |
| `s.coerce.number/integer/boolean/date/array` | for query strings and form fields |

## JSON Schema / OpenAPI

```ts
import { toJSONSchema } from "@arachne/schema";
toJSONSchema(Signup); // JSON Schema 2020-12, used by @arachne/server's OpenAPI output
```

Foreign Standard Schemas (zod, valibot) validate fine but produce `{}`.

## MCP

`arachne_schema_validate`, `arachne_schema_json_schema`, `arachne_schema_api_summary`.
