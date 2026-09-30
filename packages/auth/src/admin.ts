import { createAcl, type GroupDef, matchPermission } from "@arachne/acl";
import type { Core } from "./core.ts";
import { AuthError } from "./errors.ts";
import type { Sessions } from "./sessions.ts";
import type { AuthEvent, AuthUser, RequestMeta } from "./types.ts";

/**
 * Who performs an admin action: a user (checked against permissions and
 * levels) or `null` for trusted system code (seeding, CLI, migrations).
 */
export type Actor = AuthUser | null;

/** Filters for {@link Admin.listUsers}. */
export interface ListUsersOptions {
	/** Substring of email or name. */
	search?: string;
	/** Stored status. */
	status?: "active" | "blocked";
	/** Members of this group. */
	group?: string;
	/** Page size (max 200). Default 50. */
	limit?: number;
	/** Rows to skip. */
	offset?: number;
}

/** A stored group. */
export interface GroupInfo extends GroupDef {
	/** Group name. */
	name: string;
}

/** User and group administration. Every actor-based call checks permissions. */
export interface Admin {
	/** One user by id. */
	getUser: (id: string) => Promise<AuthUser | undefined>;
	/** One user by email. */
	findUserByEmail: (email: string) => Promise<AuthUser | undefined>;
	/** Number of users. */
	countUsers: () => Promise<number>;
	/** Search, filter and page users (newest first). */
	listUsers: (options?: ListUsersOptions) => Promise<{ users: AuthUser[]; total: number }>;
	/** Block a user (optionally until a date); their sessions end. Needs `users:block` and a higher level. */
	blockUser: (
		actor: Actor,
		userId: string,
		options: { reason: string; until?: Date | null },
		meta?: RequestMeta,
	) => Promise<AuthUser>;
	/** Lift a block. Needs `users:block` and a higher level. */
	unblockUser: (actor: Actor, userId: string, meta?: RequestMeta) => Promise<AuthUser>;
	/** Replace a user's groups. Needs `users:manage`, a higher level, and levels above the new groups. */
	setGroups: (
		actor: Actor,
		userId: string,
		groups: readonly string[],
		meta?: RequestMeta,
	) => Promise<AuthUser>;
	/** Replace a user's direct ACL rules. Needs `users:manage` and a higher level. */
	setGrants: (
		actor: Actor,
		userId: string,
		grants: readonly string[],
		meta?: RequestMeta,
	) => Promise<AuthUser>;
	/** Delete a user and everything they own. Needs `users:delete` and a higher level. */
	deleteUser: (actor: Actor, userId: string, meta?: RequestMeta) => Promise<void>;
	/** Stored groups, by name. */
	listGroups: () => Promise<GroupInfo[]>;
	/** Create or replace a group. Needs `groups:manage` and a level above the group's. */
	saveGroup: (
		actor: Actor,
		name: string,
		group: GroupDef,
		meta?: RequestMeta,
	) => Promise<GroupInfo>;
	/** Delete a group (members lose it). Needs `groups:manage`. */
	deleteGroup: (actor: Actor, name: string, meta?: RequestMeta) => Promise<void>;
	/** Recent audit events, newest first. */
	events: (options?: { userId?: string; type?: string; limit?: number }) => Promise<AuthEvent[]>;
}

