import type { InferRow } from "@arachnejs/db";
import type { Core } from "./core.ts";
import { randomToken, sha256 } from "./crypto.ts";
import { AuthError } from "./errors.ts";
import type { AuthTables } from "./tables.ts";
import type { ApiTokenInfo, AuthUser, RequestMeta, SessionInfo } from "./types.ts";

type SessionRow = InferRow<AuthTables["sessions"]["columns"]>;
type ApiTokenRow = InferRow<AuthTables["apiTokens"]["columns"]>;

/** A newly created session; `token` goes into the cookie and is never stored. */
export interface NewSession extends SessionInfo {
	/** Opaque session token. */
	token: string;
}

/** Session management. */
export interface Sessions {
	/** Start a session for a user. */
	create: (userId: string, meta?: RequestMeta) => Promise<NewSession>;
	/** Resolve a session token (sliding expiry); `undefined` if invalid, expired or the user is blocked. */
	authenticate: (token: string) => Promise<{ user: AuthUser; session: SessionInfo } | undefined>;
	/** A user's active sessions, newest first. */
	list: (userId: string) => Promise<SessionInfo[]>;
	/** End one of the user's sessions. */
	revoke: (userId: string, sessionId: string) => Promise<void>;
	/** End all of a user's sessions, optionally keeping one. */
	revokeAll: (userId: string, exceptSessionId?: string) => Promise<number>;
	/** End the session that owns `token`. */
	revokeToken: (token: string) => Promise<void>;
}

const info = (row: SessionRow): SessionInfo => ({
	id: row.id,
	createdAt: row.createdAt,
	expiresAt: row.expiresAt,
	lastSeenAt: row.lastSeenAt,
	ip: row.ip,
	userAgent: row.userAgent,
});

/** Build session management over the core. */
export function createSessions(core: Core): Sessions {
	const { db, tables } = core;
	return {
		async create(userId, meta = {}) {
			const token = randomToken();
			const at = core.now();
			const row = await db.insert(tables.sessions).values({
				tokenHash: sha256(token),
				userId,
				createdAt: at,
				expiresAt: new Date(at.getTime() + core.sessionTtlMs),
				lastSeenAt: at,
				ip: meta.ip ?? null,
				userAgent: meta.userAgent?.slice(0, 512) ?? null,
			});
			return { ...info(row), token };
		},
		async authenticate(token) {
			if (typeof token !== "string" || token.length < 20) return undefined;
			const row = await db
				.select(tables.sessions)
				.where({ tokenHash: sha256(token) })
				.get();
			if (!row) return undefined;
			const at = core.now();
			if (row.expiresAt.getTime() <= at.getTime()) {
				await db.delete(tables.sessions).where({ id: row.id }).run();
				return undefined;
			}
			const userRow = await core.userRow(row.userId);
			if (!userRow || core.isBlocked(userRow)) return undefined;
			let session = row;
			// Slide the expiry once less than half the lifetime remains (bounded writes).
			if (row.expiresAt.getTime() - at.getTime() < core.sessionTtlMs / 2) {
				const expiresAt = new Date(at.getTime() + core.sessionTtlMs);
				await db
					.update(tables.sessions)
					.set({ expiresAt, lastSeenAt: at })
					.where({ id: row.id })
					.run();
				session = { ...row, expiresAt, lastSeenAt: at };
			}
			return { user: await core.toUser(userRow), session: info(session) };
		},
		async list(userId) {
			const rows = await db
				.select(tables.sessions)
				.where({ userId, expiresAt: { gt: core.now() } })
				.orderBy("createdAt", "desc")
				.all();
			return rows.map(info);
		},
		async revoke(userId, sessionId) {
			const count = await db.delete(tables.sessions).where({ id: sessionId, userId }).run();
			if (count === 0) throw new AuthError("not_found", "Session not found");
		},
		revokeAll: (userId, exceptSessionId) =>
			db
				.delete(tables.sessions)
				.where(exceptSessionId ? { userId, id: { ne: exceptSessionId } } : { userId })
				.run(),
		async revokeToken(token) {
			await db
				.delete(tables.sessions)
				.where({ tokenHash: sha256(token) })
				.run();
		},
	};
}

