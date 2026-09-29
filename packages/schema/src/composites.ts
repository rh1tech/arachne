import {
	type AnySchema,
	fail,
	type JsonSchema,
	makeSchema,
	metaOf,
	ok,
	type Schema,
	type SchemaDescription,
	syncValidate,
} from "./helpers.ts";
import type { StandardSchemaV1 } from "./standard-schema.ts";

/** Field map of an object schema. */
export type Shape = Record<string, AnySchema>;

/** Flattens intersections so editor hovers show plain object types. */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

type OptionalKeys<T extends Shape, Side extends "_input" | "_output"> = {
	[K in keyof T]: undefined extends T[K][Side] ? K : never;
}[keyof T];

/** Object type where keys that accept `undefined` become optional (`?:`). */
export type ObjectType<T extends Shape, Side extends "_input" | "_output"> = Simplify<
	{ [K in Exclude<keyof T, OptionalKeys<T, Side>>]: T[K][Side] } & {
		[K in OptionalKeys<T, Side>]?: T[K][Side];
	}
>;

/** What an object does with keys not in its shape. */
export type UnknownKeys = "strip" | "reject" | "passthrough";

/** Options for {@link object}. */
export interface ObjectOptions {
	/** `strip` (default) drops them, `reject` fails, `passthrough` keeps them. */
	unknownKeys?: UnknownKeys;
}

/** Object schema that exposes its shape for `pick`/`omit`/`partial`/`extend`. */
export type ObjectSchema<T extends Shape> = Schema<
	ObjectType<T, "_input">,
	ObjectType<T, "_output">
> & {
	/** Field schemas, in declaration order. */
	readonly shape: T;
	/** Options the object was created with. */
	readonly options: ObjectOptions;
};

function prefixIssues(
	issues: readonly StandardSchemaV1.Issue[],
	key: PropertyKey,
): StandardSchemaV1.Issue[] {
	return issues.map((issue) => ({
		message: issue.message,
		path: [{ key }, ...(issue.path ?? [])],
	}));
}

function validateObject(shape: Shape, options: ObjectOptions, value: unknown) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return fail("expected object");
	}
	const input = value as Record<string, unknown>;
	const output: Record<string, unknown> = options.unknownKeys === "passthrough" ? { ...input } : {};
	const issues: StandardSchemaV1.Issue[] = [];
	for (const key of Object.keys(shape)) {
		const field = shape[key] as AnySchema;
		const result = syncValidate(field, input[key]);
		if (result.issues) {
			issues.push(...prefixIssues(result.issues, key));
			continue;
		}
		// Absent optional keys stay absent instead of becoming `key: undefined`.
		if (result.value !== undefined || key in input) output[key] = result.value;
	}
	if (options.unknownKeys === "reject") {
		for (const key of Object.keys(input)) {
			if (!(key in shape)) issues.push({ message: "unknown key", path: [{ key }] });
		}
	}
	return issues.length > 0 ? { issues } : ok(output);
}

function objectJson(shape: Shape, options: ObjectOptions): JsonSchema {
	const properties: Record<string, JsonSchema> = {};
	const required: string[] = [];
	for (const [key, field] of Object.entries(shape)) {
		properties[key] = toJSONSchema(field);
		if (!metaOf(field)?.optional) required.push(key);
	}
	const json: JsonSchema = { type: "object", properties };
	if (required.length > 0) json["required"] = required;
	if (options.unknownKeys !== "passthrough") json["additionalProperties"] = false;
	return json;
}

/** A plain object with a fixed set of keys. */
export function object<T extends Shape>(shape: T, options: ObjectOptions = {}): ObjectSchema<T> {
	const schema = makeSchema<ObjectType<T, "_input">, ObjectType<T, "_output">>(
		(value) =>
			validateObject(shape, options, value) as StandardSchemaV1.Result<ObjectType<T, "_output">>,
		{ json: () => objectJson(shape, options) },
	);
	return Object.assign(schema, { shape, options });
}

