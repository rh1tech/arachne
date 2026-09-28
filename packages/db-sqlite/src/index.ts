import { Database } from "bun:sqlite";
import type { Dialect } from "@arachne/db";

export interface SqliteOptions {
	/** File path or `:memory:` (default). */
	path?: string | undefined;
}

export function sqlite(options: SqliteOptions = {}): Dialect & { database: Database } {
	const database = new Database(options.path ?? ":memory:");
	database.exec("PRAGMA foreign_keys = ON;");

	return {
		database,
		exec(sql, params = []) {
			database.run(sql, params as never[]);
		},
		all(sql, params = []) {
			return database.query(sql).all(...(params as never[])) as never;
		},
		close() {
			database.close();
		},
	};
}
