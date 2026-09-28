export interface Dialect {
	exec: (sql: string, params?: unknown[]) => void | Promise<void>;
	all: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => T[] | Promise<T[]>;
	close?: (() => void | Promise<void>) | undefined;
}

export function quoteIdent(name: string): string {
	return `"${name.replaceAll('"', '""')}"`;
}

export function placeholders(count: number): string {
	return Array.from({ length: count }, () => "?").join(", ");
}