/** Object with only `keys`. */
export function pick<T extends Shape, const K extends keyof T & string>(
	schema: ObjectSchema<T>,
	keys: readonly K[],
): ObjectSchema<Pick<T, K>> {
	const shape = {} as Pick<T, K>;
	for (const key of keys) shape[key] = schema.shape[key];
	return object(shape, schema.options);
}

/** Object without `keys`. */
export function omit<T extends Shape, const K extends keyof T & string>(
	schema: ObjectSchema<T>,
	keys: readonly K[],
): ObjectSchema<Omit<T, K>> {
	const drop = new Set<string>(keys);
	const shape: Shape = {};
	for (const [key, field] of Object.entries(schema.shape)) if (!drop.has(key)) shape[key] = field;
	return object(shape as Omit<T, K>, schema.options);
}

/** Every key optional (PATCH bodies). */
export function partial<T extends Shape>(
	schema: ObjectSchema<T>,
): ObjectSchema<{
	[K in keyof T]: Schema<T[K]["_input"] | undefined, T[K]["_output"] | undefined>;
}> {
	const shape: Shape = {};
	for (const [key, field] of Object.entries(schema.shape)) shape[key] = optional(field);
	return object(shape, schema.options) as never;
}

/** Object with extra (or overriding) fields. */
export function extend<T extends Shape, E extends Shape>(
	schema: ObjectSchema<T>,
	fields: E,
): ObjectSchema<Simplify<Omit<T, keyof E> & E>> {
	return object({ ...schema.shape, ...fields } as Simplify<Omit<T, keyof E> & E>, schema.options);
}

/** An array whose items all match `element`. */
export function array<I, O>(element: Schema<I, O>): Schema<I[], O[]> {
	return makeSchema<I[], O[]>(
		(value) => {
			if (!Array.isArray(value)) return fail("expected array");
			const output: O[] = [];
			const issues: StandardSchemaV1.Issue[] = [];
			value.forEach((item, index) => {
				const result = syncValidate(element, item);
				if (result.issues) issues.push(...prefixIssues(result.issues, index));
				else output.push(result.value);
			});
			return issues.length > 0 ? { issues } : ok(output);
		},
		{ json: () => ({ type: "array", items: toJSONSchema(element) }) },
	);
}

/** An object with arbitrary string keys whose values match `value`. */
export function record<I, O>(value: Schema<I, O>): Schema<Record<string, I>, Record<string, O>> {
	return makeSchema<Record<string, I>, Record<string, O>>(
		(input) => {
			if (typeof input !== "object" || input === null || Array.isArray(input)) {
				return fail("expected object");
			}
			const output: Record<string, O> = {};
			const issues: StandardSchemaV1.Issue[] = [];
			for (const [key, item] of Object.entries(input)) {
				const result = syncValidate(value, item);
				if (result.issues) issues.push(...prefixIssues(result.issues, key));
				else output[key] = result.value;
			}
			return issues.length > 0 ? { issues } : ok(output);
		},
		{ json: () => ({ type: "object", additionalProperties: toJSONSchema(value) }) },
	);
}

/** The first matching option wins. */
export function union<T extends readonly [AnySchema, AnySchema, ...AnySchema[]]>(
	options: T,
): Schema<T[number]["_input"], T[number]["_output"]> {
	return makeSchema<T[number]["_input"], T[number]["_output"]>(
		(value) => {
			const issues: StandardSchemaV1.Issue[] = [];
			for (const option of options) {
				const result = syncValidate(option, value);
				if (!result.issues) return ok(result.value as T[number]["_output"]);
				issues.push(...result.issues);
			}
			return { issues: [{ message: "value did not match any union member", path: [] }, ...issues] };
		},
		{ json: () => ({ anyOf: options.map(toJSONSchema) }) },
	);
}

