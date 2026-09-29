import { syncValidate } from "./helpers.ts";
import type { StandardSchemaV1 } from "./standard-schema.ts";

/** Thrown by {@link parse}; `message` joins every issue as `path: message`. */
export class SchemaError extends Error {
	/** Every validation issue, with paths. */
	readonly issues: readonly StandardSchemaV1.Issue[];

	constructor(issues: readonly StandardSchemaV1.Issue[]) {
		super(formatIssues(issues));
		this.name = "SchemaError";
		this.issues = issues;
	}
}

/** Human-readable `path: message; …` summary of issues. */
export function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
	return issues
		.map((issue) => {
			const path = (issue.path ?? [])
				.map((segment) => (typeof segment === "object" ? String(segment.key) : String(segment)))
				.join(".");
			return path ? `${path}: ${issue.message}` : issue.message;
		})
		.join("; ");
}

/** Validate without throwing; returns `{ value }` or `{ issues }`. */
export function safeParse<I, O>(
	schema: StandardSchemaV1<I, O>,
	value: unknown,
): StandardSchemaV1.Result<O> {
	return syncValidate(schema, value);
}

/** Validate and return the output, or throw {@link SchemaError}. */
export function parse<I, O>(schema: StandardSchemaV1<I, O>, value: unknown): O {
	const result = safeParse(schema, value);
	if (result.issues) throw new SchemaError(result.issues);
	return result.value;
}
