import { describe, expect, test } from "bun:test";
import { type Infer, type InferInput, parse, s, safeParse, toJSONSchema } from "./index.ts";

const messages = (result: { issues?: ReadonlyArray<{ message: string }> | undefined }) =>
	(result.issues ?? []).map((issue) => issue.message);

describe("string formats", () => {
	test("email accepts addresses and rejects junk", () => {
		expect(parse(s.email(), "ada@example.com")).toBe("ada@example.com");
		expect(messages(safeParse(s.email(), "ada@"))).toEqual(["expected email address"]);
		expect(messages(safeParse(s.email(), "a b@example.com"))).toEqual(["expected email address"]);
	});

	test("url, uuid and datetime", () => {
		expect(parse(s.url(), "https://arachne.dev/docs")).toBe("https://arachne.dev/docs");
		expect(safeParse(s.url(), "not a url").issues).toBeDefined();
		expect(parse(s.uuid(), "3f0e6b8a-2c5d-4c1e-9a7b-1d2e3f4a5b6c")).toBeString();
		expect(safeParse(s.uuid(), "3f0e6b8a").issues).toBeDefined();
		expect(parse(s.datetime(), "2026-09-30T10:00:00.000Z")).toBe("2026-09-30T10:00:00.000Z");
		expect(safeParse(s.datetime(), "30/09/2026").issues).toBeDefined();
	});

	test("trim and lowercase run before length checks", () => {
		const schema = s.string({ trim: true, lowercase: true, min: 3 });
		expect(parse(schema, "  ADA  ")).toBe("ada");
		expect(safeParse(schema, "  A ").issues).toBeDefined();
	});
});

describe("coercion for query strings and form fields", () => {
	test("numbers and integers", () => {
		expect(parse(s.coerce.number(), "4.5")).toBe(4.5);
		expect(parse(s.coerce.integer({ min: 1 }), "3")).toBe(3);
		expect(messages(safeParse(s.coerce.integer(), "3.2"))).toEqual(["expected integer"]);
		expect(messages(safeParse(s.coerce.number(), "abc"))).toEqual(["expected number"]);
		expect(messages(safeParse(s.coerce.number(), ""))).toEqual(["expected number"]);
	});

	test("booleans accept the usual form spellings", () => {
		for (const yes of ["true", "1", "on", "yes", true])
			expect(parse(s.coerce.boolean(), yes)).toBe(true);
		for (const no of ["false", "0", "off", "no", false])
			expect(parse(s.coerce.boolean(), no)).toBe(false);
		expect(safeParse(s.coerce.boolean(), "maybe").issues).toBeDefined();
	});

	test("dates from ISO strings and timestamps", () => {
		const date = parse(s.coerce.date(), "2026-09-30T00:00:00.000Z");
		expect(date).toBeInstanceOf(Date);
		expect(date.toISOString()).toBe("2026-09-30T00:00:00.000Z");
		expect(safeParse(s.coerce.date(), "yesterday").issues).toBeDefined();
	});

	test("arrays wrap single values (repeated query keys)", () => {
		const schema = s.coerce.array(s.coerce.integer());
		expect(parse(schema, "2")).toEqual([2]);
		expect(parse(schema, ["2", "3"])).toEqual([2, 3]);
	});
});

describe("objects", () => {
	const User = s.object({
		email: s.email(),
		name: s.string({ min: 1 }),
		bio: s.optional(s.string()),
		role: s.defaulted(s.enum(["user", "admin"]), "user"),
	});

	test("optional keys are optional in the inferred input type", () => {
		const input: InferInput<typeof User> = { email: "a@b.co", name: "Ada" };
		const value: Infer<typeof User> = parse(User, input);
		expect(value).toEqual({ email: "a@b.co", name: "Ada", role: "user" });
		expect("bio" in value).toBe(false);
	});

	test("strict objects reject unknown keys; default strips them", () => {
		expect(parse(User, { email: "a@b.co", name: "Ada", extra: 1 })).not.toHaveProperty("extra");
		const strict = s.object({ id: s.string() }, { unknownKeys: "reject" });
		const result = safeParse(strict, { id: "1", admin: true });
		expect(result.issues?.[0]?.message).toBe("unknown key");
		expect(result.issues?.[0]?.path).toEqual([{ key: "admin" }]);
	});

	test("pick, omit, partial and extend reuse the shape", () => {
		expect(Object.keys(s.pick(User, ["email"]).shape)).toEqual(["email"]);
		expect(Object.keys(s.omit(User, ["bio", "role"]).shape)).toEqual(["email", "name"]);
		expect(parse(s.partial(User), {})).toEqual({});
		const Admin = s.extend(User, { level: s.number() });
		expect(parse(Admin, { email: "a@b.co", name: "A", level: 9 }).level).toBe(9);
	});

	test("nested issues carry the full path", () => {
		const schema = s.object({ items: s.array(s.object({ qty: s.number({ min: 1 }) })) });
		const result = safeParse(schema, { items: [{ qty: 1 }, { qty: 0 }] });
		expect(result.issues?.[0]?.path).toEqual([{ key: "items" }, { key: 1 }, { key: "qty" }]);
	});
});

