import { fail, type JsonSchema, makeSchema, ok, type Schema } from "./helpers.ts";

/** Built-in string formats; each maps to the JSON Schema `format` keyword. */
export type StringFormat = "email" | "url" | "uuid" | "date-time" | "date";

/** Options for {@link string}. Normalisation runs before the checks. */
export interface StringOptions {
	/** Minimum length (after trim/lowercase). */
	min?: number;
	/** Maximum length (after trim/lowercase). */
	max?: number;
	/** Regular expression the value must match. */
	pattern?: RegExp;
	/** Named format checked after length and pattern. */
	format?: StringFormat;
	/** Strip leading and trailing whitespace first. */
	trim?: boolean;
	/** Lower-case the value first (useful for emails and slugs). */
	lowercase?: boolean;
}

/** Options for {@link number}. */
export interface NumberOptions {
	/** Inclusive minimum. */
	min?: number;
	/** Inclusive maximum. */
	max?: number;
	/** Require an integer (JSON Schema `integer`). */
	int?: boolean;
}

/** Options for {@link file}. */
export interface FileOptions {
	/** Maximum size in bytes. */
	maxSize?: number;
	/** Allowed MIME types; `type/*` matches a whole family. */
	types?: readonly string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

const FORMAT_CHECKS: Record<StringFormat, { test: (value: string) => boolean; message: string }> = {
	email: { test: (value) => EMAIL.test(value), message: "expected email address" },
	url: {
		test: (value) => URL.canParse(value) && /^https?:$/.test(new URL(value).protocol),
		message: "expected URL",
	},
	uuid: { test: (value) => UUID.test(value), message: "expected UUID" },
	"date-time": {
		test: (value) => DATE_TIME.test(value) && !Number.isNaN(Date.parse(value)),
		message: "expected ISO date-time",
	},
	date: {
		test: (value) => DATE.test(value) && !Number.isNaN(Date.parse(value)),
		message: "expected ISO date (YYYY-MM-DD)",
	},
};

function stringJson(options: StringOptions): JsonSchema {
	const json: JsonSchema = { type: "string" };
	if (options.min !== undefined) json["minLength"] = options.min;
	if (options.max !== undefined) json["maxLength"] = options.max;
	if (options.pattern) json["pattern"] = options.pattern.source;
	if (options.format) json["format"] = options.format;
	return json;
}

function normalize(value: string, options: StringOptions): string {
	let out = options.trim ? value.trim() : value;
	if (options.lowercase) out = out.toLowerCase();
	return out;
}

/** A string, optionally normalised and checked for length, pattern and format. */
export function string(options: StringOptions = {}): Schema<string> {
	return makeSchema<string, string>(
		(input) => {
			if (typeof input !== "string") return fail("expected string");
			const value = normalize(input, options);
			if (options.min !== undefined && value.length < options.min) {
				return fail(`string length must be >= ${options.min}`);
			}
			if (options.max !== undefined && value.length > options.max) {
				return fail(`string length must be <= ${options.max}`);
			}
			if (options.pattern && !options.pattern.test(value)) {
				return fail(`string must match ${options.pattern}`);
			}
			const format = options.format ? FORMAT_CHECKS[options.format] : undefined;
			if (format && !format.test(value)) return fail(format.message);
			return ok(value);
		},
		{ json: () => stringJson(options) },
	);
}

/** Shorthand for a string in `format`. */
function formatted(format: StringFormat) {
	return (options: Omit<StringOptions, "format"> = {}): Schema<string> =>
		string({ ...options, format });
}

/** An email address (trimmed). */
export const email = (options: Omit<StringOptions, "format"> = {}): Schema<string> =>
	string({ trim: true, ...options, format: "email" });
/** An absolute `http(s)` URL. */
export const url = formatted("url");
/** A UUID in canonical 8-4-4-4-12 form. */
export const uuid = formatted("uuid");
/** An ISO 8601 date-time string with a timezone (`2026-09-30T10:00:00Z`). */
export const datetime = formatted("date-time");
/** An ISO calendar date string (`2026-09-30`). */
export const isoDate = formatted("date");

function numberJson(options: NumberOptions): JsonSchema {
	const json: JsonSchema = { type: options.int ? "integer" : "number" };
	if (options.min !== undefined) json["minimum"] = options.min;
	if (options.max !== undefined) json["maximum"] = options.max;
	return json;
}

/** Check a number against {@link NumberOptions}; shared with coercion. */
export function checkNumber(value: unknown, options: NumberOptions) {
	if (typeof value !== "number" || Number.isNaN(value)) return fail("expected number");
	if (options.int && !Number.isInteger(value)) return fail("expected integer");
	if (options.min !== undefined && value < options.min) {
		return fail(`number must be >= ${options.min}`);
	}
	if (options.max !== undefined && value > options.max) {
		return fail(`number must be <= ${options.max}`);
	}
	return ok(value);
}

/** A finite-or-infinite number (never `NaN`). */
export function number(options: NumberOptions = {}): Schema<number> {
	return makeSchema<number, number>((value) => checkNumber(value, options), {
		json: () => numberJson(options),
	});
}

/** JSON Schema for {@link number}; shared with coercion. */
export { numberJson };

/** An integer; same as `number({ ...options, int: true })`. */
export function integer(options: Omit<NumberOptions, "int"> = {}): Schema<number> {
	return number({ ...options, int: true });
}

/** `true` or `false`. */
export function boolean(): Schema<boolean> {
	return makeSchema<boolean, boolean>(
		(value) => (typeof value === "boolean" ? ok(value) : fail("expected boolean")),
		{ json: () => ({ type: "boolean" }) },
	);
}

/** Exactly `value`. */
export function literal<T extends string | number | boolean>(value: T): Schema<T> {
	return makeSchema<T, T>(
		(input) => (input === value ? ok(value) : fail(`expected literal ${String(value)}`)),
		{ json: () => ({ const: value }) },
	);
}

/** One of the listed strings. */
export function enumOf<const T extends readonly [string, ...string[]]>(
	values: T,
): Schema<T[number]> {
	const set = new Set<string>(values);
	return makeSchema<T[number], T[number]>(
		(value) => {
			if (typeof value !== "string" || !set.has(value)) {
				return fail(`expected one of: ${values.join(", ")}`);
			}
			return ok(value as T[number]);
		},
		{ json: () => ({ type: "string", enum: [...values] }) },
	);
}

/** A `Date` instance with a valid time. Use `s.coerce.date()` for strings. */
export function date(): Schema<Date> {
	return makeSchema<Date, Date>(
		(value) =>
			value instanceof Date && !Number.isNaN(value.getTime()) ? ok(value) : fail("expected date"),
		{ json: () => ({ type: "string", format: "date-time" }) },
	);
}

function typeAllowed(type: string, allowed: readonly string[]): boolean {
	return allowed.some((pattern) =>
		pattern.endsWith("/*") ? type.startsWith(pattern.slice(0, -1)) : pattern === type,
	);
}

/**
 * An uploaded `File` (or any `Blob`), optionally limited by size and MIME
 * type. Pairs with multipart parsing in `@arachnejs/server`.
 */
export function file(options: FileOptions = {}): Schema<File> {
	return makeSchema<File, File>(
		(value) => {
			if (!(value instanceof Blob)) return fail("expected file");
			if (options.maxSize !== undefined && value.size > options.maxSize) {
				return fail(`file must be at most ${options.maxSize} bytes`);
			}
			if (options.types && !typeAllowed(value.type, options.types)) {
				return fail(`file type ${value.type || "unknown"} is not allowed`);
			}
			return ok(value as File);
		},
		{ json: () => ({ type: "string", format: "binary" }) },
	);
}

/** Any value, unchecked. Output type is `unknown`. */
export function unknown(): Schema<unknown> {
	return makeSchema<unknown, unknown>((value) => ok(value), { json: () => ({}) });
}
