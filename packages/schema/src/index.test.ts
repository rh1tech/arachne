import { describe, expect, test } from "bun:test";
import { parse, SchemaError, safeParse } from "../src/parse.ts";
import { s } from "../src/schema.ts";
import { schemaFromSpec } from "../src/spec.ts";
import type { Infer } from "../src/standard-schema.ts";

describe("s primitives", () => {
	test("string min/max/pattern", () => {
		const schema = s.string({ min: 2, max: 4, pattern: /^[a-z]+$/ });
		expect(safeParse(schema, "ab").issues).toBeUndefined();
		expect(safeParse(schema, "a").issues?.[0]?.message).toContain(">=");
		expect(safeParse(schema, "abcde").issues?.[0]?.message).toContain("<=");
		expect(safeParse(schema, "AA").issues?.[0]?.message).toContain("match");
	});

	test("number int bounds", () => {
		const schema = s.number({ min: 1, max: 3, int: true });
		expect(parse(schema, 2)).toBe(2);
		expect(safeParse(schema, 1.5).issues?.[0]?.message).toContain("integer");
		expect(safeParse(schema, 0).issues?.[0]?.message).toContain(">=");
	});

	test("boolean / literal / enum", () => {
		expect(parse(s.boolean(), true)).toBe(true);
		expect(parse(s.literal("x"), "x")).toBe("x");
		expect(parse(s.enum(["a", "b"]), "b")).toBe("b");
		expect(safeParse(s.enum(["a", "b"]), "c").issues).toBeDefined();
	});
});

describe("s composites", () => {
	test("object optional nullable defaulted", () => {
		const schema = s.object({
			name: s.string({ min: 1 }),
			bio: s.optional(s.string()),
			deletedAt: s.nullable(s.string()),
			active: s.defaulted(s.boolean(), true),
		});

		const value = parse(schema, {
			name: "Ada",
			deletedAt: null,
		});
		expect(value).toEqual({
			name: "Ada",
			bio: undefined,
			deletedAt: null,
			active: true,
		});
	});

	test("array + nested paths", () => {
		const schema = s.array(s.number({ int: true }));
		const result = safeParse(schema, [1, 2.5, 3]);
		expect(result.issues?.[0]?.path).toEqual([{ key: 1 }]);
	});

	test("union", () => {
		const schema = s.union([s.string(), s.number()]);
		expect(parse(schema, "hi")).toBe("hi");
		expect(parse(schema, 3)).toBe(3);
		expect(safeParse(schema, true).issues?.[0]?.message).toContain("union");
	});
});

describe("parse helpers", () => {
	test("parse throws SchemaError", () => {
		expect(() => parse(s.string(), 1)).toThrow(SchemaError);
	});

	test("Infer type smoke", () => {
		const User = s.object({
			id: s.string(),
			roles: s.array(s.enum(["admin", "user"])),
		});
		type User = Infer<typeof User>;
		const user: User = parse(User, { id: "1", roles: ["admin"] });
		expect(user.roles[0]).toBe("admin");
	});
});

describe("schemaFromSpec", () => {
	test("builds object schema from JSON spec", () => {
		const schema = schemaFromSpec({
			kind: "object",
			fields: {
				id: { kind: "string", min: 1 },
				age: { kind: "number", int: true, min: 0 },
				tags: { kind: "array", of: { kind: "string" } },
			},
		});
		expect(parse(schema, { id: "u1", age: 20, tags: ["a"] })).toEqual({
			id: "u1",
			age: 20,
			tags: ["a"],
		});
		expect(safeParse(schema, { id: "", age: 20, tags: [] }).issues).toBeDefined();
	});
});
