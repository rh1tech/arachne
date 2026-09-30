import { describe, expect, test } from "bun:test";
import { AccessDenied, createAcl, matchPermission, type Subject } from "./index.ts";

interface Post {
	authorId: string;
	published: boolean;
}

const acl = createAcl({
	permissions: {
		"posts:read": "Read published posts",
		"posts:create": "Write posts",
		"posts:update": "Edit posts",
		"posts:delete": "Delete posts",
		"users:block": "Block users",
		"users:delete": "Delete users",
		"admin:access": "Open the admin area",
	},
	conditions: {
		owner: ({ subject, resource }) => (resource as Post | undefined)?.authorId === subject.id,
		published: ({ resource }) => (resource as Post | undefined)?.published === true,
	},
	groups: {
		guest: { level: 0, grants: ["posts:read@published"] },
		user: {
			level: 10,
			inherits: ["guest"],
			grants: ["posts:create", "posts:update@owner", "posts:delete@owner"],
		},
		moderator: {
			level: 50,
			inherits: ["user"],
			grants: ["posts:*", "users:block", "admin:access"],
		},
		admin: { level: 100, grants: ["*"] },
	},
});

const ada: Subject = { id: "ada", groups: ["user"] };
const mod: Subject = { id: "mo", groups: ["moderator"] };
const root: Subject = { id: "root", groups: ["admin"] };
const guest: Subject = { id: "anon", groups: ["guest"] };
const own: Post = { authorId: "ada", published: false };
const others: Post = { authorId: "bob", published: true };
const draft: Post = { authorId: "bob", published: false };

describe("permissions and inheritance", () => {
	test("groups grant permissions and inherit from each other", () => {
		expect(acl.can(ada, "posts:create")).toBe(true);
		expect(acl.can(ada, "posts:read", others)).toBe(true); // inherited from guest
		expect(acl.can(ada, "users:block")).toBe(false);
		expect(acl.can(mod, "posts:delete", others)).toBe(true); // posts:* wildcard
		expect(acl.can(root, "users:delete")).toBe(true); // *
	});

	test("conditions scope grants to resources", () => {
		expect(acl.can(ada, "posts:update", own)).toBe(true);
		expect(acl.can(ada, "posts:update", others)).toBe(false);
		expect(acl.can(ada, "posts:update")).toBe(false); // no resource, owner condition fails
		expect(acl.can(guest, "posts:read", others)).toBe(true);
		expect(acl.can(guest, "posts:read", draft)).toBe(false);
	});

	test("denials beat grants; direct user rules beat group rules", () => {
		const muted: Subject = { id: "ada", groups: ["user"], grants: ["!posts:create"] };
		expect(acl.can(muted, "posts:create")).toBe(false);
		const trusted: Subject = { id: "ada", groups: ["user"], grants: ["users:block"] };
		expect(acl.can(trusted, "users:block")).toBe(true);
		const mixed = createAcl({
			groups: { a: { grants: ["x:*"] }, b: { grants: ["!x:delete"] } },
		});
		expect(mixed.can({ id: "1", groups: ["a", "b"] }, "x:delete")).toBe(false);
		expect(mixed.can({ id: "1", groups: ["a", "b"] }, "x:read")).toBe(true);
		expect(mixed.can({ id: "1", groups: ["a", "b"], grants: ["x:delete"] }, "x:delete")).toBe(true);
	});

	test("token scopes narrow what a subject can do", () => {
		const token: Subject = { ...mod, scopes: ["posts:read", "posts:update"] };
		expect(acl.can(token, "posts:update", others)).toBe(true);
		expect(acl.can(token, "users:block")).toBe(false);
		const readOnly: Subject = { ...ada, scopes: ["*:read"] };
		expect(acl.can(readOnly, "posts:create")).toBe(false);
	});

	test("blocked subjects can do nothing", () => {
		expect(acl.can({ ...root, blocked: true }, "posts:read", others)).toBe(false);
	});

	test("unknown groups, permissions and conditions are errors", () => {
		expect(() => acl.can(ada, "posts:publish" as never)).toThrow(
			'unknown permission "posts:publish"',
		);
		expect(() => createAcl({ groups: { a: { grants: ["x@nope"] } } })).toThrow(
			'unknown condition "nope"',
		);
		expect(() => createAcl({ groups: { a: { inherits: ["ghost"], grants: [] } } })).toThrow(
			'unknown group "ghost"',
		);
		expect(() =>
			createAcl({
				groups: { a: { inherits: ["b"], grants: [] }, b: { inherits: ["a"], grants: [] } },
			}),
		).toThrow("cycle");
		expect(() =>
			createAcl({ permissions: { "a:b": "" }, groups: { g: { grants: ["c:d"] } } }),
		).toThrow('grant "c:d" matches no known permission');
		expect(acl.can({ id: "x", groups: ["ghost"] }, "posts:create")).toBe(false);
	});
});

