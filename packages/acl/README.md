# @arachnejs/acl

Access control for Arachne: permissions, groups (roles) with inheritance and
levels, conditional grants for ownership-style rules, denials, and token
scopes. Storage-agnostic; [`@arachnejs/auth`](../auth) keeps groups in the
database and builds subjects from users and API tokens. See
[ADR 0015](../../docs/adr/0015-universal-framework.md#access-control-model).

```ts
import { createAcl } from "@arachnejs/acl";

export const acl = createAcl({
  // Optional registry: typos in grants and checks become errors, and
  // `acl.can(user, "posts:updte")` fails to compile.
  permissions: {
    "posts:read": "Read published posts",
    "posts:create": "Write posts",
    "posts:update": "Edit posts",
    "users:block": "Block users",
  },
  conditions: {
    owner: ({ subject, resource }) => (resource as Post).authorId === subject.id,
    published: ({ resource }) => (resource as Post).published,
  },
  groups: {
    guest: { level: 0, grants: ["posts:read@published"] },
    user: { level: 10, inherits: ["guest"], grants: ["posts:create", "posts:update@owner"] },
    moderator: { level: 50, inherits: ["user"], grants: ["posts:*", "users:block"] },
    admin: { level: 100, grants: ["*"] },
  },
});

acl.can(user, "posts:update", post);    // true for the author (owner condition)
acl.assert(user, "users:block");        // throws AccessDenied
acl.explain(user, "posts:update", post) // { allowed, rule: "posts:update@owner", source: "group:user" }
acl.permissions(user)                   // { always: [...], conditional: { "posts:update": ["owner"] } }
acl.atLeast(user, "moderator");         // level check
acl.canManage(moderator, user);         // strictly higher level
const next = acl.with({ groups: groupsFromDb }); // immutable update
```

## Rules

| Rule | Meaning |
|---|---|
| `posts:create` | one permission |
| `posts:*` / `*:read` / `*` | wildcards per `:` segment; a trailing `*` also covers deeper segments |
| `!users:delete` | denial |
| `posts:update@owner` | granted only when condition `owner` passes (`@a,b` = all must pass) |

Rules are strings, so they can be stored and edited in the database; the
conditions they reference are code.

## Decision order

1. `blocked` subjects are denied everything.
2. With `scopes` (API tokens), the permission must also match a scope — scopes
   only narrow, never widen.
3. **Direct rules** on the subject (`grants`) decide first: a matching denial
   denies, a matching grant allows.
4. **Group rules** (with inheritance) decide next: denial beats grant.
5. Otherwise denied.

A rule "matches" only when its conditions pass for the given resource.

## Subjects

```ts
interface Subject {
  id: string;
  groups: string[];
  grants?: string[];      // per-user overrides
  scopes?: string[];      // API token scopes
  blocked?: boolean;
  attributes?: Record<string, unknown>; // for conditions (tenant, department, …)
}
```

## MCP

`arachne_acl_check` (decision + deciding rule, with assumed condition results),
`arachne_acl_permissions`, `arachne_acl_api_summary`.
