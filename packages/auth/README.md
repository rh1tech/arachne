# @arachnejs/auth

Accounts for Arachne apps: registration, email verification, login, password
reset and change, email change, sessions, API tokens, TOTP two-factor,
lockout, user blocking, groups and permissions (via
[`@arachnejs/acl`](../acl)), an audit log, and ready-made HTTP routes with
CSRF protection. See [ADR 0015](../../docs/adr/0015-universal-framework.md).

```ts
import { createAuth } from "@arachnejs/auth";
import { createDb } from "@arachnejs/db";
import { sqlite } from "@arachnejs/db-sqlite";
import { createMailer, smtpTransport } from "@arachnejs/mailer";
import { createServer, route } from "@arachnejs/server";

const db = createDb({ dialect: sqlite({ path: "app.db" }), tables: {} });
const auth = createAuth({
  db,
  mailer: createMailer({ transport: smtpTransport({ /* … */ }), from: "Shop <no-reply@shop.example>" }),
  baseUrl: "https://shop.example",   // links in mails + CSRF origin
  secret: process.env.AUTH_SECRET,  // ≥ 32 chars: CSRF tokens, encrypted TOTP secrets
  appName: "Shop",
  acl: {
    permissions: { "orders:read": "See orders", "orders:refund": "Refund orders" },
    conditions: { owner: ({ subject, resource }) => (resource as Order).userId === subject.id },
    groups: {
      user: { level: 10, inherits: ["guest"], grants: ["orders:read@owner"] },
      support: { level: 40, inherits: ["user"], grants: ["orders:*", "users:read"] },
    },
  },
});
await auth.setup(); // creates tables if missing, seeds groups

createServer({
  middleware: [auth.middleware()],
  routes: [
    ...auth.routes(), // /auth/*
    route({
      method: "POST",
      path: "/orders/:id/refund",
      meta: { permission: "orders:refund" },            // 401 / 403 before the handler
      handler: async (ctx) => refund(ctx.params.id, ctx.state.user),
    }),
    route({
      method: "GET",
      path: "/orders/:id",
      meta: { auth: true },
      handler: async (ctx) => {
        const order = await orders.find(ctx.params.id);
        auth.authorize(ctx, "orders:read", order);       // ownership via the condition
        return order;
      },
    }),
  ],
}).listen(3000);
```

## Model

- **Users** (`users` table): email (unique, lower-cased), optional name,
  argon2id password hash (`Bun.password`), verification time, status
  (`active`/`blocked` with reason and optional end date), direct grants,
  two-factor state, timestamps.
- **Groups** (`groups` table) and memberships (`user_groups`) feed the ACL.
  Defaults: `guest` (0), `user` (10), `moderator` (50: `users:read`,
  `users:block`, `admin:access`), `admin` (100: `*`). Options override groups
  on first setup; afterwards the database is the source of truth
  (`auth.admin.saveGroup`).
- **Permissions** used by auth itself: `users:read`, `users:block`,
  `users:manage`, `users:delete`, `groups:manage`, `admin:access`.
- **Levels**: managing another user (block, groups, grants, delete) needs the
  permission **and** a strictly higher level; you can't grant groups at or
  above your own level.
- **No escalation**: actors can only hand out permissions they hold (via
  grants, group assignment or group edits). Denials are always allowed.

## Flows

| Method | Behaviour |
|---|---|
| `register({ email, password, name })` | Creates the user in `defaultGroups`, mails a 24 h verification link. Existing emails get the same response and a notice mail instead (no account discovery). `registration: "closed"` refuses. |
| `verifyEmail(token)` | Single-use; marks the email verified. |
| `login({ email, password }, meta)` | Generic `invalid_credentials` for unknown users and wrong passwords (with equal timing). After `lockout.maxAttempts` failures (5) the account locks for `lockout.minutes` (15) → `account_locked` + `Retry-After`. Blocked → `account_blocked` with reason/until. `requireEmailVerification` → `email_not_verified`. Two-factor users get `{ status: "mfa_required", mfaToken }`. |
| `verifyMfa({ mfaToken, code })` | TOTP (±1 step, each step usable once) or a recovery code; 5 minutes, 5 attempts. |
| `requestPasswordReset(email)` / `resetPassword(token, password)` | 1 h single-use link; reset signs out every session and verifies the email. |
| `changePassword(userId, current, next, { keepSessionId })` | Signs out other sessions, sends a notice. |
| `requestEmailChange(userId, email, password)` / `confirmEmailChange(token)` | Link to the new address, notice to the old one; re-checks availability. |

