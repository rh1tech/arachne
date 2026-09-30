import { HttpError } from "@arachne/server";

/** Machine-readable auth error codes (also the `error.code` in HTTP responses). */
export type AuthErrorCode =
	| "invalid_credentials"
	| "account_locked"
	| "account_blocked"
	| "email_not_verified"
	| "invalid_token"
	| "invalid_code"
	| "invalid_email"
	| "weak_password"
	| "registration_closed"
	| "unknown_group"
	| "invalid_grants"
	| "unauthorized"
	| "forbidden"
	| "not_found"
	| "csrf_failed"
	| "mfa_not_setup";

const STATUS: Record<AuthErrorCode, number> = {
	invalid_credentials: 401,
	account_locked: 429,
	account_blocked: 403,
	email_not_verified: 403,
	invalid_token: 400,
	invalid_code: 401,
	invalid_email: 422,
	weak_password: 422,
	registration_closed: 403,
	unknown_group: 422,
	invalid_grants: 422,
	unauthorized: 401,
	forbidden: 403,
	not_found: 404,
	csrf_failed: 403,
	mfa_not_setup: 409,
};

/**
 * An auth failure. It extends `HttpError`, so thrown from a route it becomes
 * the matching status and `{ error: { code, message, details } }` body.
 */
export class AuthError extends HttpError {
	/** Typed error code. */
	declare readonly code: AuthErrorCode;

	constructor(
		code: AuthErrorCode,
		message: string,
		options: { details?: unknown; headers?: HeadersInit } = {},
	) {
		super(STATUS[code], message, { code, ...options });
		this.name = "AuthError";
	}
}
