import { type Dialect, quoteIdent } from "./dialect.ts";
import type { ColumnDef, IndexDef, SqlType, TableDef } from "./table.ts";

const SQLITE_TYPES: Record<SqlType, string> = {
	text: "TEXT",
	integer: "INTEGER",
	real: "REAL",
	boolean: "INTEGER",
	json: "TEXT",
	date: "INTEGER",
};

/** DDL type for a storage class (dialect overrides win). */
export function sqlTypeDDL(sqlType: SqlType, dialect?: Pick<Dialect, "types">): string {
	return dialect?.types?.[sqlType] ?? SQLITE_TYPES[sqlType];
}

/** Column definition fragment (`"name" TYPE NOT NULL …`), as used in `CREATE TABLE` and `ADD COLUMN`. */
export function columnSQL(
	name: string,
	column: ColumnDef,
	dialect?: Pick<Dialect, "types" | "autoIncrement">,
) {
	let part = `${quoteIdent(name)} ${sqlTypeDDL(column.sqlType, dialect)}`;
	if (column.primaryKey) {
		part += column.autoIncrement
			? ` ${dialect?.autoIncrement ?? "PRIMARY KEY AUTOINCREMENT"}`
			: " PRIMARY KEY";
	} else {
		if (column.notNull) part += " NOT NULL";
		if (column.unique) part += " UNIQUE";
	}
	const ref = column.references;
	if (ref) {
		part += ` REFERENCES ${quoteIdent(ref.table)} (${quoteIdent(ref.column ?? "id")})`;
		if (ref.onDelete) part += ` ON DELETE ${ref.onDelete.toUpperCase()}`;
		if (ref.onUpdate) part += ` ON UPDATE ${ref.onUpdate.toUpperCase()}`;
	}
	return part;
}

/** `CREATE TABLE IF NOT EXISTS …` for a table. */
export function createTableSQL(
	table: TableDef,
	dialect?: Pick<Dialect, "types" | "autoIncrement">,
): string {
	const parts = Object.entries(table.columns).map(([name, column]) =>
		columnSQL(name, column, dialect),
	);
	return `CREATE TABLE IF NOT EXISTS ${quoteIdent(table.name)} (${parts.join(", ")})`;
}

/** Default index name: `<table>_<col>_<col>_idx`. */
export function indexName(table: TableDef, index: IndexDef): string {
	return index.name ?? `${table.name}_${index.columns.join("_")}_idx`;
}

/** `CREATE [UNIQUE] INDEX IF NOT EXISTS …` for each of the table's indexes. */
export function createIndexSQL(table: TableDef): string[] {
	return table.indexes.map(
		(index) =>
			`CREATE ${index.unique ? "UNIQUE " : ""}INDEX IF NOT EXISTS ${quoteIdent(indexName(table, index))} ON ${quoteIdent(table.name)} (${index.columns.map(quoteIdent).join(", ")})`,
	);
}
