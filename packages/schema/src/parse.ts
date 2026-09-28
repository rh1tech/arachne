import { syncValidate } from "./helpers.ts";
import type { StandardSchemaV1 } from "./standard-schema.ts";

export class SchemaError extends Error {
	readonly issues: readonly StandardSchemaV1.Issue[];

	constructor(issues: readonly StandardSchemaV1.Issue[]) {
		super(formatIssues(issues));
		this.name = "SchemaError";
		this.issues = issues;
	}
}

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

export function safeParse<I, O>(
	schema: StandardSchemaV1<I, O>,
	value: unknown,
): StandardSchemaV1.Result<O> {
	return syncValidate(schema, value);
}

export function parse<I, O>(schema: StandardSchemaV1<I, O>, value: unknown): O {
	const result = safeParse(schema, value);
	if (result.issues) throw new SchemaError(result.issues);
	return result.value;
}
