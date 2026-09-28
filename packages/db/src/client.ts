import { type Dialect, placeholders, quoteIdent } from "./dialect.ts";
import { type ColumnMap, createTableSQL, type InferRow, parseRow, type TableDef } from "./table.ts";

export interface CreateDbOptions<TTables extends Record<string, TableDef>> {
	dialect: Dialect;
	tables: TTables;
}

export interface InsertBuilder<TColumns extends ColumnMap> {
	values: (row: InferRow<TColumns>) => Promise<InferRow<TColumns>>;
}

export interface SelectBuilder<TColumns extends ColumnMap> {
	where: (eq: Partial<InferRow<TColumns>>) => SelectBuilder<TColumns>;
	all: () => Promise<Array<InferRow<TColumns>>>;
	get: () => Promise<InferRow<TColumns> | undefined>;
}

export interface DeleteBuilder<TColumns extends ColumnMap> {
	where: (eq: Partial<InferRow<TColumns>>) => DeleteBuilder<TColumns>;
	run: () => Promise<void>;
}

export interface DbClient<TTables extends Record<string, TableDef>> {
	readonly tables: TTables;
	sync: () => Promise<void>;
	insert: <K extends keyof TTables & string>(
		table: TTables[K],
	) => InsertBuilder<TTables[K]["columns"]>;
	select: <K extends keyof TTables & string>(
		table: TTables[K],
	) => SelectBuilder<TTables[K]["columns"]>;
	delete: <K extends keyof TTables & string>(
		table: TTables[K],
	) => DeleteBuilder<TTables[K]["columns"]>;
	close: () => Promise<void>;
}

function whereClause(eq: Record<string, unknown>): { sql: string; params: unknown[] } {
	const keys = Object.keys(eq);
	if (keys.length === 0) return { sql: "", params: [] };
	const parts = keys.map((key) => `${quoteIdent(key)} = ?`);
	return { sql: ` WHERE ${parts.join(" AND ")}`, params: keys.map((key) => eq[key]) };
}

function encodeRow(table: TableDef, row: Record<string, unknown>): unknown[] {
	return Object.keys(table.columns).map((key) => {
		const value = row[key];
		const column = table.columns[key];
		if (column?.sqlType === "boolean") return value ? 1 : 0;
		return value;
	});
}

function decodeRow<TColumns extends ColumnMap>(
	table: TableDef<TColumns>,
	row: Record<string, unknown>,
): InferRow<TColumns> {
	const mapped: Record<string, unknown> = { ...row };
	for (const [key, column] of Object.entries(table.columns)) {
		if (column.sqlType === "boolean" && key in mapped) {
			mapped[key] = Boolean(mapped[key]);
		}
	}
	return parseRow(table, mapped);
}

export function createDb<TTables extends Record<string, TableDef>>(
	options: CreateDbOptions<TTables>,
): DbClient<TTables> {
	const { dialect, tables } = options;

	return {
		tables,
		async sync() {
			for (const table of Object.values(tables)) {
				await dialect.exec(createTableSQL(table));
			}
		},
		insert(table) {
			return {
				async values(row) {
					const parsed = parseRow(table, row);
					const keys = Object.keys(table.columns);
					const sql = `INSERT INTO ${quoteIdent(table.name)} (${keys.map(quoteIdent).join(", ")}) VALUES (${placeholders(keys.length)})`;
					await dialect.exec(sql, encodeRow(table, parsed as Record<string, unknown>));
					return parsed;
				},
			};
		},
		select(table) {
			let filters: Record<string, unknown> = {};
			const builder: SelectBuilder<typeof table.columns> = {
				where(eq) {
					filters = { ...filters, ...(eq as Record<string, unknown>) };
					return builder;
				},
				async all() {
					const where = whereClause(filters);
					const sql = `SELECT * FROM ${quoteIdent(table.name)}${where.sql}`;
					const rows = await dialect.all<Record<string, unknown>>(sql, where.params);
					return rows.map((row) => decodeRow(table, row));
				},
				async get() {
					const rows = await builder.all();
					return rows[0];
				},
			};
			return builder;
		},
		delete(table) {
			let filters: Record<string, unknown> = {};
			const builder: DeleteBuilder<typeof table.columns> = {
				where(eq) {
					filters = { ...filters, ...(eq as Record<string, unknown>) };
					return builder;
				},
				async run() {
					const where = whereClause(filters);
					if (!where.sql) throw new Error("delete requires where()");
					await dialect.exec(`DELETE FROM ${quoteIdent(table.name)}${where.sql}`, where.params);
				},
			};
			return builder;
		},
		async close() {
			await dialect.close?.();
		},
	};
}
