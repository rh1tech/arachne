import { preprocess } from "./composites.ts";
import { fail, makeSchema, ok, type Schema, syncValidate } from "./helpers.ts";
import { checkNumber, type NumberOptions, numberJson } from "./primitives.ts";

const TRUE = new Set(["true", "1", "on", "yes"]);
const FALSE = new Set(["false", "0", "off", "no"]);

function toNumber(value: unknown): unknown {
	if (typeof value !== "string") return value;
	const trimmed = value.trim();
	return trimmed === "" ? Number.NaN : Number(trimmed);
}

/**
 * Schemas that convert strings (query parameters, form fields, path params)
 * into typed values before validating them. Values that already have the
 * target type pass through unchanged.
 */
export const coerce = {
	/** `"4.5"` → `4.5`. Empty strings fail rather than becoming `0`. */
	number(options: NumberOptions = {}): Schema<unknown, number> {
		return makeSchema<unknown, number>((value) => checkNumber(toNumber(value), options), {
			json: () => numberJson(options),
		});
	},

	/** `"3"` → `3`; non-integers fail. */
	integer(options: Omit<NumberOptions, "int"> = {}): Schema<unknown, number> {
		return coerce.number({ ...options, int: true });
	},

	/** `true/1/on/yes` and `false/0/off/no` (case-insensitive). */
	boolean(): Schema<unknown, boolean> {
		return makeSchema<unknown, boolean>(
			(value) => {
				if (typeof value === "boolean") return ok(value);
				const text = typeof value === "string" ? value.trim().toLowerCase() : "";
				if (TRUE.has(text)) return ok(true);
				if (FALSE.has(text)) return ok(false);
				return fail("expected boolean");
			},
			{ json: () => ({ type: "boolean" }) },
		);
	},

	/** ISO strings, epoch milliseconds or `Date` → `Date`. */
	date(): Schema<unknown, Date> {
		return makeSchema<unknown, Date>(
			(value) => {
				const date =
					value instanceof Date
						? value
						: typeof value === "string" || typeof value === "number"
							? new Date(value)
							: undefined;
				return date && !Number.isNaN(date.getTime()) ? ok(date) : fail("expected date");
			},
			{ json: () => ({ type: "string", format: "date-time" }) },
		);
	},

	/** A single value becomes a one-item array (`?tag=a` vs `?tag=a&tag=b`). */
	array<I, O>(element: Schema<I, O>): Schema<unknown, O[]> {
		const inner = makeSchema<unknown[], O[]>(
			(value) => {
				const items = value as unknown[];
				const output: O[] = [];
				for (let index = 0; index < items.length; index += 1) {
					const result = syncValidate(element, items[index]);
					if (result.issues) {
						return {
							issues: result.issues.map((issue) => ({
								message: issue.message,
								path: [{ key: index }, ...(issue.path ?? [])],
							})),
						};
					}
					output.push(result.value);
				}
				return ok(output);
			},
			{ json: () => ({ type: "array", items: element["~meta"]?.json?.() ?? {} }) },
		);
		return preprocess(
			(value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
			inner,
		);
	},
};
