/**
 * Who is asking. Users, API tokens and service accounts all map to this.
 */
export interface Subject {
	/** Stable id (user id, token id). */
	readonly id: string;
	/** Group names the subject belongs to. */
	readonly groups: readonly string[];
	/** Direct rules (`"x:y"`, `"!x:y"`, `"x:y@cond"`); they override group rules. */
	readonly grants?: readonly string[] | undefined;
	/** Token scopes: when set, a permission must also match one of them. */
	readonly scopes?: readonly string[] | undefined;
	/** Blocked subjects are denied everything. */
	readonly blocked?: boolean | undefined;
	/** Extra attributes conditions may read (tenant, department, …). */
	readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

/** Input to a condition. */
export interface ConditionInput {
	/** The subject being checked. */
	subject: Subject;
	/** The permission being checked. */
	permission: string;
	/** The resource passed to `can()`, if any. */
	resource: unknown;
}

/** A named attribute check referenced from rules as `permission@name`. */
export type Condition = (input: ConditionInput) => boolean;

/** A group (role): rules, inherited groups and a rank. */
export interface GroupDef {
	/** Rank for "at least" checks and management (guest 0 … admin 100). Default 0. */
	level?: number;
	/** Groups whose rules this group also has. */
	inherits?: readonly string[];
	/** Rules: `resource:action`, wildcards `*`, denials `!…`, conditions `…@a,b`. */
	grants: readonly string[];
	/** Human description. */
	description?: string;
}

/** Configuration for {@link createAcl}. */
export interface AclConfig<P extends string = string> {
	/**
	 * Registry of permissions with descriptions. When given, grants must match
	 * at least one registered permission and `can()` rejects unknown ones.
	 */
	permissions?: Record<P, string>;
	/** Named conditions used by `permission@name` rules. */
	conditions?: Record<string, Condition>;
	/** Groups by name. */
	groups: Record<string, GroupDef>;
}

/** Why a check passed or failed (see {@link Acl.explain}). */
export interface Explanation {
	/** The decision. */
	allowed: boolean;
	/** The rule that decided, as written. */
	rule?: string;
	/** Where the rule came from: `user` or `group:<name>`. */
	source?: string;
	/** Why it was denied (`denied`, `blocked`, `outside token scope`, `no matching grant`). */
	reason?: string;
}

/** Permissions a subject holds, split by whether they need conditions. */
export interface EffectivePermissions<P extends string = string> {
	/** Granted without conditions. */
	always: P[];
	/** Granted only when these conditions pass. */
	conditional: Partial<Record<P, string[]>>;
}

/** Thrown by {@link Acl.assert}. */
export class AccessDenied extends Error {
	/** The permission that was refused. */
	readonly permission: string;
	/** The subject's id. */
	readonly subjectId: string;

