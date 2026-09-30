import {
	columnSQL,
	createIndexSQL,
	createTableSQL,
	type DbClient,
	indexName,
	quoteIdent,
	sqlTypeDDL,
	type TableDef,
} from "@arachnejs/db";

/** Statements that bring the database up to the table definitions. */
export interface SchemaPlan {
	/** SQL to run, in order. Empty when the database matches. */
	statements: string[];
	/** Differences that need a hand-written migration (drops, type changes, NOT NULL adds). */
	warnings: string[];
}

interface ColumnInfo {
	name: string;
	type: string;
}

type AnyDb = Pick<DbClient<Record<string, TableDef>>, "query" | "dialect">;

async function planTable(db: AnyDb, table: TableDef, plan: SchemaPlan): Promise<void> {
	const existing = await db.query<ColumnInfo>(`PRAGMA table_info(${quoteIdent(table.name)})`);
	if (existing.length === 0) {
		plan.statements.push(createTableSQL(table, db.dialect), ...createIndexSQL(table));
		return;
	}
	const byName = new Map(existing.map((column) => [column.name, column]));
	for (const [name, column] of Object.entries(table.columns)) {
		const current = byName.get(name);
		if (!current) {
			if (column.notNull || column.primaryKey) {
				plan.warnings.push(
					`${table.name}.${name} is NOT NULL: ADD COLUMN needs a SQL default or a backfill; write this migration by hand`,
				);
				continue;
			}
			plan.statements.push(
				`ALTER TABLE ${quoteIdent(table.name)} ADD COLUMN ${columnSQL(name, column, db.dialect)}`,
			);
			continue;
		}
		const expected = sqlTypeDDL(column.sqlType, db.dialect);
		if (current.type.toUpperCase() !== expected.toUpperCase()) {
			plan.warnings.push(
				`${table.name}.${name} is ${current.type} in the database but ${expected} in the schema`,
			);
		}
	}
	for (const name of byName.keys()) {
		if (!(name in table.columns)) {
			plan.warnings.push(
				`${table.name}.${name} exists in the database but not in the schema (drop it in a migration if intended)`,
			);
		}
	}
	const indexes = new Set(
		(await db.query<{ name: string }>(`PRAGMA index_list(${quoteIdent(table.name)})`)).map(
			(row) => row.name,
		),
	);
	const creates = createIndexSQL(table);
	table.indexes.forEach((index, i) => {
		if (!indexes.has(indexName(table, index))) plan.statements.push(creates[i] as string);
	});
}

/**
 * Compare table definitions with the live database (SQLite introspection)
 * and list the statements that would reconcile them. Destructive or risky
 * differences are reported as warnings, never planned.
 */
export async function planSchema(db: AnyDb, tables: Record<string, TableDef>): Promise<SchemaPlan> {
	if (db.dialect.name && db.dialect.name !== "sqlite") {
		throw new Error(`planSchema supports sqlite only (dialect: ${db.dialect.name})`);
	}
	const plan: SchemaPlan = { statements: [], warnings: [] };
	for (const table of Object.values(tables)) await planTable(db, table, plan);
	return plan;
}

/** TypeScript source for a migration module that applies `plan`. */
export function renderMigration(id: string, plan: SchemaPlan): string {
	const warnings = plan.warnings.map((warning) => `// TODO: ${warning}\n`).join("");
	const statements = plan.statements
		.map((statement) => `\t\t${JSON.stringify(statement)},\n`)
		.join("");
	return `import { defineMigration, sql } from "@arachnejs/migrate";

${warnings}export default defineMigration({
	id: ${JSON.stringify(id)},
	...sql([
${statements}	]),
});
`;
}