/** Options for {@link ApiTokens.create}. */
export interface CreateApiTokenOptions {
	/** Label shown in token lists. */
	name: string;
	/** Scopes; omit for the owner's full permissions. Scopes only ever narrow. */
	scopes?: readonly string[];
	/** Lifetime in days; omit for no expiry. */
	expiresInDays?: number;
}

/** Personal API tokens (`Authorization: Bearer ara_…`). */
export interface ApiTokens {
	/** Create a token. The plain token is returned once and never stored. */
	create: (
		userId: string,
		options: CreateApiTokenOptions,
	) => Promise<{ token: string; record: ApiTokenInfo }>;
	/** Resolve a bearer token; `undefined` if invalid, expired, or the owner is blocked. */
	authenticate: (token: string) => Promise<{ user: AuthUser; token: ApiTokenInfo } | undefined>;
	/** A user's tokens. */
	list: (userId: string) => Promise<ApiTokenInfo[]>;
	/** Delete one of the user's tokens. */
	revoke: (userId: string, tokenId: string) => Promise<void>;
}

const tokenInfo = (row: ApiTokenRow): ApiTokenInfo => ({
	id: row.id,
	name: row.name,
	prefix: row.prefix,
	scopes: row.scopes,
	createdAt: row.createdAt,
	lastUsedAt: row.lastUsedAt,
	expiresAt: row.expiresAt,
});

/** Prefix that identifies Arachne API tokens (lets secret scanners find leaks). */
export const API_TOKEN_PREFIX = "ara_";

/** Build API token management over the core. */
export function createApiTokens(core: Core): ApiTokens {
	const { db, tables } = core;
	return {
		async create(userId, options) {
			await core.requireUser(userId);
			const token = `${API_TOKEN_PREFIX}${randomToken()}`;
			const at = core.now();
			const row = await db.insert(tables.apiTokens).values({
				userId,
				name: options.name,
				tokenHash: sha256(token),
				prefix: token.slice(0, 12),
				scopes: options.scopes ? [...options.scopes] : null,
				createdAt: at,
				expiresAt: options.expiresInDays
					? new Date(at.getTime() + options.expiresInDays * 86_400_000)
					: null,
			});
			await core.emit("token.created", userId, {}, { tokenId: row.id, name: row.name });
			return { token, record: tokenInfo(row) };
		},
		async authenticate(token) {
			if (typeof token !== "string" || !token.startsWith(API_TOKEN_PREFIX)) return undefined;
			const row = await db
				.select(tables.apiTokens)
				.where({ tokenHash: sha256(token) })
				.get();
			if (!row) return undefined;
			const at = core.now();
			if (row.expiresAt && row.expiresAt.getTime() <= at.getTime()) return undefined;
			const userRow = await core.userRow(row.userId);
			if (!userRow || core.isBlocked(userRow)) return undefined;
			if (!row.lastUsedAt || at.getTime() - row.lastUsedAt.getTime() > 60_000) {
				await db.update(tables.apiTokens).set({ lastUsedAt: at }).where({ id: row.id }).run();
			}
			return { user: await core.toUser(userRow), token: tokenInfo(row) };
		},
		async list(userId) {
			return (
				await db.select(tables.apiTokens).where({ userId }).orderBy("createdAt", "desc").all()
			).map(tokenInfo);
		},
		async revoke(userId, tokenId) {
			const count = await db.delete(tables.apiTokens).where({ id: tokenId, userId }).run();
			if (count === 0) throw new AuthError("not_found", "Token not found");
			await core.emit("token.revoked", userId, {}, { tokenId });
		},
	};
}
