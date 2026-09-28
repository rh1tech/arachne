import { type AnySchema, fail, makeSchema, ok, type Schema, syncValidate } from "./helpers.ts";
import type { StandardSchemaV1 } from "./standard-schema.ts";

export interface StringOptions {
	min?: number;
	max?: number;
	pattern?: RegExp;
}

export interface NumberOptions {
	min?: number;
	max?: number;
	int?: boolean;
}

function collectObjectIssues(
	shape: Record<string, AnySchema>,
	input: Record<string, unknown>,
): { output: Record<string, unknown>; issues: StandardSchemaV1.Issue[] } {
	const output: Record<string, unknown> = {};
	const issues: StandardSchemaV1.Issue[] = [];

	for (const key of Object.keys(shape)) {
		const field = shape[key];
		if (!field) continue;
		const result = syncValidate(field, input[key]);
		if (result.issues) {
			for (const issue of result.issues) {
				issues.push({
					message: issue.message,
					path: [{ key }, ...(issue.path ?? [])],
				});
			}
			continue;
		}
		output[key] = result.value;
	}

	return { output, issues };
}

export const s = {
	string(options: StringOptions = {}): Schema<string> {
		return makeSchema((value) => {
			if (typeof value !== "string") return fail("expected string");
			if (options.min !== undefined && value.length < options.min) {
				return fail(`string length must be >= ${options.min}`);
			}
			if (options.max !== undefined && value.length > options.max) {
				return fail(`string length must be <= ${options.max}`);
			}
			if (options.pattern && !options.pattern.test(value)) {
				return fail(`string must match ${options.pattern}`);
			}
			return ok(value);
		});
	},

	number(options: NumberOptions = {}): Schema<number> {
		return makeSchema((value) => {
			if (typeof value !== "number" || Number.isNaN(value)) return fail("expected number");
			if (options.int && !Number.isInteger(value)) return fail("expected integer");
			if (options.min !== undefined && value < options.min) {
				return fail(`number must be >= ${options.min}`);
			}
			if (options.max !== undefined && value > options.max) {
				return fail(`number must be <= ${options.max}`);
			}
			return ok(value);
		});
	},

	boolean(): Schema<boolean> {
		return makeSchema((value) =>
			typeof value === "boolean" ? ok(value) : fail("expected boolean"),
		);
	},

	literal<T extends string | number | boolean>(value: T): Schema<T> {
		return makeSchema((input) =>
			input === value ? ok(value) : fail(`expected literal ${String(value)}`),
		);
	},

	enum<const T extends readonly [string, ...string[]]>(values: T): Schema<T[number]> {
		const set = new Set<string>(values);
		return makeSchema((value) => {
			if (typeof value !== "string" || !set.has(value)) {
				return fail(`expected one of: ${values.join(", ")}`);
			}
			return ok(value as T[number]);
		});
	},

	optional<I, O>(schema: Schema<I, O>): Schema<I | undefined, O | undefined> {
		return makeSchema((value) => {
			if (value === undefined) return ok(undefined);
			return syncValidate(schema, value) as StandardSchemaV1.Result<O | undefined>;
		});
	},

	nullable<I, O>(schema: Schema<I, O>): Schema<I | null, O | null> {
		return makeSchema((value) => {
			if (value === null) return ok(null);
			return syncValidate(schema, value) as StandardSchemaV1.Result<O | null>;
		});
	},

	defaulted<I, O>(schema: Schema<I, O>, defaultValue: O): Schema<I | undefined, O> {
		return makeSchema((value) => {
			if (value === undefined) return ok(defaultValue);
			return syncValidate(schema, value) as StandardSchemaV1.Result<O>;
		});
	},

	object<T extends Record<string, AnySchema>>(
		shape: T,
	): Schema<{ [K in keyof T]: T[K]["_input"] }, { [K in keyof T]: T[K]["_output"] }> {
		return makeSchema((value) => {
			if (typeof value !== "object" || value === null || Array.isArray(value)) {
				return fail("expected object");
			}
			const { output, issues } = collectObjectIssues(shape, value as Record<string, unknown>);
			if (issues.length > 0) return { issues };
			return ok(output as { [K in keyof T]: T[K]["_output"] });
		});
	},

	array<I, O>(element: Schema<I, O>): Schema<I[], O[]> {
		return makeSchema((value) => {
			if (!Array.isArray(value)) return fail("expected array");
			const output: O[] = [];
			const issues: StandardSchemaV1.Issue[] = [];
			for (let i = 0; i < value.length; i += 1) {
				const result = syncValidate(element, value[i]);
				if (result.issues) {
					for (const issue of result.issues) {
						issues.push({
							message: issue.message,
							path: [{ key: i }, ...(issue.path ?? [])],
						});
					}
					continue;
				}
				output.push(result.value);
			}
			if (issues.length > 0) return { issues };
			return ok(output);
		});
	},

	union<T extends readonly [AnySchema, AnySchema, ...AnySchema[]]>(
		options: T,
	): Schema<T[number]["_input"], T[number]["_output"]> {
		return makeSchema((value) => {
			const issues: StandardSchemaV1.Issue[] = [];
			for (const option of options) {
				const result = syncValidate(option, value);
				if (!result.issues) return ok(result.value as T[number]["_output"]);
				issues.push(...result.issues);
			}
			return {
				issues: [
					{
						message: "value did not match any union member",
						path: [],
					},
					...issues,
				],
			};
		});
	},
};

export type { AnySchema, Schema };