/** Build administration over the core. */
export function createAdmin(core: Core, sessions: Sessions): Admin {
	const { db, tables } = core;
	const forbidden = () => new AuthError("forbidden", "You are not allowed to do that");

	/** Permission + (for targets) strictly-higher level, unless the actor is the system. */
	const authorize = (actor: Actor, permission: string, target?: AuthUser) => {
		if (actor === null) return;
		const acl = core.acl();
		const subject = core.subject(actor);
		if (!acl.can(subject, permission)) throw forbidden();
		if (target && !acl.canManage(subject, core.subject(target))) throw forbidden();
	};

	const groupLevel = (name: string) => core.acl().groups[name]?.level ?? 0;

	/**
	 * Actors may only hand out what they hold: every permission a rule covers
	 * must be one the actor has unconditionally, or under the same conditions.
	 * Denials only restrict, so they are always allowed.
	 */
	const assertHolds = (actor: Actor, rules: readonly string[]) => {
		if (actor === null) return;
		const acl = core.acl();
		const held = acl.permissions(core.subject(actor));
		const registry = Object.keys(acl.registry);
		for (const rule of rules) {
			if (rule.startsWith("!")) continue;
			const [pattern = "", conds = ""] = rule.split("@");
			const conditions = conds.split(",").filter(Boolean);
			const holds = (permission: string) => {
				if (held.always.some((own) => matchPermission(own, permission))) return true;
				const needed = held.conditional[permission];
				return (
					needed !== undefined &&
					conditions.length > 0 &&
					needed.every((c) => conditions.includes(c))
				);
			};
			const covered = registry.length
				? registry.filter((p) => matchPermission(pattern, p))
				: [pattern];
			if (covered.length === 0 || !covered.every(holds)) throw forbidden();
		}
	};

	/** Effective rules of a group (inheritance included), as rule strings. */
	const groupRules = (name: string): string[] => {
		const effective = core.acl().permissions({ id: "group-probe", groups: [name] });
		return [
			...effective.always,
			...Object.entries(effective.conditional).map(([p, c]) => `${p}@${(c ?? []).join(",")}`),
		];
	};

	const admin: Admin = {
		getUser: (id) => core.loadUser(id),
		async findUserByEmail(email) {
			const row = await core.userRowByEmail(email.trim().toLowerCase());
			return row ? core.toUser(row) : undefined;
		},
		countUsers: () => db.select(tables.users).count(),
		async listUsers(options = {}) {
			const where: Record<string, unknown>[] = [];
			if (options.search) {
				const like = `%${options.search.replace(/[%_]/g, "")}%`;
				where.push({ $or: [{ email: { like } }, { name: { like } }] });
			}
			if (options.status) where.push({ status: options.status });
			if (options.group) {
				const ids = (await db.select(tables.memberships).where({ group: options.group }).all()).map(
					(m) => m.userId,
				);
				where.push({ id: { in: ids } });
			}
			const query = () => {
				const q = db.select(tables.users);
				for (const filter of where) q.where(filter as never);
				return q;
			};
			const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
			const rows = await query()
				.orderBy("createdAt", "desc")
				.orderBy("email")
				.limit(limit)
				.offset(options.offset ?? 0)
				.all();
			return { users: await Promise.all(rows.map(core.toUser)), total: await query().count() };
		},
		async blockUser(actor, userId, options, meta) {
			const target = await core.requireUser(userId);
			authorize(actor, "users:block", target);
			await db
				.update(tables.users)
				.set({
					status: "blocked",
					blockedReason: options.reason,
					blockedUntil: options.until ?? null,
					updatedAt: core.now(),
				})
				.where({ id: userId })
				.run();
			await sessions.revokeAll(userId);
			await core.emit("user.blocked", userId, meta, {
				by: actor?.id ?? "system",
				reason: options.reason,
			});
			return core.requireUser(userId);
		},
		async unblockUser(actor, userId, meta) {
			const target = await core.requireUser(userId);
			authorize(actor, "users:block", target);
			await db
				.update(tables.users)
				.set({ status: "active", blockedReason: null, blockedUntil: null, updatedAt: core.now() })
				.where({ id: userId })
				.run();
			await core.emit("user.unblocked", userId, meta, { by: actor?.id ?? "system" });
			return core.requireUser(userId);
		},
		async setGroups(actor, userId, groups, meta) {
			const target = await core.requireUser(userId);
			const known = core.acl().groups;
			for (const group of groups) {
				if (!known[group]) throw new AuthError("unknown_group", `Unknown group "${group}"`);
			}
			authorize(actor, "users:manage", target);
			if (actor && groups.some((g) => groupLevel(g) >= core.acl().level(core.subject(actor))))
				throw forbidden();
			for (const group of groups) assertHolds(actor, groupRules(group));
			await db.transaction(async (tx) => {
				await tx.delete(tables.memberships).where({ userId }).run();
				for (const group of new Set(groups))
					await tx.insert(tables.memberships).values({ userId, group });
			});
			await core.emit("user.groups_changed", userId, meta, {
				by: actor?.id ?? "system",
				groups: [...groups],
			});
			return core.requireUser(userId);
		},
		async setGrants(actor, userId, grants, meta) {
			const target = await core.requireUser(userId);
			authorize(actor, "users:manage", target);
			assertHolds(actor, grants);
			try {
				// Reuse the ACL's rule validation (conditions and registry) on the new rules.
				createAcl({
					...(Object.keys(core.acl().registry).length ? { permissions: core.acl().registry } : {}),
					conditions: core.options.acl?.conditions ?? {},
					groups: { check: { grants: [...grants] } },
				});
			} catch (error) {
				throw new AuthError("invalid_grants", (error as Error).message);
			}
			await db
				.update(tables.users)
				.set({ grants: [...grants], updatedAt: core.now() })
				.where({ id: userId })
				.run();
			await core.emit("user.grants_changed", userId, meta, {
				by: actor?.id ?? "system",
				grants: [...grants],
			});
			return core.requireUser(userId);
		},
		async deleteUser(actor, userId, meta) {
			const target = await core.requireUser(userId);
			authorize(actor, "users:delete", target);
			await db.delete(tables.users).where({ id: userId }).run();
			await core.emit("user.deleted", userId, meta, {
				by: actor?.id ?? "system",
				email: target.email,
			});
		},
		async listGroups() {
			return (await db.select(tables.groups).orderBy("name").all()).map((row) => ({
				name: row.name,
				level: row.level,
				grants: row.grants,
				inherits: row.inherits,
				...(row.description ? { description: row.description } : {}),
			}));
		},
		async saveGroup(actor, name, group, meta) {
			authorize(actor, "groups:manage");
			if (actor && (group.level ?? 0) >= core.acl().level(core.subject(actor))) throw forbidden();
			assertHolds(actor, group.grants);
			for (const parent of group.inherits ?? []) {
				if (core.acl().groups[parent]) assertHolds(actor, groupRules(parent));
			}
			// Validate against the whole policy before persisting.
			const candidate = { ...core.acl().groups, [name]: group };
			try {
				core.acl().with({ groups: candidate });
			} catch (error) {
				throw new AuthError("invalid_grants", (error as Error).message);
			}
			const values = {
				level: group.level ?? 0,
				grants: [...group.grants],
				inherits: [...(group.inherits ?? [])],
				description: group.description ?? null,
			};
			const updated = await db.update(tables.groups).set(values).where({ name }).run();
			if (updated === 0) await db.insert(tables.groups).values({ name, ...values });
			await core.reloadAcl();
			await core.emit("group.saved", null, meta, { by: actor?.id ?? "system", name });
			return { name, ...group };
		},
		async deleteGroup(actor, name, meta) {
			authorize(actor, "groups:manage");
			const remaining = { ...core.acl().groups };
			delete remaining[name];
			try {
				core.acl().with({ groups: remaining });
			} catch (error) {
				throw new AuthError("invalid_grants", (error as Error).message);
			}
			await db.delete(tables.groups).where({ name }).run();
			await core.reloadAcl();
			await core.emit("group.deleted", null, meta, { by: actor?.id ?? "system", name });
		},
		async events(options = {}) {
			const query = db.select(tables.events);
			if (options.userId) query.where({ userId: options.userId });
			if (options.type) query.where({ type: options.type });
			const rows = await query
				.orderBy("id", "desc")
				.limit(Math.min(options.limit ?? 50, 500))
				.all();
			return rows.map(({ id: _id, ...event }) => event);
		},
	};
	return admin;
}
