import { col, defineTable } from "@arachnejs/db";
import { s } from "@arachnejs/schema";

const id = () =>
	col.text(s.string({ min: 1 }), { primaryKey: true, default: () => crypto.randomUUID() });
const nullableText = () => col.text(s.nullable(s.string()), { default: () => null });
const nullableDate = () => col.date({ schema: s.nullable(s.date()), default: () => null });
const stringList = () => col.json(s.array(s.string()), { default: () => [] });

/**
 * Tables used by `@arachnejs/auth`. Names can be prefixed (`auth_users`, …).
 * Pass them to migrations (`createTable(auth.tables.users)`) or let
 * `auth.setup()` create them.
 */
export function authTables(prefix = "") {
	const users = defineTable(
		`${prefix}users`,
		{
			id: id(),
			email: col.text(s.email({ lowercase: true }), { unique: true }),
			name: nullableText(),
			passwordHash: nullableText(),
			emailVerifiedAt: nullableDate(),
			status: col.text(s.enum(["active", "blocked"]), { default: () => "active" }),
			blockedReason: nullableText(),
			blockedUntil: nullableDate(),
			grants: stringList(),
			failedLogins: col.integer(s.integer({ min: 0 }), { default: () => 0 }),
			lockedUntil: nullableDate(),
			mfaSecret: nullableText(),
			mfaEnabled: col.boolean(s.boolean(), { default: () => false }),
			mfaLastStep: col.integer(s.integer(), { default: () => 0 }),
			recoveryCodes: stringList(),
			createdAt: col.date(),
			updatedAt: col.date(),
			lastLoginAt: nullableDate(),
		},
		{ indexes: [{ columns: ["status"] }] },
	);
	const groups = defineTable(`${prefix}groups`, {
		name: col.text(s.string({ min: 1, max: 64, pattern: /^[a-z0-9_-]+$/ }), { primaryKey: true }),
		level: col.integer(s.integer(), { default: () => 0 }),
		grants: stringList(),
		inherits: stringList(),
		description: nullableText(),
	});
	const memberships = defineTable(
		`${prefix}user_groups`,
		{
			id: id(),
			userId: col.text(s.string(), {
				references: { table: `${prefix}users`, onDelete: "cascade" },
			}),
			group: col.text(s.string(), {
				references: {
					table: `${prefix}groups`,
					column: "name",
					onDelete: "cascade",
					onUpdate: "cascade",
				},
			}),
		},
		{ indexes: [{ columns: ["userId", "group"], unique: true }, { columns: ["group"] }] },
	);
	const sessions = defineTable(
		`${prefix}sessions`,
		{
			id: id(),
			tokenHash: col.text(s.string(), { unique: true }),
			userId: col.text(s.string(), {
				references: { table: `${prefix}users`, onDelete: "cascade" },
			}),
			createdAt: col.date(),
			expiresAt: col.date(),
			lastSeenAt: col.date(),
			ip: nullableText(),
			userAgent: nullableText(),
		},
		{ indexes: [{ columns: ["userId"] }] },
	);
	const tokens = defineTable(
		`${prefix}one_time_tokens`,
		{
			tokenHash: col.text(s.string(), { primaryKey: true }),
			userId: col.text(s.string(), {
				references: { table: `${prefix}users`, onDelete: "cascade" },
			}),
			purpose: col.text(s.enum(["verify_email", "reset_password", "change_email", "mfa"])),
			expiresAt: col.date(),
			data: col.json(s.nullable(s.record(s.unknown())), { default: () => null }),
		},
		{ indexes: [{ columns: ["userId", "purpose"] }] },
	);
	const apiTokens = defineTable(
		`${prefix}api_tokens`,
		{
			id: id(),
			userId: col.text(s.string(), {
				references: { table: `${prefix}users`, onDelete: "cascade" },
			}),
			name: col.text(s.string({ min: 1, max: 100 })),
			tokenHash: col.text(s.string(), { unique: true }),
			prefix: col.text(s.string()),
			scopes: col.json(s.nullable(s.array(s.string())), { default: () => null }),
			createdAt: col.date(),
			lastUsedAt: nullableDate(),
			expiresAt: nullableDate(),
		},
		{ indexes: [{ columns: ["userId"] }] },
	);
	const events = defineTable(
		`${prefix}auth_events`,
		{
			id: col.integer(s.integer(), { primaryKey: true, autoIncrement: true }),
			type: col.text(s.string()),
			userId: nullableText(),
			ip: nullableText(),
			userAgent: nullableText(),
			at: col.date(),
			data: col.json(s.nullable(s.record(s.unknown())), { default: () => null }),
		},
		{ indexes: [{ columns: ["userId"] }, { columns: ["type"] }] },
	);
	return { users, groups, memberships, sessions, tokens, apiTokens, events };
}

/** The tables object returned by {@link authTables}. */
export type AuthTables = ReturnType<typeof authTables>;
