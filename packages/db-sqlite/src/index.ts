import { Database } from "bun:sqlite";
import type { Dialect } from "@arachnejs/db";

/** Options for {@link sqlite}. */
export interface SqliteOptions {
	/** File path or `:memory:` (default). */
	path?: string | undefined;
	/** Journal mode for file databases. Default `wal` (concurrent readers). */
	journalMode?: "wal" | "delete" | "truncate" | "memory" | undefined;
	/** Milliseconds to wait for a locked database. Default 5000. */
	busyTimeout?: number | undefined;
}

/**
 * SQLite dialect on `bun:sqlite`. Foreign keys are enforced; file databases
 * default to WAL with a busy timeout.
 */
export function sqlite(options: SqliteOptions = {}): Dialect & { database: Database } {
	const path = options.path ?? ":memory:";
	const database = new Database(path, { create: true });
	database.exec("PRAGMA foreign_keys = ON;");
	database.exec(`PRAGMA busy_timeout = ${Math.max(0, Math.floor(options.busyTimeout ?? 5000))};`);
	if (path !== ":memory:") database.exec(`PRAGMA journal_mode = ${options.journalMode ?? "wal"};`);
	const changes = database.query<{ n: number }, []>("SELECT changes() AS n");

	return {
		name: "sqlite",
		database,
		exec(sql, params = []) {
			const result = database.run(sql, params as never[]);
			// run().changes includes foreign-key cascades; changes() counts direct rows only.
			return { changes: changes.get()?.n ?? 0, lastInsertRowid: Number(result.lastInsertRowid) };
		},
		all(sql, params = []) {
			return database.query(sql).all(...(params as never[])) as never;
		},
		close() {
			database.close();
		},
	};
}