Passwords: at least `password.minLength` (12) characters, at most 256, not
the email; add `password.check` for breach lists or custom rules.

## Sessions, tokens, two-factor

- Sessions are random 256-bit tokens; only their SHA-256 is stored. Cookie
  `__Host-arachne_session` (`HttpOnly; Secure; SameSite=Lax; Path=/`), 30-day
  lifetime that slides when less than half remains. Blocking or resetting a
  password ends all sessions. `auth.sessions.list/revoke/revokeAll`.
- API tokens: `ara_…` bearer tokens (hash stored), optional scopes (narrow
  only) and expiry. `auth.apiTokens.create/list/revoke`.
- TOTP: `auth.mfa.setup(userId)` → `{ secret, uri }` (QR code), `enable(userId, code)`
  → ten recovery codes, `disable(userId, password)`. Secrets are AES-GCM
  encrypted when `secret` is set.

## HTTP

`auth.middleware()` authenticates `Authorization: Bearer ara_…` or the
session cookie and sets `ctx.state.user`, `session`, `apiToken`, `subject`
(scopes applied), `csrfToken`, `authMethod`. It then enforces route meta:
`{ auth: true | "verified" }`, `{ permission }`, `{ level }`.

**CSRF**: cookie-authenticated `POST/PUT/PATCH/DELETE` must come from
`baseUrl` or `trustedOrigins`, judged by `Origin` / `Sec-Fetch-Site`. Unsafe
requests with a foreign `Origin` are refused even without a session (login CSRF).
Clients that send neither must send `X-CSRF-Token` (from `GET /auth/me`).
Bearer requests are exempt.

`auth.routes({ prefix: "/auth", admin: true })`:

| Route | Description |
|---|---|
| `POST /register` · `/verify-email` · `/verify-email/resend` | sign-up |
| `POST /login` · `/mfa/verify` · `/logout` · `GET /me` | sign-in (`/me` returns user, CSRF token, permissions) |
| `POST /password/forgot` · `/password/reset` · `/password/change` | passwords |
| `POST /email/change` · `/email/confirm` | email change |
| `GET /sessions` · `DELETE /sessions/:id` | my sessions |
| `GET/POST /tokens` · `DELETE /tokens/:id` | my API tokens |
| `POST /mfa/totp/setup` · `/enable` · `/disable` | two-factor |
| `GET /admin/users` · `GET /admin/users/:id` | `users:read` (search, status, group, paging) |
| `POST /admin/users/:id/block` · `/unblock` | `users:block` |
| `PUT /admin/users/:id/groups` · `/grants` | `users:manage` |
| `DELETE /admin/users/:id` | `users:delete` |
| `GET /admin/groups` · `PUT /admin/groups/:name` | `users:read` / `groups:manage` |
| `GET /admin/events` | audit log |

Note that lockout lets anyone who knows an email lock that account for
`lockout.minutes`; the per-IP rate limit below bounds how often. Sign-in,
sign-up and reset routes are rate limited per IP (`rateLimit`,
default 20/min). All routes are schema-validated and appear in OpenAPI.

## Mail

Pass any `{ send({ to, subject, html, text }) }` as `mailer`
(`@arachnejs/mailer` fits). Override templates with
`templates: { verifyEmail, resetPassword, passwordChanged, emailChangeRequested, confirmEmailChange, signupAttempt }`;
link paths with `links: { verifyEmail, resetPassword, confirmEmail }` (tokens go in `?token=`).

## Audit log

Events (`user.registered`, `email.verified`, `login.succeeded`,
`login.failed`, `login.locked`, `login.blocked`, `logout`,
`password.reset_requested`, `password.reset`, `password.changed`,
`email.change_requested`, `email.changed`, `mfa.enabled`, `mfa.disabled`,
`mfa.failed`, `mfa.recovery_code_used`, `token.created`, `token.revoked`,
`user.blocked`, `user.unblocked`, `user.groups_changed`,
`user.grants_changed`, `user.deleted`, `group.saved`, `group.deleted`) are
stored in `auth_events` and passed to `onEvent`.

## Tables and migrations

`auth.tables` (or `authTables(prefix)`) holds the definitions; use them with
`@arachnejs/migrate` (`createTable(auth.tables.users)`, …) instead of
`auth.setup()`'s create-if-missing when you manage schema changes yourself.

## MCP

`arachne_auth_routes`, `arachne_auth_policy`, `arachne_auth_password_check`,
`arachne_auth_api_summary`.
