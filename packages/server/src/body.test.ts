import { describe, expect, test } from "bun:test";
import { s } from "@arachnejs/schema";
import { cbor } from "./cbor.ts";
import { createServer, formToObject, route } from "./index.ts";

describe("formToObject", () => {
	test("bracket and dot keys build nested objects and arrays", () => {
		const form = new FormData();
		form.append("name", "Ada");
		form.append("address[city]", "London");
		form.append("address.zip", "N1");
		form.append("items[0][sku]", "a");
		form.append("items[0][qty]", "2");
		form.append("items[1][sku]", "b");
		form.append("tags", "x");
		form.append("tags", "y");
		form.append("roles[]", "admin");
		expect(formToObject(form)).toEqual({
			name: "Ada",
			address: { city: "London", zip: "N1" },
			items: [{ sku: "a", qty: "2" }, { sku: "b" }],
			tags: ["x", "y"],
			roles: ["admin"],
		});
	});

	test("prototype-polluting keys are ignored", () => {
		const form = new FormData();
		form.append("__proto__[admin]", "true");
		form.append("constructor[prototype][admin]", "true");
		const value = formToObject(form) as Record<string, unknown>;
		expect(({} as Record<string, unknown>)["admin"]).toBeUndefined();
		expect(value).toEqual({});
	});
});

describe("request bodies", () => {
	const upload = route({
		method: "POST",
		path: "/profile",
		body: s.object({
			name: s.string({ min: 1 }),
			age: s.coerce.integer({ min: 0 }),
			newsletter: s.defaulted(s.coerce.boolean(), false),
			avatar: s.file({ maxSize: 1024, types: ["image/*"] }),
		}),
		handler: async (ctx) => ({
			name: ctx.body.name,
			age: ctx.body.age,
			newsletter: ctx.body.newsletter,
			avatar: {
				name: ctx.body.avatar.name,
				size: ctx.body.avatar.size,
				type: ctx.body.avatar.type,
			},
			bytes: Array.from(new Uint8Array(await ctx.body.avatar.arrayBuffer())),
		}),
	});

	test("multipart uploads are parsed, coerced and validated", async () => {
		const app = createServer({ routes: [upload] });
		const form = new FormData();
		form.append("name", "Ada");
		form.append("age", "36");
		form.append("newsletter", "on");
		form.append("avatar", new File([new Uint8Array([1, 2, 3])], "me.png", { type: "image/png" }));
		const res = await app.fetch(new Request("http://t/profile", { method: "POST", body: form }));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			name: "Ada",
			age: 36,
			newsletter: true,
			avatar: { name: "me.png", size: 3, type: "image/png" },
			bytes: [1, 2, 3],
		});
	});

	test("file rules produce validation issues", async () => {
		const app = createServer({ routes: [upload] });
		const form = new FormData();
		form.append("name", "Ada");
		form.append("age", "36");
		form.append("avatar", new File(["%PDF"], "cv.pdf", { type: "application/pdf" }));
		const res = await app.fetch(new Request("http://t/profile", { method: "POST", body: form }));
		expect(res.status).toBe(422);
		const body = (await res.json()) as { error: { issues: unknown[] } };
		expect(body.error.issues).toEqual([
			{ location: "body", path: "avatar", message: "file type application/pdf is not allowed" },
		]);
	});

	test("urlencoded forms work like multipart", async () => {
		const app = createServer({
			routes: [
				route({
					method: "POST",
					path: "/login",
					body: s.object({ email: s.email(), remember: s.defaulted(s.coerce.boolean(), false) }),
					handler: (ctx) => ctx.body,
				}),
			],
		});
		const res = await app.fetch(
			new Request("http://t/login", {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: "email=ada%40example.com&remember=1",
			}),
		);
		expect(await res.json()).toEqual({ email: "ada@example.com", remember: true });
	});

	test("bodies over bodyLimit are rejected with 413", async () => {
		const app = createServer({
			bodyLimit: 16,
			routes: [
				route({ method: "POST", path: "/echo", body: s.unknown(), handler: (ctx) => ctx.body }),
			],
		});
		const res = await app.fetch(
			new Request("http://t/echo", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text: "far more than sixteen bytes" }),
			}),
		);
		expect(res.status).toBe(413);
	});

	test("route-level bodyLimit overrides the server default", async () => {
		const app = createServer({
			bodyLimit: 16,
			routes: [
				route({
					method: "POST",
					path: "/big",
					bodyLimit: 1024,
					body: s.unknown(),
					handler: () => ({ ok: true }),
				}),
			],
		});
		const res = await app.fetch(
			new Request("http://t/big", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ text: "far more than sixteen bytes" }),
			}),
		);
		expect(res.status).toBe(200);
	});
});

describe("codecs and content negotiation", () => {
	const echo = route({
		method: "POST",
		path: "/echo",
		body: s.object({ n: s.number(), bytes: s.unknown() }),
		handler: (ctx) => ctx.body,
	});

	test("CBOR request and response when negotiated", async () => {
		const app = createServer({ routes: [echo], codecs: [cbor()] });
		const payload = { n: 7, bytes: new Uint8Array([9, 8]) };
		const res = await app.fetch(
			new Request("http://t/echo", {
				method: "POST",
				headers: { "content-type": "application/cbor", accept: "application/cbor" },
				body: cbor().encode(payload),
			}),
		);
		expect(res.headers.get("content-type")).toBe("application/cbor");
		const decoded = cbor().decode(new Uint8Array(await res.arrayBuffer())) as typeof payload;
		expect(decoded.n).toBe(7);
		expect(Array.from(decoded.bytes)).toEqual([9, 8]);
	});

	test("JSON stays the default response format", async () => {
		const app = createServer({ routes: [echo], codecs: [cbor()] });
		const res = await app.fetch(
			new Request("http://t/echo", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ n: 1, bytes: null }),
			}),
		);
		expect(res.headers.get("content-type")).toContain("application/json");
	});
});
