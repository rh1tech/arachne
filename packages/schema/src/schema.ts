import { coerce } from "./coerce.ts";
import {
	array,
	defaulted,
	describe,
	extend,
	nullable,
	object,
	omit,
	optional,
	partial,
	pick,
	preprocess,
	record,
	refine,
	transform,
	union,
} from "./composites.ts";
import type { AnySchema, Schema } from "./helpers.ts";
import {
	boolean,
	date,
	datetime,
	email,
	enumOf,
	file,
	integer,
	isoDate,
	literal,
	number,
	string,
	unknown,
	url,
	uuid,
} from "./primitives.ts";

export type { NumberOptions, StringOptions } from "./primitives.ts";

/**
 * The schema DSL. Every builder returns a Standard Schema V1 value with
 * JSON Schema metadata, so one definition validates requests, rows and forms
 * and documents APIs.
 *
 * @example
 * ```ts
 * const Signup = s.object({
 *   email: s.email(),
 *   password: s.string({ min: 12 }),
 *   age: s.optional(s.coerce.integer({ min: 13 })),
 * });
 * ```
 */
export const s = {
	string,
	email,
	url,
	uuid,
	datetime,
	isoDate,
	number,
	integer,
	boolean,
	literal,
	enum: enumOf,
	date,
	file,
	unknown,
	optional,
	nullable,
	defaulted,
	object,
	pick,
	omit,
	partial,
	extend,
	array,
	record,
	union,
	refine,
	transform,
	preprocess,
	describe,
	coerce,
};

export type { AnySchema, Schema };
