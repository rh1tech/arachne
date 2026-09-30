import {
	columnSQL,
	createIndexSQL,
	createTableSQL,
	type DbQueries,
	quoteIdent,
	type TableDef,
} from "@arachnejs/db";

/** A step that changes the database. `up`/`down` run inside a transaction. */
export interface Migration {
	/** Unique, sortable id (`0001_create_users`, `2026-09-30T1200_add_names`). */
	readonly id: string;
	/** What the migration does (shown by `status`). */
	readonly description?: string | undefined;
	/** Apply the change. */
	readonly up: (db: DbQueries) => Promise<void>;
	/** Revert the change; migrations without it cannot be rolled back. */
	readonly down?: ((db: DbQueries) => Promise<void>) | undefined;
}

/** The `up`/`down` pair produced by helpers such as {@link createTable}. */
export type MigrationSteps = Pick<Migration, "up" | "down">;

const ID = /^[A-Za-z0-9_.:-]+$/;

/** Validate and freeze a migration. */
export function defineMigration(migration: Migration): Migration {
	if (!ID.test(migration.id)) {
		throw new Error(`invalid migration id "${migration.id}" (letters, digits, _ . : - only)`);
	}
	return Object.freeze({ ...migration });
}

async function run(db: DbQueries, statements: readonly string[]): Promise<void> {
	for (const statement of statements) await db.execute(statement);
}

/** Raw SQL steps. Pass `down` to make the migration reversible. */
export function sql(
	up: string | readonly string[],
	down?: string | readonly string[],
): MigrationSteps {
	const ups = typeof up === "string" ? [up] : up;
	const downs = down === undefined ? undefined : typeof down === "string" ? [down] : down;
	return {
		up: (db) => run(db, ups),
		...(downs ? { down: (db: DbQueries) => run(db, downs) } : {}),
	};
}

/** Create a table and its indexes; `down` drops it. */
export function createTable(table: TableDef): MigrationSteps {
	return sql(
		[createTableSQL(table), ...createIndexSQL(table)],
		`DROP TABLE IF EXISTS ${quoteIdent(table.name)}`,
	);
}

/**
 * Add one column from a table definition; `down` drops it (SQLite 3.35+).
 * NOT NULL columns need a SQL default or a backfill, so prefer nullable
 * columns for `ADD COLUMN`.
 */
export function addColumn(table: TableDef, name: string): MigrationSteps {
	const column = table.columns[name];
	if (!column) throw new Error(`addColumn: ${table.name} has no column "${name}"`);
	return sql(
		`ALTER TABLE ${quoteIdent(table.name)} ADD COLUMN ${columnSQL(name, column)}`,
		`ALTER TABLE ${quoteIdent(table.name)} DROP COLUMN ${quoteIdent(name)}`,
	);
}

/** Drop a table. Irreversible unless you pass the definition to recreate. */
export function dropTable(name: string, recreate?: TableDef): MigrationSteps {
	return sql(
		`DROP TABLE IF EXISTS ${quoteIdent(name)}`,
		recreate ? [createTableSQL(recreate), ...createIndexSQL(recreate)] : undefined,
	);
}
