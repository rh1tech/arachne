import { placeholders, quoteIdent, type RunResult } from "./dialect.ts";
import {
	type ColumnMap,
	decodeValue,
	encodeValue,
	type InferInsert,
	type InferRow,
	parseColumn,
	parseRow,
	type TableDef,
} from "./table.ts";
import { assertWhereColumns, compileWhere, type Where } from "./where.ts";

/** Runs SQL for the builders (gated outside transactions, direct inside). */
export interface Executor {
	/** Run a write statement. */
	exec: (sql: string, params: unknown[]) => Promise<RunResult>;
	/** Run a query. */
	all: <T>(sql: string, params: unknown[]) => Promise<T[]>;
}

/** Insert builder. */
export interface InsertBuilder<C extends ColumnMap> {
	/** Insert one row; defaults are applied and the stored row (with generated id) returned. */
	values: (row: InferInsert<C>) => Promise<InferRow<C>>;
	/** Insert several rows in order. */
	many: (rows: ReadonlyArray<InferInsert<C>>) => Promise<Array<InferRow<C>>>;
}

/** Select builder. Calls chain; `where` calls are ANDed. */
export interface SelectBuilder<C extends ColumnMap> {
	/** Add a filter. */
	where: (where: Where<C>) => SelectBuilder<C>;
	/** Sort by a column (call again for secondary keys). */
	orderBy: (column: keyof C & string, direction?: "asc" | "desc") => SelectBuilder<C>;
	/** Maximum rows. */
	limit: (count: number) => SelectBuilder<C>;
	/** Rows to skip. */
	offset: (count: number) => SelectBuilder<C>;
	/** All matching rows. */
	all: () => Promise<Array<InferRow<C>>>;
	/** First matching row. */
	get: () => Promise<InferRow<C> | undefined>;
	/** Number of matching rows (ignores limit/offset). */
	count: () => Promise<number>;
}

/** Values for `update().set()`: any subset of columns; `undefined` values are skipped (PATCH bodies). */
export type UpdateValues<C extends ColumnMap> = {
	[K in keyof InferInsert<C>]?: InferInsert<C>[K] | undefined;
};

/** Update builder. `run()` requires a `where()`. */
export interface UpdateBuilder<C extends ColumnMap> {
	/** Values to set (validated per column; `undefined` values are skipped). */
	set: (values: UpdateValues<C>) => UpdateBuilder<C>;
	/** Add a filter. */
	where: (where: Where<C>) => UpdateBuilder<C>;
	/** Execute; resolves to the number of changed rows. */
	run: () => Promise<number>;
}

/** Delete builder. `run()` requires a `where()`. */
export interface DeleteBuilder<C extends ColumnMap> {
	/** Add a filter. */
	where: (where: Where<C>) => DeleteBuilder<C>;
	/** Execute; resolves to the number of deleted rows. */
	run: () => Promise<number>;
}

function decodeRow<C extends ColumnMap>(
	table: TableDef<C>,
	row: Record<string, unknown>,
): InferRow<C> {
	const mapped: Record<string, unknown> = {};
	for (const [key, column] of Object.entries(table.columns))
		mapped[key] = decodeValue(column, row[key]);
	return parseRow(table, mapped);
}

function whereSql(table: TableDef, filters: Record<string, unknown>[]) {
	const compiled = compileWhere(
		table,
		filters.length === 1 ? (filters[0] as Record<string, unknown>) : { $and: filters },
	);
	return { sql: compiled.sql ? ` WHERE ${compiled.sql}` : "", params: compiled.params };
}

function assertCount(name: string, value: number): void {
	if (!Number.isInteger(value) || value < 0)
		throw new Error(`${name} must be a non-negative integer`);
}

/** Build an {@link InsertBuilder}. */
export function insertInto<C extends ColumnMap>(
	exec: Executor,
	table: TableDef<C>,
): InsertBuilder<C> {
	const one = async (row: InferInsert<C>): Promise<InferRow<C>> => {
		const input: Record<string, unknown> = { ...(row as Record<string, unknown>) };
		const out: Record<string, unknown> = {};
		let generated: string | undefined;
		for (const [key, column] of Object.entries(table.columns)) {
			if (input[key] === undefined && column.default) input[key] = column.default();
			if (input[key] === undefined && column.autoIncrement) {
				generated = key;
				continue;
			}
			out[key] = parseColumn(table, key, input[key]);
		}
		const keys = Object.keys(out);
		const sql = `INSERT INTO ${quoteIdent(table.name)} (${keys.map(quoteIdent).join(", ")}) VALUES (${placeholders(keys.length)})`;
		const params = keys.map((key) => encodeValue(table.columns[key] as C[string], out[key]));
		const result = await exec.exec(sql, params);
		if (generated) out[generated] = result.lastInsertRowid;
		return out as InferRow<C>;
	};
	return {
		values: one,
		async many(rows) {
			const out: Array<InferRow<C>> = [];
			for (const row of rows) out.push(await one(row));
			return out;
		},
	};
}

