import type { Condition, GroupDef } from "@arachne/acl";
import type { DbQueries } from "@arachne/db";

/** A user as the application sees it (never includes secrets). */
export interface AuthUser {
	/** User id (UUID). */
	id: string;
	/** Lower-cased email address. */
	email: string;
	/** Display name. */
	name: string | null;
	/** Whether the email address is confirmed. */
	emailVerified: boolean;
	/** When the email address was confirmed. */
	emailVerifiedAt: Date | null;
	/** `blocked` while a block is in force (expired blocks read as `active`). */
	status: "active" | "blocked";
	/** Why the user is blocked. */
	blockedReason: string | null;
	/** When a temporary block ends (`null` = indefinitely). */
	blockedUntil: Date | null;
	/** Group names. */
	groups: string[];
	/** Direct ACL rules. */
	grants: string[];
	/** Two-factor authentication is on. */
	mfaEnabled: boolean;
	/** Registration time. */
	createdAt: Date;
	/** Last successful login. */
	lastLoginAt: Date | null;
}

/** Connection details recorded with sessions and events. */
export interface RequestMeta {
	/** Client IP. */
	ip?: string | undefined;
	/** `User-Agent` header. */
	userAgent?: string | undefined;
}

/** A session as listed to its owner (the token itself is never stored). */
export interface SessionInfo {
	/** Session id (for listing and revoking). */
	id: string;
	/** Created at. */
	createdAt: Date;
	/** Expires at (slides forward on use). */
	expiresAt: Date;
	/** Last request. */
	lastSeenAt: Date;
	/** IP at login. */
	ip: string | null;
	/** User agent at login. */
	userAgent: string | null;
}

/** An API token as listed to its owner. */
export interface ApiTokenInfo {
	/** Token id. */
	id: string;
	/** Label. */
	name: string;
	/** First characters of the token, to recognise it. */
	prefix: string;
	/** Scopes (`null` = the owner's full permissions). */
	scopes: string[] | null;
	/** Created at. */
	createdAt: Date;
	/** Last use. */
	lastUsedAt: Date | null;
	/** Expiry (`null` = never). */
	expiresAt: Date | null;
}

/** An audit event. */
export interface AuthEvent {
	/** Event type (`login.succeeded`, `user.blocked`, …). */
	type: string;
	/** Affected user. */
	userId: string | null;
	/** Client IP. */
	ip: string | null;
	/** Client user agent. */
	userAgent: string | null;
	/** When it happened. */
	at: Date;
	/** Extra data (actor, reason, …). */
	data: Record<string, unknown> | null;
}

/** A message auth asks to send. `@arachne/mailer`'s `Mailer` satisfies {@link MailSender}. */
export interface AuthMail {
	/** Recipient address. */
	to: string;
	/** Subject line. */
	subject: string;
	/** HTML body. */
	html: string;
	/** Plain-text body. */
	text: string;
}

/** Anything that can send mail (structural; no dependency on `@arachne/mailer`). */
export interface MailSender {
	/** Deliver a message. */
	send: (message: AuthMail) => Promise<unknown>;
}

/** Data passed to every mail template. */
export interface MailContext {
	/** Application name. */
	appName: string;
	/** Recipient's display name, if known. */
	name: string | null;
	/** Action link (verification, reset, confirmation), if any. */
	url?: string;
	/** The other address in email-change mails. */
	email?: string;
}

/** Mails auth sends. */
export type AuthMailKind =
	| "verifyEmail"
	| "resetPassword"
	| "passwordChanged"
	| "emailChangeRequested"
	| "confirmEmailChange"
	| "signupAttempt";

/** A template renders subject and bodies for one {@link AuthMailKind}. */
export type AuthMailTemplate = (ctx: MailContext) => {
	subject: string;
	html: string;
	text: string;
};

/** Options for `createAuth`. */
export interface AuthOptions {
	/** Database (a client or transaction scope). */
	db: DbQueries;
	/** Sends verification/reset/notice mails. Without it, those flows throw. */
	mailer?: MailSender | undefined;
	/** Public origin used in links and CSRF checks, e.g. `https://app.example`. */
	baseUrl: string;
	/** Extra origins allowed to send cookie-authenticated requests (e.g. an admin app). */
	trustedOrigins?: readonly string[];
	/** Name used in mails and the TOTP issuer. Default `Arachne`. */
	appName?: string;
	/**
	 * Server secret (≥ 32 chars) for CSRF tokens and encrypting TOTP secrets.
	 * Read it from the environment; without it CSRF tokens change on restart
	 * and TOTP secrets are stored unencrypted.
	 */
	secret?: string | undefined;
	/** Front-end paths for mail links. */
	links?: { verifyEmail?: string; resetPassword?: string; confirmEmail?: string };
	/** Access control: extra permissions, conditions, and groups (merged over the defaults). */
	acl?: {
		permissions?: Record<string, string>;
		conditions?: Record<string, Condition>;
		groups?: Record<string, GroupDef>;
	};
	/** Groups given to new users. Default `["user"]`. */
	defaultGroups?: readonly string[];
	/** `open` (default) or `closed` sign-ups. */
	registration?: "open" | "closed";
	/** Refuse logins until the email is confirmed. Default `false`. */
	requireEmailVerification?: boolean;
	/** Password rules: minimum length (default 12) and an extra check returning an error message. */
	password?: {
		minLength?: number;
		check?: (password: string, email: string) => string | undefined | Promise<string | undefined>;
	};
	/** Session lifetime and cookie. */
	session?: {
		ttlDays?: number;
		cookieName?: string;
		secure?: boolean;
		sameSite?: "lax" | "strict";
	};
	/** Lock an account for `minutes` after `maxAttempts` failed logins. Default 5 / 15. */
	lockout?: { maxAttempts?: number; minutes?: number };
	/** Per-IP rate limit for sign-in/up/reset routes (`false` to disable). Default 20 per minute. */
	rateLimit?: false | { windowMs: number; max: number };
	/** Override mail templates. */
	templates?: Partial<Record<AuthMailKind, AuthMailTemplate>>;
	/** Table name prefix. */
	tablePrefix?: string;
	/** Clock (tests). */
	now?: () => Date;
	/** Observe audit events (they are also stored in the events table). */
	onEvent?: (event: AuthEvent) => void;
}