	constructor(permission: string, subjectId: string, reason = "denied") {
		super(`access denied: ${permission} (${reason})`);
		this.name = "AccessDenied";
		this.permission = permission;
		this.subjectId = subjectId;
	}
}

/** An immutable access-control policy. */
export interface Acl<P extends string = string> {
	/** Groups this ACL was built from. */
	readonly groups: Readonly<Record<string, GroupDef>>;
	/** Registered permissions (empty when no registry was given). */
	readonly registry: Readonly<Record<string, string>>;
	/** May `subject` do `permission` (on `resource`)? */
	can: (subject: Subject, permission: P, resource?: unknown) => boolean;
	/** Like {@link Acl.can} but throws {@link AccessDenied}. */
	assert: (subject: Subject, permission: P, resource?: unknown) => void;
	/** The decision plus the rule that made it. */
	explain: (subject: Subject, permission: P, resource?: unknown) => Explanation;
	/** Registered permissions the subject holds (needs a registry for wildcard expansion). */
	permissions: (subject: Subject) => EffectivePermissions<P>;
	/** Highest level among the subject's groups (0 when none). */
	level: (subject: Subject) => number;
	/** Subject's level is at least `group`'s level. */
	atLeast: (subject: Subject, group: string) => boolean;
	/** `actor` outranks `target` (strictly higher level) and may manage them. */
	canManage: (actor: Subject, target: Subject) => boolean;
	/** A new ACL with some config replaced (e.g. groups loaded from the database). */
	with: (changes: Partial<AclConfig<P>>) => Acl<P>;
}

interface Rule {
	text: string;
	pattern: string;
	deny: boolean;
	conditions: string[];
	source: string;
}

/**
 * Does permission `pattern` cover `permission`? Segments are `:`-separated;
 * `*` matches one segment, or everything when it is the last segment.
 */
export function matchPermission(pattern: string, permission: string): boolean {
	if (pattern === "*" || pattern === permission) return true;
	const want = pattern.split(":");
	const have = permission.split(":");
	for (let i = 0; i < want.length; i += 1) {
		const part = want[i];
		if (part === "*" && i === want.length - 1) return have.length >= want.length;
		if (have[i] === undefined || (part !== "*" && part !== have[i])) return false;
	}
	return want.length === have.length;
}

function parseRule(text: string, source: string): Rule {
	const deny = text.startsWith("!");
	const body = deny ? text.slice(1) : text;
	const at = body.indexOf("@");
	const pattern = at === -1 ? body : body.slice(0, at);
	const conditions =
		at === -1
			? []
			: body
					.slice(at + 1)
					.split(",")
					.filter(Boolean);
	if (!pattern) throw new Error(`empty permission in rule "${text}"`);
	return { text, pattern, deny, conditions, source };
}

function resolveGroups(config: AclConfig<string>): Map<string, Rule[]> {
	const resolved = new Map<string, Rule[]>();
	const visiting = new Set<string>();
	const visit = (name: string): Rule[] => {
		const done = resolved.get(name);
		if (done) return done;
		const group = config.groups[name];
		if (!group) throw new Error(`unknown group "${name}"`);
		if (visiting.has(name)) throw new Error(`group inheritance cycle at "${name}"`);
		visiting.add(name);
		const rules = group.grants.map((text) => parseRule(text, `group:${name}`));
		for (const parent of group.inherits ?? []) rules.push(...visit(parent));
		visiting.delete(name);
		resolved.set(name, rules);
		return rules;
	};
	for (const name of Object.keys(config.groups)) visit(name);
	return resolved;
}

function validateRules(config: AclConfig<string>, rules: Iterable<Rule>): void {
	const registry = config.permissions ? Object.keys(config.permissions) : undefined;
	for (const rule of rules) {
		for (const name of rule.conditions) {
			if (!config.conditions?.[name])
				throw new Error(`unknown condition "${name}" in rule "${rule.text}"`);
		}
		if (registry && !registry.some((permission) => matchPermission(rule.pattern, permission))) {
			throw new Error(`grant "${rule.text}" matches no known permission`);
		}
	}
}

/**
 * Build an ACL from groups, conditions and an optional permission registry.
 * Configuration errors (unknown groups/conditions, cycles, typos in grants)
 * throw here rather than at check time.
 *
 * @example
 * ```ts
 * const acl = createAcl({
 *   conditions: { owner: ({ subject, resource }) => (resource as Post).authorId === subject.id },
 *   groups: {
 *     user: { level: 10, grants: ["posts:create", "posts:update@owner"] },
 *     admin: { level: 100, grants: ["*"] },
 *   },
 * });
 * acl.can(user, "posts:update", post);
 * ```
 */
export function createAcl<const P extends string = string>(config: AclConfig<P>): Acl<P> {
	const cfg = config as AclConfig<string>;
	const groupRules = resolveGroups(cfg);
	for (const rules of groupRules.values()) validateRules(cfg, rules);
	const registry: Record<string, string> = { ...(cfg.permissions ?? {}) };
	const hasRegistry = cfg.permissions !== undefined;

	const conditionsPass = (rule: Rule, input: ConditionInput) =>
		rule.conditions.every((name) => cfg.conditions?.[name]?.(input) === true);

	const decide = (rules: Rule[], input: ConditionInput): Explanation | undefined => {
		const matching = rules.filter(
			(rule) => matchPermission(rule.pattern, input.permission) && conditionsPass(rule, input),
		);
		const deny = matching.find((rule) => rule.deny);
		if (deny) return { allowed: false, rule: deny.text, source: deny.source, reason: "denied" };
		const allow = matching.find((rule) => !rule.deny);
		if (allow) return { allowed: true, rule: allow.text, source: allow.source };
		return undefined;
	};

	const subjectGroupRules = (subject: Subject): Rule[] =>
		subject.groups.flatMap((name) => groupRules.get(name) ?? []);

	const directRules = (subject: Subject): Rule[] => {
		const rules = (subject.grants ?? []).map((text) => parseRule(text, "user"));
		validateRules(cfg, rules);
		return rules;
	};

	const explain = (subject: Subject, permission: string, resource?: unknown): Explanation => {
		if (hasRegistry && !(permission in registry))
			throw new Error(`unknown permission "${permission}"`);
		if (subject.blocked) return { allowed: false, reason: "blocked" };
		if (subject.scopes && !subject.scopes.some((scope) => matchPermission(scope, permission))) {
			return { allowed: false, reason: "outside token scope" };
		}
		const input: ConditionInput = { subject, permission, resource };
		return (
			decide(directRules(subject), input) ??
			decide(subjectGroupRules(subject), input) ?? { allowed: false, reason: "no matching grant" }
		);
	};

	const level = (subject: Subject): number =>
		subject.groups.reduce((max, name) => Math.max(max, cfg.groups[name]?.level ?? 0), 0);

	const permissions = (subject: Subject): EffectivePermissions<P> => {
		const rules = [...directRules(subject), ...subjectGroupRules(subject)];
		const candidates = hasRegistry
			? Object.keys(registry)
			: [...new Set(rules.map((r) => r.pattern))];
		const always: string[] = [];
		const conditional: Record<string, string[]> = {};
		for (const permission of candidates.sort()) {
			const matching = rules.filter((rule) => matchPermission(rule.pattern, permission));
			if (subject.blocked || matching.some((rule) => rule.deny && rule.conditions.length === 0))
				continue;
			if (subject.scopes && !subject.scopes.some((scope) => matchPermission(scope, permission)))
				continue;
			const allows = matching.filter((rule) => !rule.deny);
			if (allows.some((rule) => rule.conditions.length === 0)) always.push(permission);
			else if (allows.length > 0)
				conditional[permission] = [...new Set(allows.flatMap((r) => r.conditions))];
		}
		return { always: always as P[], conditional: conditional as Partial<Record<P, string[]>> };
	};

	return {
		groups: cfg.groups,
		registry,
		can: (subject, permission, resource) => explain(subject, permission, resource).allowed,
		assert(subject, permission, resource) {
			const result = explain(subject, permission, resource);
			if (!result.allowed) throw new AccessDenied(permission, subject.id, result.reason);
		},
		explain,
		permissions,
		level,
		atLeast(subject, group) {
			const target = cfg.groups[group];
			if (!target) throw new Error(`unknown group "${group}"`);
			return level(subject) >= (target.level ?? 0);
		},
		canManage: (actor, target) => !actor.blocked && level(actor) > level(target),
		with: (changes) => createAcl<P>({ ...config, ...changes }),
	};
}
