import { type SchemaSpec, schemaFromSpec } from "@arachne/schema";
import {
	type ColumnDef,
	type ColumnMap,
	type ColumnOptions,
	col,
	defineTable,
	type ReferentialAction,
	type SqlType,
	type TableDef,
} from "./table.ts";

/** A column described as JSON (for MCP tools and generators). */
export interface ColumnSpec {
	/** Storage class. */
	type: SqlType;
	/** Value schema; defaults to one matching `type`. */
	schema?: SchemaSpec;
	/** Primary key. */
	primaryKey?: boolean;
	/** Database-generated integer key. */
	autoIncrement?: boolean;
	/** Unique constraint. */
	unique?: boolean;
	/** Foreign key. */
	references?: { table: string; column?: string; onDelete?: ReferentialAction };
}

/** A table described as JSON. */
export interface TableSpec {
	/** Table name. */
	name: string;
	/** Columns by name. */
	columns: Record<string, ColumnSpec>;
	/** Secondary indexes. */
	indexes?: Array<{ columns: string[]; unique?: boolean }>;
}

/** Schema used when a column spec omits one. */
const DEFAULT_SPECS: Record<Exclude<SqlType, "date">, SchemaSpec> = {
	text: { kind: "string" },
	integer: { kind: "number", int: true },
	real: { kind: "number" },
	boolean: { kind: "boolean" },
	json: { kind: "object", fields: {} },
};

function toColumn(spec: ColumnSpec): ColumnDef {
	const options: ColumnOptions = {
		...(spec.primaryKey ? { primaryKey: true } : {}),
		...(spec.autoIncrement ? { autoIncrement: true } : {}),
		...(spec.unique ? { unique: true } : {}),
		...(spec.references ? { references: spec.references } : {}),
	};
	if (spec.type === "date") return col.date(options) as ColumnDef;
	const schema = schemaFromSpec(spec.schema ?? DEFAULT_SPECS[spec.type]);
	const build = col[spec.type] as (schema: never, options: ColumnOptions) => ColumnDef;
	return build(schema as never, options);
}

/** Build a {@link TableDef} from a JSON {@link TableSpec}. */
export function tableFromSpec(spec: TableSpec): TableDef {
	const columns: ColumnMap = {};
	for (const [name, column] of Object.entries(spec.columns)) columns[name] = toColumn(column);
	return defineTable(spec.name, columns, { indexes: spec.indexes ?? [] });
}
