import { type Acl, createAcl, type GroupDef, type Subject } from "@arachne/acl";
import { createIndexSQL, createTableSQL, type DbQueries, type InferRow } from "@arachne/db";
import { s, safeParse } from "@arachne/schema";
import { randomToken, sha256 } from "./crypto.ts";
import { AuthError } from "./errors.ts";
import { defaultTemplates } from "./mail.ts";
import { type AuthTables, authTables } from "./tables.ts";
import type {
	AuthEvent,
	AuthMailKind,
	AuthOptions,
	AuthUser,
	MailContext,
	RequestMeta,
} from "./types.ts";

/** Permissions `@arachne/auth` checks for its own admin features. */
export const AUTH_PERMISSIONS = {
	"users:read": "List and view users",
	"users:block": "Block and unblock users",
	"users:manage": "Change users' groups and grants",
	"users:delete": "Delete users",
	"groups:manage": "Create and edit groups",
	"admin:access": "Open the admin area",
} as const;

/** Groups created on first setup (apps may override any of them). */
export const DEFAULT_GROUPS: Record<string, GroupDef> = {
	guest: { level: 0, grants: [], description: "Anonymous visitors" },
	user: { level: 10, inherits: ["guest"], grants: [], description: "Registered users" },
	moderator: {
		level: 50,
		inherits: ["user"],
		grants: ["users:read", "users:block", "admin:access"],
		description: "Community moderators",
	},
	admin: { level: 100, grants: ["*"], description: "Administrators" },
};

type OneTimePurpose = "verify_email" | "reset_password" | "change_email" | "mfa";
/** A users-table row. */
export type UserRow = InferRow<AuthTables["users"]["columns"]>;

const emailSchema = s.email({ lowercase: true });
const DAY = 86_400_000;

/** Shared state and helpers for the auth feature modules. */
export interface Core {
	db: DbQueries;
	tables: AuthTables;
	options: AuthOptions;
	appName: string;
	secret: string;
	now: () => Date;
	sessionTtlMs: number;
	cookieName: string;
	secureCookie: boolean;
	normalizeEmail: (email: string) => string;
	checkPassword: (password: string, email: string) => Promise<void>;
	hashPassword: (password: string) => Promise<string>;
	verifyPassword: (password: string, hash: string | null) => Promise<boolean>;
	userRow: (id: string) => Promise<UserRow | undefined>;
	userRowByEmail: (email: string) => Promise<UserRow | undefined>;
	toUser: (row: UserRow) => Promise<AuthUser>;
	loadUser: (id: string) => Promise<AuthUser | undefined>;
	requireUser: (id: string) => Promise<AuthUser>;
	isBlocked: (row: UserRow) => boolean;
	issueToken: (
		userId: string,
		purpose: OneTimePurpose,
		ttlMs: number,
		data?: Record<string, unknown>,
	) => Promise<string>;
	consumeToken: (
		token: string,
		purpose: OneTimePurpose,
		keep?: boolean,
	) => Promise<{ userId: string; data: Record<string, unknown> | null }>;
	updateTokenData: (token: string, data: Record<string, unknown>) => Promise<void>;
	emit: (
		type: string,
		userId: string | null,
		meta?: RequestMeta,
		data?: Record<string, unknown>,
	) => Promise<void>;
	mail: (kind: AuthMailKind, to: string, ctx: Omit<MailContext, "appName">) => Promise<void>;
	link: (kind: "verifyEmail" | "resetPassword" | "confirmEmail", token: string) => string;
	acl: () => Acl;
	reloadAcl: () => Promise<void>;
	subject: (user: AuthUser, scopes?: readonly string[] | null) => Subject;
	setup: () => Promise<void>;
}

// A real argon2id hash, so unknown-email logins take as long as real ones.
const DUMMY_HASH = await Bun.password.hash("arachne-timing-equaliser");

