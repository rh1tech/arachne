import type { AnySchema, Schema } from "@arachne/schema";
import { parse } from "@arachne/schema";

export type SqlType = "text" | "integer" | "real" | "boolean";

export interface ColumnOptions {
	primaryKey?: boolean | undefined;
	notNull?: boolean | undefined;
	unique?: boolean | undefined;
}

export interface ColumnDef<TSchema extends AnySchema = AnySchema> {
	readonly sqlType: SqlType;
	readonly schema: TSchema;
	readonly primaryKey: boolean;
	readonly notNull: boolean;
	readonly unique: boolean;
}

function column<TSchema extends AnySchema>(
	sqlType: SqlType,
	schema: TSchema,
	options: ColumnOptions = {},
): ColumnDef<TSchema> {
	return {
		sqlType,
		schema,
		primaryKey: options.primaryKey ?? false,
		notNull: options.notNull ?? options.primaryKey ?? false,
		unique: options.unique ?? false,
	};
}

export const col = {
	text: <S extends Schema<string>>(schema: S, options?: ColumnOptions) =>
		column("text", schema, options),
	integer: <S extends Schema<number>>(schema: S, options?: ColumnOptions) =>
		column("integer", schema, options),
	real: <S extends Schema<number>>(schema: S, options?: ColumnOptions) =>
		column("real", schema, options),
	boolean: <S extends Schema<boolean>>(schema: S, options?: ColumnOptions) =>
		column("boolean", schema, options),
};

export type ColumnMap = Record<string, ColumnDef>;

export interface TableDef<TColumns extends ColumnMap = ColumnMap> {
	readonly name: string;
	readonly columns: TColumns;
}

export type InferRow<TColumns extends ColumnMap> = {
	[K in keyof TColumns]: TColumns[K]["schema"]["_output"];
};

export function defineTable<TColumns extends ColumnMap>(
	name: string,
	columns: TColumns,
): TableDef<TColumns> {
	if (!name) throw new Error("table name is required");
	return { name, columns };
}

export function parseRow<TColumns extends ColumnMap>(
	table: TableDef<TColumns>,
	value: unknown,
): InferRow<TColumns> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new Error(`expected object for table ${table.name}`);
	}
	const input = value as Record<string, unknown>;
	const out: Record<string, unknown> = {};
	for (const [key, column] of Object.entries(table.columns)) {
		out[key] = parse(column.schema, input[key]);
	}
	return out as InferRow<TColumns>;
}

export function sqlTypeDDL(sqlType: SqlType): string {
	switch (sqlType) {
		case "text":
			return "TEXT";
		case "integer":
		case "boolean":
			return "INTEGER";
		case "real":
			return "REAL";
	}
}

export function createTableSQL(table: TableDef): string {
	const parts: string[] = [];
	for (const [name, column] of Object.entries(table.columns)) {
		let part = `"${name}" ${sqlTypeDDL(column.sqlType)}`;
		if (column.primaryKey) part += " PRIMARY KEY";
		if (column.notNull && !column.primaryKey) part += " NOT NULL";
		if (column.unique && !column.primaryKey) part += " UNIQUE";
		parts.push(part);
	}
	return `CREATE TABLE IF NOT EXISTS "${table.name}" (${parts.join(", ")})`;
}