describe("assert, explain and permissions()", () => {
	test("assert throws AccessDenied with the permission", () => {
		expect(() => acl.assert(ada, "users:block")).toThrow(AccessDenied);
		try {
			acl.assert(ada, "users:block");
		} catch (error) {
			expect((error as AccessDenied).permission).toBe("users:block");
		}
	});

	test("explain names the deciding rule", () => {
		expect(acl.explain(ada, "posts:update", own)).toEqual({
			allowed: true,
			rule: "posts:update@owner",
			source: "group:user",
		});
		expect(acl.explain(ada, "users:block")).toEqual({
			allowed: false,
			reason: "no matching grant",
		});
		expect(acl.explain({ ...ada, grants: ["!posts:create"] }, "posts:create")).toEqual({
			allowed: false,
			rule: "!posts:create",
			source: "user",
			reason: "denied",
		});
	});

	test("permissions() lists what a subject may do (unconditional and conditional)", () => {
		expect(acl.permissions(ada)).toEqual({
			always: ["posts:create"],
			conditional: {
				"posts:delete": ["owner"],
				"posts:read": ["published"],
				"posts:update": ["owner"],
			},
		});
		expect(acl.permissions(root).always).toHaveLength(7);
	});
});

describe("levels", () => {
	test("level is the highest group level; atLeast compares with a group", () => {
		expect(acl.level(ada)).toBe(10);
		expect(acl.level(mod)).toBe(50);
		expect(acl.level({ id: "x", groups: [] })).toBe(0);
		expect(acl.atLeast(mod, "moderator")).toBe(true);
		expect(acl.atLeast(ada, "moderator")).toBe(false);
	});

	test("canManage requires a strictly higher level", () => {
		expect(acl.canManage(mod, ada)).toBe(true);
		expect(acl.canManage(mod, { id: "m2", groups: ["moderator"] })).toBe(false);
		expect(acl.canManage(ada, mod)).toBe(false);
		expect(acl.canManage(root, mod)).toBe(true);
	});
});

describe("runtime changes", () => {
	test("with() returns a new ACL with replaced groups", () => {
		const next = acl.with({
			groups: { ...acl.groups, user: { level: 10, grants: ["posts:read"] } },
		});
		expect(next.can(ada, "posts:create")).toBe(false);
		expect(acl.can(ada, "posts:create")).toBe(true);
	});
});

describe("matchPermission", () => {
	test("wildcards match whole segments", () => {
		expect(matchPermission("*", "a:b")).toBe(true);
		expect(matchPermission("a:*", "a:b")).toBe(true);
		expect(matchPermission("*:b", "a:b")).toBe(true);
		expect(matchPermission("a:*", "ab:c")).toBe(false);
		expect(matchPermission("a:b", "a:bc")).toBe(false);
		expect(matchPermission("a:*", "a:b:c")).toBe(true);
	});
});
