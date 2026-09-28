# @arachne/db

Schema-aware database client. Pair with a dialect package such as
[`@arachne/db-sqlite`](../db-sqlite) ([ADR 0012](../../docs/adr/0012-db-dialects.md)).

```ts
import { col, createDb, defineTable } from "@arachne/db";
import { sqlite } from "@arachne/db-sqlite";
import { s } from "@arachne/schema";

const users = defineTable("users", {
  id: col.text(s.string({ min: 1 }), { primaryKey: true }),
  name: col.text(s.string({ min: 1 })),
});

const db = createDb({
  dialect: sqlite({ path: ":memory:" }),
  tables: { users },
});

await db.sync();
await db.insert(users).values({ id: "1", name: "Ada" });
const row = await db.select(users).where({ id: "1" }).get();
```