/** Also accepts `undefined`; object keys become optional. */
export function optional<I, O>(schema: Schema<I, O>): Schema<I | undefined, O | undefined> {
	return makeSchema<I | undefined, O | undefined>(
		(value) =>
			value === undefined
				? ok(undefined)
				: (syncValidate(schema, value) as StandardSchemaV1.Result<O | undefined>),
		{ json: () => toJSONSchema(schema), optional: true },
	);
}

/** Also accepts `null`. */
export function nullable<I, O>(schema: Schema<I, O>): Schema<I | null, O | null> {
	return makeSchema<I | null, O | null>(
		(value) =>
			value === null
				? ok(null)
				: (syncValidate(schema, value) as StandardSchemaV1.Result<O | null>),
		{ json: () => ({ anyOf: [toJSONSchema(schema), { type: "null" }] }) },
	);
}

/** `undefined` input becomes `defaultValue`; the output is never `undefined`. */
export function defaulted<I, O>(schema: Schema<I, O>, defaultValue: O): Schema<I | undefined, O> {
	return makeSchema<I | undefined, O>(
		(value) =>
			value === undefined
				? ok(defaultValue)
				: (syncValidate(schema, value) as StandardSchemaV1.Result<O>),
		{ json: () => ({ ...toJSONSchema(schema), default: defaultValue }), optional: true },
	);
}

/** Options for {@link refine}. */
export interface RefineOptions {
	/** Issue message when the check fails. */
	message: string;
	/** Where to report the issue (e.g. `["confirm"]`). Defaults to the value itself. */
	path?: PropertyKey[];
}

/** Extra check after `schema` passes; use for cross-field rules. */
export function refine<S extends AnySchema>(
	schema: S,
	check: (value: S["_output"]) => boolean,
	options: RefineOptions,
): S {
	const refined = makeSchema<S["_input"], S["_output"]>(
		(value) => {
			const result = syncValidate(schema, value);
			if (result.issues) return result;
			return check(result.value) ? result : fail(options.message, options.path ?? []);
		},
		{ ...metaOf(schema) },
	);
	return (
		isObjectSchema(schema)
			? Object.assign(refined, { shape: schema.shape, options: schema.options })
			: refined
	) as S;
}

function isObjectSchema(schema: AnySchema): schema is ObjectSchema<Shape> {
	return "shape" in schema;
}

/** Map the parsed value. Generated docs describe the input side. */
export function transform<I, O, R>(schema: Schema<I, O>, fn: (value: O) => R): Schema<I, R> {
	return makeSchema<I, R>(
		(value) => {
			const result = syncValidate(schema, value);
			return result.issues ? result : ok(fn(result.value));
		},
		{ ...metaOf(schema) },
	);
}

/** Map the raw input before `schema` validates it (coercion building block). */
export function preprocess<I, O>(
	fn: (value: unknown) => unknown,
	schema: Schema<I, O>,
): Schema<unknown, O> {
	return makeSchema<unknown, O>((value) => syncValidate(schema, fn(value)), { ...metaOf(schema) });
}

/** Attach title/description/example for generated docs; validation is unchanged. */
export function describe<S extends AnySchema>(schema: S, description: SchemaDescription): S {
	const meta = metaOf(schema);
	const extra: JsonSchema = {};
	for (const [key, value] of Object.entries(description))
		if (value !== undefined) extra[key] = value;
	return Object.assign(Object.create(Object.getPrototypeOf(schema)), schema, {
		"~meta": { ...meta, json: () => ({ ...toJSONSchema(schema), ...extra }) },
	});
}

/**
 * JSON Schema (2020-12) describing the input `schema` accepts. Foreign
 * Standard Schemas without Arachne metadata produce `{}` (any value).
 */
export function toJSONSchema(schema: StandardSchemaV1): JsonSchema {
	return metaOf(schema)?.json?.() ?? {};
}
