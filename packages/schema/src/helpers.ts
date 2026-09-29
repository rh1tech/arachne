import type { StandardSchemaV1 } from "./standard-schema.ts";

/**
 * JSON Schema (2020-12) fragment. Kept as a loose record so every keyword is
 * allowed; {@link toJSONSchema} builds these from schema metadata.
 */
export type JsonSchema = { [keyword: string]: unknown };

/** Descriptive metadata copied into generated JSON Schema / OpenAPI. */
export interface SchemaDescription {
	/** Short name shown by API explorers. */
	title?: string | undefined;
	/** Longer human description. */
	description?: string | undefined;
	/** Example value shown by API explorers. */
	example?: unknown;
	/** Marks the value as deprecated in generated docs. */
	deprecated?: boolean | undefined;
}

/**
 * Tooling metadata attached to every Arachne schema under `~meta`. Foreign
 * Standard Schemas (zod, valibot) have none and are treated as open values.
 */
export interface SchemaMeta {
	/** Returns the JSON Schema that describes the accepted input. */
	json?: (() => JsonSchema) | undefined;
	/**
	 * True when `undefined` is accepted (optional or defaulted). Objects leave
	 * such keys out of `required`.
	 */
	optional?: boolean | undefined;
}

/**
 * An Arachne schema: a Standard Schema V1 value with phantom `_input` /
 * `_output` types and optional tooling metadata.
 *
 * @typeParam I - accepted input type
 * @typeParam O - parsed output type
 */
export type Schema<I, O = I> = StandardSchemaV1<I, O> & {
	/** Phantom input type; `undefined` at runtime. */
	readonly _input: I;
	/** Phantom output type; `undefined` at runtime. */
	readonly _output: O;
	/** Tooling metadata (JSON Schema, optionality). */
	readonly "~meta"?: SchemaMeta | undefined;
};

/** Any Arachne schema regardless of its types. */
export type AnySchema = Schema<unknown, unknown>;

/** Build a success result. */
export function ok<T>(value: T): StandardSchemaV1.SuccessResult<T> {
	return { value };
}

/** Build a failure result with a single issue at `path`. */
export function fail(message: string, path: PropertyKey[] = []): StandardSchemaV1.FailureResult {
	return {
		issues: [
			{
				message,
				path: path.map((key) => ({ key })),
			},
		],
	};
}

/**
 * Create a schema from a synchronous validate function.
 *
 * @param validate - returns `ok(value)` or `fail(message)`
 * @param meta - JSON Schema and optionality metadata for tooling
 */
export function makeSchema<I, O>(
	validate: (value: unknown) => StandardSchemaV1.Result<O>,
	meta?: SchemaMeta,
): Schema<I, O> {
	return {
		_input: undefined as I,
		_output: undefined as O,
		...(meta ? { "~meta": meta } : {}),
		"~standard": {
			version: 1,
			vendor: "arachne",
			validate,
			types: undefined as unknown as StandardSchemaV1.Types<I, O>,
		},
	};
}

/**
 * Run a Standard Schema synchronously. Async validators produce a failure
 * because Arachne validation paths (forms, DB rows) are synchronous.
 */
export function syncValidate<O>(
	schema: StandardSchemaV1<unknown, O>,
	value: unknown,
): StandardSchemaV1.Result<O> {
	const result = schema["~standard"].validate(value);
	if (result instanceof Promise) {
		return fail("async validators are not supported");
	}
	return result;
}

/** Metadata of `schema`, or `undefined` for foreign Standard Schemas. */
export function metaOf(schema: StandardSchemaV1): SchemaMeta | undefined {
	return (schema as { "~meta"?: SchemaMeta })["~meta"];
}
