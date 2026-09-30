import { Database } from "bun:sqlite";
import type { Dialect } from "../dialect.ts";

/** Real SQLite for db tests (bun:sqlite is built in; no db-sqlite dependency). */
export function testDialect(): Dialect & { database: Database } {
	const database = new Database(":memory:");
	database.exec("PRAGMA foreign_keys = ON;");
	return {
		name: "sqlite",
		database,
		exec(sql, params = []) {
			const result = database.run(sql, params as never[]);
			// run().changes includes foreign-key cascades; changes() counts direct rows only.
			const direct = database.query("SELECT changes() AS n").get() as { n: number };
			return { changes: direct.n, lastInsertRowid: Number(result.lastInsertRowid) };
		},
		all(sql, params = []) {
			return database.query(sql).all(...(params as never[])) as never;
		},
		close() {
			database.close();
		},
	};
}
