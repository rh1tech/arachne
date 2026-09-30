import { describe, expect, test } from "bun:test";
import { s } from "@arachnejs/schema";
import { createForm } from "../src/create-form.ts";

describe("createForm", () => {
	test("validates and submits", async () => {
		const schema = s.object({
			name: s.string({ min: 1 }),
			age: s.number({ int: true, min: 0 }),
		});
		let submitted: { name: string; age: number } | undefined;
		const form = createForm({
			schema,
			initial: { name: "", age: -1 },
			onSubmit: (values) => {
				submitted = values;
			},
		});
		expect(await form.submit()).toBe(false);
		expect(form.errors()["name"]).toBeDefined();

		form.set("name", "Ada");
		form.set("age", 36);
		expect(await form.submit()).toBe(true);
		expect(submitted).toEqual({ name: "Ada", age: 36 });
		expect(form.errors()).toEqual({});
	});

	test("reset restores initial", () => {
		const form = createForm({
			schema: s.object({ name: s.string() }),
			initial: { name: "x" },
			onSubmit: () => undefined,
		});
		form.set("name", "y");
		form.reset();
		expect(form.values()).toEqual({ name: "x" });
	});
});

describe("createForm hardening", () => {
	test("reset clears errors", async () => {
		const form = createForm({
			schema: s.object({ name: s.string({ min: 1 }) }),
			initial: { name: "" },
			onSubmit: () => undefined,
		});
		await form.submit();
		expect(form.errors()["name"]).toBeDefined();
		form.reset();
		expect(form.errors()).toEqual({});
	});

	test("nested issues keep their full dotted path", () => {
		const form = createForm({
			schema: s.object({ address: s.object({ city: s.string({ min: 1 }) }) }),
			initial: { address: { city: "" } },
			onSubmit: () => undefined,
		});
		expect(form.validate()).toBe(false);
		expect(form.errors()["address.city"]).toBeDefined();
	});

	test("submit is not re-entrant and captures thrown errors", async () => {
		let calls = 0;
		let release!: () => void;
		const form = createForm({
			schema: s.object({ name: s.string() }),
			initial: { name: "x" },
			onSubmit: () => {
				calls++;
				return new Promise<void>((r) => {
					release = r;
				});
			},
		});
		const first = form.submit();
		const second = await form.submit();
		expect(second).toBe(false);
		release();
		expect(await first).toBe(true);
		expect(calls).toBe(1);

		const failing = createForm({
			schema: s.object({ name: s.string() }),
			initial: { name: "x" },
			onSubmit: () => {
				throw new Error("Server down");
			},
		});
		expect(await failing.submit()).toBe(false);
		expect(failing.errors()["_form"]).toBe("Server down");
		expect(failing.submitting()).toBe(false);
	});

	test("field ids are unique per form", () => {
		const opts = {
			schema: s.object({ email: s.string() }),
			initial: { email: "" },
			onSubmit: () => undefined,
		};
		const a = createForm(opts);
		const b = createForm({ ...opts, id: "signup" });
		expect(a.fieldId("email")).not.toBe(createForm(opts).fieldId("email"));
		expect(b.fieldId("email")).toBe("signup-email");
	});
});
