import type { StandardSchemaV1 } from "./standard-schema.ts";

export type Schema<I, O = I> = StandardSchemaV1<I, O> & {
	readonly _input: I;
	readonly _output: O;
};

export type AnySchema = Schema<unknown, unknown>;

export function ok<T>(value: T): StandardSchemaV1.SuccessResult<T> {
	return { value };
}

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

export function makeSchema<I, O>(
	validate: (value: unknown) => StandardSchemaV1.Result<O>,
): Schema<I, O> {
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
