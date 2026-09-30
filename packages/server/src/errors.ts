import type { StandardSchemaV1 } from "@arachnejs/schema";

/** Part of the request a validation issue refers to. */
export type IssueLocation = "params" | "query" | "headers" | "body" | "response";

/** One validation problem, flattened for API clients. */
export interface ValidationIssue {
	/** Which part of the request failed. */
	location: IssueLocation;
	/** Dot path inside that part (`items.0.qty`); empty for the whole value. */
	path: string;
	/** Human-readable message from the schema. */
	message: string;
}

/**
 * JSON error envelope every error response uses:
 * `{ error: { status, code, message, details?, issues? } }`.
 */
export interface ErrorBody {
	/** The error payload. */
	error: {
		/** HTTP status code (repeated for clients that lose it). */
		status: number;
		/** Stable machine-readable code, e.g. `validation_failed`, `not_found`. */
		code: string;
		/** Human-readable message, safe to show to users. */
		message: string;
		/** Extra structured information. */
		details?: unknown;
		/** Validation issues (only for `validation_failed`). */
		issues?: ValidationIssue[];
	};
}

/** Options for {@link HttpError}. */
export interface HttpErrorOptions {
	/** Machine-readable code; defaults to one derived from the status. */
	code?: string;
	/** Extra structured information sent to the client. */
	details?: unknown;
	/** Validation issues (used by `validation_failed`). */
	issues?: ValidationIssue[];
	/** Extra response headers (e.g. `retry-after`, `www-authenticate`). */
	headers?: HeadersInit;
	/** Underlying error, kept for logs and never sent to the client. */
	cause?: unknown;
}

const DEFAULT_CODES: Record<number, string> = {
	400: "bad_request",
	401: "unauthorized",
	403: "forbidden",
	404: "not_found",
	405: "method_not_allowed",
	409: "conflict",
	413: "payload_too_large",
	415: "unsupported_media_type",
	422: "validation_failed",
	429: "too_many_requests",
	500: "internal_error",
};

/**
 * Throw from handlers or middleware to answer with an error status. The
 * message is sent to clients, so keep secrets out of it.
 *
 * @example
 * ```ts
 * throw new HttpError(404, "Order not found");
 * throw new HttpError(409, "Email already registered", { code: "email_taken" });
 * ```
 */
export class HttpError extends Error {
	/** HTTP status code. */
	readonly status: number;
	/** Machine-readable code. */
	readonly code: string;
	/** Extra structured information for the client. */
	readonly details: unknown;
	/** Validation issues, if any. */
	readonly issues: ValidationIssue[] | undefined;
	/** Extra response headers. */
	readonly headers: HeadersInit | undefined;

	constructor(status: number, message: string, options: HttpErrorOptions = {}) {
		super(message, options.cause === undefined ? undefined : { cause: options.cause });
		this.name = "HttpError";
		this.status = status;
		this.code =
			options.code ?? DEFAULT_CODES[status] ?? (status >= 500 ? "internal_error" : "error");
		this.details = options.details;
		this.issues = options.issues;
		this.headers = options.headers;
	}
}

/** Flatten Standard Schema issues into {@link ValidationIssue}s at `location`. */
export function toValidationIssues(
	location: IssueLocation,
	issues: readonly StandardSchemaV1.Issue[],
): ValidationIssue[] {
	return issues.map((issue) => ({
		location,
		path: (issue.path ?? [])
			.map((segment) => String(typeof segment === "object" ? segment.key : segment))
			.join("."),
		message: issue.message,
	}));
}

/** The `422 validation_failed` error for a set of issues. */
export function validationError(issues: ValidationIssue[]): HttpError {
	return new HttpError(422, "Request validation failed", { code: "validation_failed", issues });
}

/** Build the {@link ErrorBody} for an {@link HttpError}. */
export function errorBody(error: HttpError): ErrorBody {
	const body: ErrorBody["error"] = {
		status: error.status,
		code: error.code,
		message: error.message,
	};
	if (error.details !== undefined) body.details = error.details;
	if (error.issues !== undefined) body.issues = error.issues;
	return { error: body };
}

/**
 * Normalise anything thrown into an {@link HttpError}. Non-HTTP errors become
 * a generic 500 so internal messages never reach clients.
 */
export function toHttpError(error: unknown): HttpError {
	if (error instanceof HttpError) return error;
	return new HttpError(500, "Internal Server Error", { cause: error });
}
