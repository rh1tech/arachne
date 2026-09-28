import type { StandardSchemaV1 } from "./standard-schema.ts";

type Schema<I, O = I> = StandardSchemaV1<I, O> & {
	readonly _input: I;
	readonly _output: O;
};

function ok<T>(value: T): StandardSchemaV1.SuccessResult<T> {
	return { value };
}

function fail(message: string, path: PropertyKey[] = []): StandardSchemaV1.FailureResult {
	return {
		issues: [
			{
				message,
				path: path.map((key) => ({ key })),
			},
		],
	};
}

function makeSchema<I, O>(validate: (value: unknown) => StandardSchemaV1.Result<O>): Schema<I, O> {
	return {
		_input: undefined as I,
		_output: undefined as O,
		"~standard": {
			version: 1,
			vendor: "arachne",
			validate,
			types: undefined as unknown as StandardSchemaV1.Types<I, O>,
		},
	};
}

export interface StringOptions {
	min?: number;
	max?: number;
}

export interface NumberOptions {
	min?: number;
	max?: number;
	int?: boolean;
}

function collectObjectIssues(
	shape: Record<string, Schema<unknown, unknown>>,
	input: Record<string, unknown>,
): { output: Record<string, unknown>; issues: StandardSchemaV1.Issue[] } {
	const output: Record<string, unknown> = {};
	const issues: StandardSchemaV1.Issue[] = [];

	for (const key of Object.keys(shape)) {
		const field = shape[key];
		if (!field) continue;
		const result = field["~standard"].validate(input[key]);
		if (result instanceof Promise) {
			issues.push({
				message: "async validators are not supported in object()",
				path: [{ key }],
			});
			continue;
		}
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

export const c = {
	string(options: StringOptions = {}): Schema<string> {
		return makeSchema((value) => {
			if (typeof value !== "string") return fail("expected string");
			if (options.min !== undefined && value.length < options.min) {
				return fail(`string length must be >= ${options.min}`);
			}
			if (options.max !== undefined && value.length > options.max) {
				return fail(`string length must be <= ${options.max}`);
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

	optional<I, O>(schema: Schema<I, O>): Schema<I | undefined, O | undefined> {
		return makeSchema((value) => {
			if (value === undefined) return ok(undefined);
			return schema["~standard"].validate(value) as StandardSchemaV1.Result<O | undefined>;
		});
	},

	defaulted<I, O>(schema: Schema<I, O>, defaultValue: O): Schema<I | undefined, O> {
		return makeSchema((value) => {
			if (value === undefined) return ok(defaultValue);
			return schema["~standard"].validate(value) as StandardSchemaV1.Result<O>;
		});
	},

	object<T extends Record<string, Schema<unknown, unknown>>>(
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
};

export type AnySchema = Schema<unknown, unknown>;
