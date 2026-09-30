# @arachnejs/db-sqlite

SQLite dialect for [`@arachnejs/db`](../db) using Bun's built-in `bun:sqlite`.

```ts
import { sqlite } from "@arachnejs/db-sqlite";
import { createDb } from "@arachnejs/db";

const db = createDb({
  dialect: sqlite({ path: ":memory:" }),
  tables: { /* ... */ },
});
```