/** Build the shared core from options. */
export function createCore(options: AuthOptions): Core {
	const tables = authTables(options.tablePrefix);
	const db = options.db;
	const now = options.now ?? (() => new Date());
	const secret = options.secret ?? randomToken(32);
	const secureCookie = options.session?.secure ?? options.baseUrl.startsWith("https:");
	const cookieName =
		options.session?.cookieName ?? (secureCookie ? "__Host-arachne_session" : "arachne_session");
	const appName = options.appName ?? "Arachne";
	const registry = options.acl?.permissions
		? { ...AUTH_PERMISSIONS, ...options.acl.permissions }
		: undefined;
	let acl: Acl = createAcl<string>({
		...(registry ? { permissions: registry } : {}),
		conditions: options.acl?.conditions ?? {},
		groups: { ...DEFAULT_GROUPS, ...options.acl?.groups },
	});

	const isBlocked = (row: UserRow) =>
		row.status === "blocked" &&
		(row.blockedUntil === null || row.blockedUntil.getTime() > now().getTime());

	const groupsOf = async (userId: string) =>
		(await db.select(tables.memberships).where({ userId }).orderBy("group").all()).map(
			(m) => m.group,
		);

	const toUser = async (row: UserRow): Promise<AuthUser> => {
		const blocked = isBlocked(row);
		return {
			id: row.id,
			email: row.email,
			name: row.name,
			emailVerified: row.emailVerifiedAt !== null,
			emailVerifiedAt: row.emailVerifiedAt,
			status: blocked ? "blocked" : "active",
			blockedReason: blocked ? row.blockedReason : null,
			blockedUntil: blocked ? row.blockedUntil : null,
			groups: await groupsOf(row.id),
			grants: row.grants,
			mfaEnabled: row.mfaEnabled,
			createdAt: row.createdAt,
			lastLoginAt: row.lastLoginAt,
		};
	};

	const core: Core = {
		db,
		tables,
		options,
		appName,
		secret,
		now,
		sessionTtlMs: (options.session?.ttlDays ?? 30) * DAY,
		cookieName,
		secureCookie,
		normalizeEmail(email) {
			const result = safeParse(emailSchema, email);
			if (result.issues) throw new AuthError("invalid_email", "Enter a valid email address");
			return result.value;
		},
		async checkPassword(password, email) {
			const min = options.password?.minLength ?? 12;
			if (typeof password !== "string" || password.length < min) {
				throw new AuthError("weak_password", `Password must be at least ${min} characters`);
			}
			if (password.length > 256)
				throw new AuthError("weak_password", "Password must be at most 256 characters");
			if (password.toLowerCase() === email.toLowerCase()) {
				throw new AuthError("weak_password", "Password must not be your email address");
			}
			const problem = await options.password?.check?.(password, email);
			if (problem) throw new AuthError("weak_password", problem);
		},
		hashPassword: (password) => Bun.password.hash(password, { algorithm: "argon2id" }),
		async verifyPassword(password, hash) {
			if (!hash) {
				await Bun.password.verify(password, DUMMY_HASH);
				return false;
			}
			return Bun.password.verify(password, hash);
		},
		userRow: (id) => db.select(tables.users).where({ id }).get(),
		userRowByEmail: (email) => db.select(tables.users).where({ email }).get(),
		toUser,
		async loadUser(id) {
			const row = await core.userRow(id);
			return row ? toUser(row) : undefined;
		},
		async requireUser(id) {
			const user = await core.loadUser(id);
			if (!user) throw new AuthError("not_found", "User not found");
			return user;
		},
		isBlocked,
		async issueToken(userId, purpose, ttlMs, data) {
			const token = randomToken();
			// One live token per user and purpose: a new link invalidates the old one.
			await db.delete(tables.tokens).where({ userId, purpose }).run();
			await db.insert(tables.tokens).values({
				tokenHash: sha256(token),
				userId,
				purpose,
				expiresAt: new Date(now().getTime() + ttlMs),
				data: data ?? null,
			});
			return token;
		},
		async consumeToken(token, purpose, keep = false) {
			const invalid = new AuthError("invalid_token", "This link is invalid or has expired");
			if (typeof token !== "string" || token.length < 20) throw invalid;
			const row = await db
				.select(tables.tokens)
				.where({ tokenHash: sha256(token) })
				.get();
			if (!row || row.purpose !== purpose) throw invalid;
			if (row.expiresAt.getTime() <= now().getTime()) {
				await db.delete(tables.tokens).where({ tokenHash: row.tokenHash }).run();
				throw invalid;
			}
			if (!keep) await db.delete(tables.tokens).where({ tokenHash: row.tokenHash }).run();
			return { userId: row.userId, data: row.data };
		},
		async updateTokenData(token, data) {
			await db
				.update(tables.tokens)
				.set({ data })
				.where({ tokenHash: sha256(token) })
				.run();
		},
		async emit(type, userId, meta = {}, data) {
			const event: AuthEvent = {
				type,
				userId,
				ip: meta.ip ?? null,
				userAgent: meta.userAgent ?? null,
				at: now(),
				data: data ?? null,
			};
			await db.insert(tables.events).values(event);
			options.onEvent?.(event);
		},
		async mail(kind, to, ctx) {
			if (!options.mailer) throw new Error(`auth: a mailer is required to send ${kind} mail`);
			const template = options.templates?.[kind] ?? defaultTemplates[kind];
			await options.mailer.send({ to, ...template({ appName, ...ctx }) });
		},
		link(kind, token) {
			const paths = {
				verifyEmail: options.links?.verifyEmail ?? "/auth/verify-email",
				resetPassword: options.links?.resetPassword ?? "/auth/reset-password",
				confirmEmail: options.links?.confirmEmail ?? "/auth/confirm-email",
			};
			const url = new URL(paths[kind], options.baseUrl);
			url.searchParams.set("token", token);
			return url.href;
		},
		acl: () => acl,
		async reloadAcl() {
			const rows = await db.select(tables.groups).orderBy("name").all();
			const groups: Record<string, GroupDef> = {};
			for (const row of rows) {
				groups[row.name] = {
					level: row.level,
					grants: row.grants,
					inherits: row.inherits,
					...(row.description ? { description: row.description } : {}),
				};
			}
			acl = acl.with({ groups });
		},
		subject: (user, scopes) => ({
			id: user.id,
			groups: user.groups,
			grants: user.grants,
			blocked: user.status === "blocked",
			...(scopes ? { scopes } : {}),
		}),
		async setup() {
			for (const table of Object.values(tables)) {
				await db.execute(createTableSQL(table));
				for (const sql of createIndexSQL(table)) await db.execute(sql);
			}
			for (const [name, group] of Object.entries(acl.groups)) {
				const exists = await db.select(tables.groups).where({ name }).count();
				if (exists) continue;
				await db.insert(tables.groups).values({
					name,
					level: group.level ?? 0,
					grants: [...group.grants],
					inherits: [...(group.inherits ?? [])],
					description: group.description ?? null,
				});
			}
			await core.reloadAcl();
		},
	};
	return core;
}
