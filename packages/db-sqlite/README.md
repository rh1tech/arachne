# @arachne/db-sqlite

SQLite dialect for [`@arachne/db`](../db) using Bun's built-in `bun:sqlite`.

```ts
import { sqlite } from "@arachne/db-sqlite";
import { createDb } from "@arachne/db";

const db = createDb({
  dialect: sqlite({ path: ":memory:" }),
  tables: { /* ... */ },
});
```
