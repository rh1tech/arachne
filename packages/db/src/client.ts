import { createIndexSQL, createTableSQL } from "./ddl.ts";
import type { Dialect, RunResult } from "./dialect.ts";
import {
	type DeleteBuilder,
	deleteFrom,
	type Executor,
	type InsertBuilder,
	insertInto,
	type SelectBuilder,
	selectFrom,
	type UpdateBuilder,
	updateTable,
} from "./query.ts";
import type { TableDef } from "./table.ts";

/** Options for {@link createDb}. */
export interface CreateDbOptions<TTables extends Record<string, TableDef>> {
	/** Database driver. */
	dialect: Dialect;
	/** Tables by name. */
	tables: TTables;
}

/** Query surface shared by the client and transactions. */
export interface DbQueries {
	/** Insert rows. */
	insert: <T extends TableDef>(table: T) => InsertBuilder<T["columns"]>;
	/** Read rows. */
	select: <T extends TableDef>(table: T) => SelectBuilder<T["columns"]>;
	/** Change rows (requires `where`). */
	update: <T extends TableDef>(table: T) => UpdateBuilder<T["columns"]>;
	/** Remove rows (requires `where`). */
	delete: <T extends TableDef>(table: T) => DeleteBuilder<T["columns"]>;
	/** Raw query with `?` parameters. */
	query: <R = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<R[]>;
	/** Raw statement with `?` parameters. */
	execute: (sql: string, params?: unknown[]) => Promise<RunResult>;
	/**
	 * Run `fn` atomically: commit when it resolves, roll back when it throws.
	 * Nested calls use savepoints. Queries outside wait until it finishes.
	 */
	transaction: <R>(fn: (tx: DbQueries) => Promise<R>) => Promise<R>;
}

/** A database client. */
export interface DbClient<TTables extends Record<string, TableDef>> extends DbQueries {
	/** Tables passed to {@link createDb}. */
	readonly tables: TTables;
	/** The driver. */
	readonly dialect: Dialect;
	/** Create missing tables and indexes (`IF NOT EXISTS`). Use migrations for changes. */
	sync: () => Promise<void>;
	/** Close the driver. */
	close: () => Promise<void>;
}

function direct(dialect: Dialect): Executor {
	return {
		exec: async (sql, params) => (await dialect.exec(sql, params)) ?? {},
		all: async <T>(sql: string, params: unknown[]) => (await dialect.all<T>(sql, params)) as T[],
	};
}

function queries(exec: Executor, transaction: DbQueries["transaction"]): DbQueries {
	return {
		insert: (table) => insertInto(exec, table),
		select: (table) => selectFrom(exec, table),
		update: (table) => updateTable(exec, table),
		delete: (table) => deleteFrom(exec, table),
		query: (sql, params = []) => exec.all(sql, params),
		execute: (sql, params = []) => exec.exec(sql, params),
		transaction,
	};
}

/** Nested transaction scope: savepoints on the same connection. */
function nested(raw: Executor, depth: number): DbQueries["transaction"] {
	return async (fn) => {
		const name = `sp_${depth}`;
		await raw.exec(`SAVEPOINT ${name}`, []);
		try {
			const result = await fn(queries(raw, nested(raw, depth + 1)));
			await raw.exec(`RELEASE SAVEPOINT ${name}`, []);
			return result;
		} catch (error) {
			await raw.exec(`ROLLBACK TO SAVEPOINT ${name}`, []);
			await raw.exec(`RELEASE SAVEPOINT ${name}`, []);
			throw error;
		}
	};
}

/**
 * Create a client over a dialect. Rows are validated with column schemas on
 * write and on read.
 */
export function createDb<TTables extends Record<string, TableDef>>(
	options: CreateDbOptions<TTables>,
): DbClient<TTables> {
	const { dialect, tables } = options;
	const raw = direct(dialect);
	let active: Promise<void> | undefined;

	const waitIdle = async () => {
		while (active) await active;
	};
	const gated: Executor = {
		exec: async (sql, params) => {
			await waitIdle();
			return raw.exec(sql, params);
		},
		all: async <T>(sql: string, params: unknown[]) => {
			await waitIdle();
			return raw.all<T>(sql, params);
		},
	};

	const transaction: DbQueries["transaction"] = async (fn) => {
		// Check-and-claim with no await in between, so two callers can't both start.
		while (active) await active;
		let release = () => {};
		active = new Promise<void>((resolve) => {
			release = resolve;
		});
		try {
			await raw.exec("BEGIN", []);
			try {
				const result = await fn(queries(raw, nested(raw, 1)));
				await raw.exec("COMMIT", []);
				return result;
			} catch (error) {
				await raw.exec("ROLLBACK", []);
				throw error;
			}
		} finally {
			active = undefined;
			release();
		}
	};

	return {
		...queries(gated, transaction),
		tables,
		dialect,
		async sync() {
			for (const table of Object.values(tables)) {
				await gated.exec(createTableSQL(table, dialect), []);
				for (const sql of createIndexSQL(table)) await gated.exec(sql, []);
			}
		},
		async close() {
			await waitIdle();
			await dialect.close?.();
		},
	};
}
