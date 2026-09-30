import { quoteIdent } from "./dialect.ts";
import { type ColumnMap, encodeValue, type InferRow, type TableDef } from "./table.ts";

/** Comparison operators for one column. */
export interface Operators<V> {
	/** `=` */
	eq?: V;
	/** `<>` */
	ne?: V;
	/** `>` */
	gt?: V;
	/** `>=` */
	gte?: V;
	/** `<` */
	lt?: V;
	/** `<=` */
	lte?: V;
	/** `IN (…)`; an empty list matches nothing. */
	in?: readonly V[];
	/** `NOT IN (…)`; an empty list matches everything. */
	notIn?: readonly V[];
	/** `LIKE` pattern (`%` and `_` wildcards). */
	like?: string;
	/** `IS NULL` (`true`) or `IS NOT NULL` (`false`). */
	isNull?: boolean;
}

/**
 * Filter for a table. Column keys take a value (equality; `null` → `IS NULL`)
 * or {@link Operators}; keys are ANDed. `$or` / `$and` nest groups.
 *
 * @example
 * ```ts
 * { status: "active", age: { gte: 18 }, $or: [{ role: "admin" }, { verified: true }] }
 * ```
 */
export type Where<C extends ColumnMap> = {
	[K in keyof InferRow<C>]?: InferRow<C>[K] | null | Operators<NonNullable<InferRow<C>[K]>>;
} & {
	/** Any of the groups matches. */
	$or?: ReadonlyArray<Where<C>>;
	/** All of the groups match. */
	$and?: ReadonlyArray<Where<C>>;
};

/** Compiled SQL fragment. */
export interface SqlFragment {
	/** SQL with `?` placeholders. */
	sql: string;
	/** Parameters in order. */
	params: unknown[];
}

const COMPARISONS: Record<string, string> = {
	eq: "=",
	ne: "<>",
	gt: ">",
	gte: ">=",
	lt: "<",
	lte: "<=",
};

function isOperators(value: unknown): value is Operators<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		!(value instanceof Date) &&
		!Array.isArray(value) &&
		Object.keys(value).length > 0 &&
		Object.keys(value).every(
			(key) => key in COMPARISONS || ["in", "notIn", "like", "isNull"].includes(key),
		)
	);
}

function columnCondition(table: TableDef, key: string, value: unknown): SqlFragment {
	const column = table.columns[key];
	if (!column) throw new Error(`unknown column "${key}" on ${table.name}`);
	const ident = quoteIdent(key);
	if (value === null) return { sql: `${ident} IS NULL`, params: [] };
	if (!isOperators(value)) return { sql: `${ident} = ?`, params: [encodeValue(column, value)] };
	const parts: string[] = [];
	const params: unknown[] = [];
	for (const [op, operand] of Object.entries(value)) {
		if (operand === undefined) continue;
		const sqlOp = COMPARISONS[op];
		if (sqlOp) {
			parts.push(`${ident} ${sqlOp} ?`);
			params.push(encodeValue(column, operand));
		} else if (op === "in" || op === "notIn") {
			const list = operand as unknown[];
			if (list.length === 0) parts.push(op === "in" ? "0 = 1" : "1 = 1");
			else {
				parts.push(`${ident} ${op === "in" ? "IN" : "NOT IN"} (${list.map(() => "?").join(", ")})`);
				params.push(...list.map((item) => encodeValue(column, item)));
			}
		} else if (op === "like") {
			parts.push(`${ident} LIKE ?`);
			params.push(operand);
		} else if (op === "isNull") {
			parts.push(`${ident} IS ${operand ? "" : "NOT "}NULL`);
		}
	}
	return { sql: parts.join(" AND ") || "1 = 1", params };
}

/** Compile a {@link Where} to SQL (without the `WHERE` keyword); `""` when empty. */
export function compileWhere(table: TableDef, where: Record<string, unknown>): SqlFragment {
	const parts: string[] = [];
	const params: unknown[] = [];
	for (const [key, value] of Object.entries(where)) {
		if (value === undefined) continue;
		if (key === "$or" || key === "$and") {
			const groups = (value as Record<string, unknown>[]).map((group) =>
				compileWhere(table, group),
			);
			const joiner = key === "$or" ? " OR " : " AND ";
			const sqls = groups.map((group) => `(${group.sql || "1 = 1"})`);
			if (sqls.length === 0) parts.push(key === "$or" ? "0 = 1" : "1 = 1");
			else parts.push(`(${sqls.join(joiner)})`);
			for (const group of groups) params.push(...group.params);
			continue;
		}
		const condition = columnCondition(table, key, value);
		parts.push(condition.sql);
		params.push(...condition.params);
	}
	return { sql: parts.join(" AND "), params };
}

/** Check filter keys eagerly so mistakes throw where the query is built. */
export function assertWhereColumns(table: TableDef, where: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(where)) {
		if (key === "$or" || key === "$and") {
			for (const group of value as Record<string, unknown>[]) assertWhereColumns(table, group);
		} else if (!(key in table.columns)) {
			throw new Error(`unknown column "${key}" on ${table.name}`);
		}
	}
}
