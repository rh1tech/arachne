import type { SqlType } from "./table.ts";

/** Outcome of a write statement. */
export interface RunResult {
	/** Rows changed. */
	changes?: number | undefined;
	/** Id of the last inserted row (integer keys). */
	lastInsertRowid?: number | undefined;
}

/**
 * A database driver. SQL uses `?` placeholders and double-quoted identifiers;
 * drivers for other databases rewrite placeholders if needed.
 */
export interface Dialect {
	/** Driver name (`sqlite`, `postgres`, …). */
	readonly name?: string | undefined;
	/** Run a statement that returns no rows. */
	exec: (sql: string, params?: unknown[]) => void | RunResult | Promise<void | RunResult>;
	/** Run a query and return its rows. */
	all: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => T[] | Promise<T[]>;
	/** Release connections. */
	close?: (() => void | Promise<void>) | undefined;
	/** Override DDL type names per storage class. */
	types?: Partial<Record<SqlType, string>> | undefined;
	/** DDL suffix for auto-increment primary keys. Default `PRIMARY KEY AUTOINCREMENT`. */
	autoIncrement?: string | undefined;
}

/** Quote an identifier (`"name"`, with embedded quotes doubled). */
export function quoteIdent(name: string): string {
	return `"${name.replaceAll('"', '""')}"`;
}

/** `?, ?, ?` for `count` parameters. */
export function placeholders(count: number): string {
	return Array.from({ length: count }, () => "?").join(", ");
}