/** Build a {@link SelectBuilder}. */
export function selectFrom<C extends ColumnMap>(
	exec: Executor,
	table: TableDef<C>,
): SelectBuilder<C> {
	const filters: Record<string, unknown>[] = [];
	const order: string[] = [];
	let limit: number | undefined;
	let offset: number | undefined;
	const base = () => whereSql(table, filters);
	const builder: SelectBuilder<C> = {
		where(where) {
			assertWhereColumns(table, where as Record<string, unknown>);
			filters.push(where as Record<string, unknown>);
			return builder;
		},
		orderBy(column, direction = "asc") {
			if (!(column in table.columns))
				throw new Error(`unknown column "${column}" on ${table.name}`);
			order.push(`${quoteIdent(column)} ${direction === "desc" ? "DESC" : "ASC"}`);
			return builder;
		},
		limit(count) {
			assertCount("limit", count);
			limit = count;
			return builder;
		},
		offset(count) {
			assertCount("offset", count);
			offset = count;
			return builder;
		},
		async all() {
			const where = base();
			let sql = `SELECT * FROM ${quoteIdent(table.name)}${where.sql}`;
			if (order.length > 0) sql += ` ORDER BY ${order.join(", ")}`;
			if (limit !== undefined || offset !== undefined) sql += ` LIMIT ${limit ?? -1}`;
			if (offset !== undefined) sql += ` OFFSET ${offset}`;
			const rows = await exec.all<Record<string, unknown>>(sql, where.params);
			return rows.map((row) => decodeRow(table, row));
		},
		async get() {
			const previous = limit;
			limit = 1;
			try {
				return (await builder.all())[0];
			} finally {
				limit = previous;
			}
		},
		async count() {
			const where = base();
			const rows = await exec.all<{ n: number }>(
				`SELECT COUNT(*) AS n FROM ${quoteIdent(table.name)}${where.sql}`,
				where.params,
			);
			return Number(rows[0]?.n ?? 0);
		},
	};
	return builder;
}

/** Build an {@link UpdateBuilder}. */
export function updateTable<C extends ColumnMap>(
	exec: Executor,
	table: TableDef<C>,
): UpdateBuilder<C> {
	const filters: Record<string, unknown>[] = [];
	let values: Record<string, unknown> = {};
	const builder: UpdateBuilder<C> = {
		set(next) {
			values = { ...values, ...(next as Record<string, unknown>) };
			return builder;
		},
		where(where) {
			assertWhereColumns(table, where as Record<string, unknown>);
			filters.push(where as Record<string, unknown>);
			return builder;
		},
		async run() {
			if (filters.length === 0) throw new Error(`update ${table.name} requires where()`);
			const keys = Object.keys(values).filter((key) => values[key] !== undefined);
			if (keys.length === 0) return 0;
			const params = keys.map((key) =>
				encodeValue(table.columns[key] as C[string], parseColumn(table, key, values[key])),
			);
			const where = whereSql(table, filters);
			const sql = `UPDATE ${quoteIdent(table.name)} SET ${keys.map((key) => `${quoteIdent(key)} = ?`).join(", ")}${where.sql}`;
			const result = await exec.exec(sql, [...params, ...where.params]);
			return result.changes ?? 0;
		},
	};
	return builder;
}

/** Build a {@link DeleteBuilder}. */
export function deleteFrom<C extends ColumnMap>(
	exec: Executor,
	table: TableDef<C>,
): DeleteBuilder<C> {
	const filters: Record<string, unknown>[] = [];
	const builder: DeleteBuilder<C> = {
		where(where) {
			assertWhereColumns(table, where as Record<string, unknown>);
			filters.push(where as Record<string, unknown>);
			return builder;
		},
		async run() {
			if (filters.length === 0) throw new Error(`delete from ${table.name} requires where()`);
			const where = whereSql(table, filters);
			const result = await exec.exec(
				`DELETE FROM ${quoteIdent(table.name)}${where.sql}`,
				where.params,
			);
			return result.changes ?? 0;
		},
	};
	return builder;
}