describe("refine, transform, record, file, unknown", () => {
	test("refine adds cross-field checks at a path", () => {
		const Signup = s.refine(
			s.object({ password: s.string({ min: 8 }), confirm: s.string() }),
			(value) => value.password === value.confirm,
			{ message: "passwords do not match", path: ["confirm"] },
		);
		const result = safeParse(Signup, { password: "hunter2hunter2", confirm: "hunter3" });
		expect(result.issues).toEqual([
			{ message: "passwords do not match", path: [{ key: "confirm" }] },
		]);
		expect(parse(Signup, { password: "hunter2hunter2", confirm: "hunter2hunter2" })).toBeDefined();
	});

	test("transform maps the parsed value", () => {
		const Slug = s.transform(s.string({ min: 1 }), (value) =>
			value.toLowerCase().replace(/\s+/g, "-"),
		);
		expect(parse(Slug, "Hello World")).toBe("hello-world");
	});

	test("record validates every value", () => {
		const schema = s.record(s.number());
		expect(parse(schema, { a: 1, b: 2 })).toEqual({ a: 1, b: 2 });
		expect(safeParse(schema, { a: "1" }).issues?.[0]?.path).toEqual([{ key: "a" }]);
	});

	test("file checks size and type", () => {
		const Avatar = s.file({ maxSize: 10, types: ["image/png", "image/*"] });
		const png = new File([new Uint8Array(4)], "a.png", { type: "image/png" });
		expect(parse(Avatar, png)).toBe(png);
		const big = new File([new Uint8Array(11)], "b.png", { type: "image/png" });
		expect(messages(safeParse(Avatar, big))).toEqual(["file must be at most 10 bytes"]);
		const pdf = new File(["%PDF"], "c.pdf", { type: "application/pdf" });
		expect(messages(safeParse(Avatar, pdf))).toEqual(["file type application/pdf is not allowed"]);
		expect(messages(safeParse(Avatar, "a.png"))).toEqual(["expected file"]);
	});

	test("unknown accepts anything", () => {
		expect(parse(s.unknown(), { any: "thing" })).toEqual({ any: "thing" });
	});
});

describe("toJSONSchema", () => {
	test("objects list required keys and nested types", () => {
		const schema = s.describe(
			s.object({
				email: s.email(),
				age: s.optional(s.number({ min: 0, int: true })),
				tags: s.array(s.string({ max: 20 })),
				role: s.defaulted(s.enum(["user", "admin"]), "user"),
			}),
			{ title: "User", description: "A person" },
		);
		expect(toJSONSchema(schema)).toEqual({
			type: "object",
			title: "User",
			description: "A person",
			properties: {
				email: { type: "string", format: "email" },
				age: { type: "integer", minimum: 0 },
				tags: { type: "array", items: { type: "string", maxLength: 20 } },
				role: { type: "string", enum: ["user", "admin"], default: "user" },
			},
			required: ["email", "tags"],
			additionalProperties: false,
		});
	});

	test("nullable, union, literal, record and file", () => {
		expect(toJSONSchema(s.nullable(s.string()))).toEqual({
			anyOf: [{ type: "string" }, { type: "null" }],
		});
		expect(toJSONSchema(s.union([s.literal("a"), s.number()]))).toEqual({
			anyOf: [{ const: "a" }, { type: "number" }],
		});
		expect(toJSONSchema(s.record(s.boolean()))).toEqual({
			type: "object",
			additionalProperties: { type: "boolean" },
		});
		expect(toJSONSchema(s.file())).toEqual({ type: "string", format: "binary" });
	});

	test("coerced and transformed schemas describe their input", () => {
		expect(toJSONSchema(s.coerce.integer({ max: 100 }))).toEqual({ type: "integer", maximum: 100 });
		expect(toJSONSchema(s.transform(s.string(), (v) => v.length))).toEqual({ type: "string" });
	});

	test("foreign Standard Schemas become an open schema", () => {
		const foreign = {
			"~standard": { version: 1, vendor: "x", validate: (v: unknown) => ({ value: v }) },
		} as const;
		expect(toJSONSchema(foreign)).toEqual({});
	});
});
