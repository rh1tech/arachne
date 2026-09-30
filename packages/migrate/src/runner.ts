import { type DbQueries, quoteIdent } from "@arachnejs/db";
import type { Migration } from "./migration.ts";

/** Options shared by the runner functions. */
export interface RunnerOptions {
	/** Journal table. Default `_arachne_migrations`. */
	table?: string;
	/** Called after each migration is applied or rolled back. */
	onProgress?: (event: { id: string; direction: "up" | "down"; ms: number }) => void;
}

/** A journal entry. */
export interface AppliedMigration {
	/** Migration id. */
	id: string;
	/** When it was applied. */
	appliedAt: Date;
}

/** Result of {@link migrationStatus}. */
export interface MigrationStatus {
	/** Applied migrations, oldest first. */
	applied: AppliedMigration[];
	/** Migrations not applied yet, in run order. */
	pending: Migration[];
	/** Journal ids with no matching migration (deleted or renamed files). */
	unknown: string[];
}

const DEFAULT_TABLE = "_arachne_migrations";

/** Throw unless ids are unique and in ascending order. */
export function assertOrdered(migrations: readonly Migration[]): void {
	const seen = new Set<string>();
	let previous = "";
	for (const migration of migrations) {
		if (seen.has(migration.id)) throw new Error(`duplicate migration id "${migration.id}"`);
		if (migration.id < previous) {
			throw new Error(
				`migration "${migration.id}" is out of order (after "${previous}"); ids must sort ascending`,
			);
		}
		seen.add(migration.id);
		previous = migration.id;
	}
}

async function journal(db: DbQueries, table: string): Promise<AppliedMigration[]> {
	await db.execute(
		`CREATE TABLE IF NOT EXISTS ${quoteIdent(table)} ("id" TEXT PRIMARY KEY, "applied_at" INTEGER NOT NULL)`,
	);
	const rows = await db.query<{ id: string; applied_at: number }>(
		`SELECT "id", "applied_at" FROM ${quoteIdent(table)} ORDER BY "id"`,
	);
	return rows.map((row) => ({ id: row.id, appliedAt: new Date(row.applied_at) }));
}

/** Applied, pending and unknown migrations. Throws synchronously on bad ordering. */
export function migrationStatus(
	db: DbQueries,
	migrations: readonly Migration[],
	options: RunnerOptions = {},
): Promise<MigrationStatus> {
	assertOrdered(migrations);
	return (async () => {
		const applied = await journal(db, options.table ?? DEFAULT_TABLE);
		const done = new Set(applied.map((entry) => entry.id));
		const known = new Set(migrations.map((migration) => migration.id));
		return {
			applied,
			pending: migrations.filter((migration) => !done.has(migration.id)),
			unknown: applied.map((entry) => entry.id).filter((id) => !known.has(id)),
		};
	})();
}

function wrap(id: string, direction: string, error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);
	return new Error(`migration ${id} (${direction}) failed: ${message}`, { cause: error });
}

/**
 * Apply pending migrations in id order. Each runs in its own transaction with
 * its journal entry; the first failure rolls back that migration and stops.
 */
export async function migrate(
	db: DbQueries,
	migrations: readonly Migration[],
	options: RunnerOptions = {},
): Promise<{ applied: string[] }> {
	const table = options.table ?? DEFAULT_TABLE;
	const { pending } = await migrationStatus(db, migrations, options);
	const applied: string[] = [];
	for (const migration of pending) {
		const started = performance.now();
		try {
			await db.transaction(async (tx) => {
				await migration.up(tx);
				await tx.execute(`INSERT INTO ${quoteIdent(table)} ("id", "applied_at") VALUES (?, ?)`, [
					migration.id,
					Date.now(),
				]);
			});
		} catch (error) {
			throw wrap(migration.id, "up", error);
		}
		applied.push(migration.id);
		options.onProgress?.({ id: migration.id, direction: "up", ms: performance.now() - started });
	}
	return { applied };
}

/** Revert the latest `steps` applied migrations (default 1), newest first. */
export async function rollback(
	db: DbQueries,
	migrations: readonly Migration[],
	options: RunnerOptions & { steps?: number } = {},
): Promise<{ rolledBack: string[] }> {
	const table = options.table ?? DEFAULT_TABLE;
	const { applied } = await migrationStatus(db, migrations, options);
	const byId = new Map(migrations.map((migration) => [migration.id, migration]));
	const targets = applied.slice(-(options.steps ?? 1)).reverse();
	for (const entry of targets) {
		const migration = byId.get(entry.id);
		if (!migration) throw new Error(`cannot roll back ${entry.id}: migration not found`);
		if (!migration.down) throw new Error(`cannot roll back: ${entry.id} has no down()`);
	}
	const rolledBack: string[] = [];
	for (const entry of targets) {
		const migration = byId.get(entry.id) as Migration;
		const started = performance.now();
		try {
			await db.transaction(async (tx) => {
				await migration.down?.(tx);
				await tx.execute(`DELETE FROM ${quoteIdent(table)} WHERE "id" = ?`, [entry.id]);
			});
		} catch (error) {
			throw wrap(entry.id, "down", error);
		}
		rolledBack.push(entry.id);
		options.onProgress?.({ id: entry.id, direction: "down", ms: performance.now() - started });
	}
	return { rolledBack };
}
