import { describe, expect, test } from "bun:test";
import { s } from "@arachne/schema";
import { createServer, group, HttpError, json, route } from "./index.ts";

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
	new Request(`http://t${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});

describe("route() validation", () => {
	const createOrder = route({
		method: "POST",
		path: "/orders/:shop",
		params: s.object({ shop: s.string({ pattern: /^[a-z]+$/ }) }),
		query: s.object({ dryRun: s.defaulted(s.coerce.boolean(), false) }),
		body: s.object({
			email: s.email(),
			items: s.array(s.object({ sku: s.string({ min: 1 }), qty: s.integer({ min: 1 }) })),
		}),
		handler: (ctx) => {
			// Typed access: these would not compile if inference broke.
			const qty: number = ctx.body.items.reduce((sum, item) => sum + item.qty, 0);
			const dryRun: boolean = ctx.query.dryRun;
			return { shop: ctx.params.shop, qty, dryRun };
		},
	});
	const app = createServer({ routes: [createOrder] });

	test("valid requests reach the handler with parsed values", async () => {
		const res = await app.fetch(
			post("/orders/acme?dryRun=true", { email: "a@b.co", items: [{ sku: "x1", qty: 2 }] }),
		);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ shop: "acme", qty: 2, dryRun: true });
	});

	test("invalid body returns 422 with issue paths", async () => {
		const res = await app.fetch(
			post("/orders/acme", { email: "nope", items: [{ sku: "", qty: 0 }] }),
		);
		expect(res.status).toBe(422);
		const body = (await res.json()) as { error: { code: string; issues: unknown[] } };
		expect(body.error.code).toBe("validation_failed");
		expect(body.error.issues).toEqual([
			{ location: "body", path: "email", message: "expected email address" },
			{ location: "body", path: "items.0.sku", message: "string length must be >= 1" },
			{ location: "body", path: "items.0.qty", message: "number must be >= 1" },
		]);
	});

	test("invalid params and query are reported by location", async () => {
		const res = await app.fetch(post("/orders/ACME?dryRun=maybe", { email: "a@b.co", items: [] }));
		const body = (await res.json()) as { error: { issues: Array<{ location: string }> } };
		expect(body.error.issues.map((issue) => issue.location)).toEqual(["params", "query"]);
	});

	test("malformed JSON is a 400", async () => {
		const res = await app.fetch(
			new Request("http://t/orders/acme", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{nope",
			}),
		);
		expect(res.status).toBe(400);
		expect(((await res.json()) as { error: { code: string } }).error.code).toBe("invalid_body");
	});

	test("unsupported content type is a 415", async () => {
		const res = await app.fetch(
			new Request("http://t/orders/acme", {
				method: "POST",
				headers: { "content-type": "application/xml" },
				body: "<order/>",
			}),
		);
		expect(res.status).toBe(415);
	});
});

describe("handler results", () => {
	test("plain values are serialised; status can be set on ctx", async () => {
		const app = createServer({
			routes: [
				route({
					method: "POST",
					path: "/things",
					handler: (ctx) => {
						ctx.status(201);
						ctx.header("location", "/things/1");
						return { id: 1 };
					},
				}),
				route({ method: "DELETE", path: "/things/:id", handler: () => undefined }),
			],
		});
		const created = await app.fetch(new Request("http://t/things", { method: "POST" }));
		expect(created.status).toBe(201);
		expect(created.headers.get("location")).toBe("/things/1");
		const deleted = await app.fetch(new Request("http://t/things/1", { method: "DELETE" }));
		expect(deleted.status).toBe(204);
	});

	test("response schemas are enforced when validateResponses is on", async () => {
		const app = createServer({
			validateResponses: true,
			routes: [
				route({
					method: "GET",
					path: "/me",
					response: { 200: s.object({ id: s.string() }) },
					handler: () => ({ id: 42 }) as unknown as { id: string },
				}),
			],
		});
		const res = await app.fetch(new Request("http://t/me"));
		expect(res.status).toBe(500);
		expect(((await res.json()) as { error: { code: string } }).error.code).toBe("invalid_response");
	});
});

describe("errors", () => {
	test("HttpError maps to the error envelope", async () => {
		const app = createServer({
			routes: [
				route({
					method: "GET",
					path: "/teapot",
					handler: () => {
						throw new HttpError(418, "I'm a teapot", { code: "teapot", details: { brew: false } });
					},
				}),
			],
		});
		const res = await app.fetch(new Request("http://t/teapot"));
		expect(res.status).toBe(418);
		expect(await res.json()).toEqual({
			error: { status: 418, code: "teapot", message: "I'm a teapot", details: { brew: false } },
		});
	});

	test("unexpected errors are 500 without leaking the message", async () => {
		const logged: unknown[] = [];
		const app = createServer({
			onError: (error) => {
				logged.push(error);
			},
			routes: [
				route({
					method: "GET",
					path: "/boom",
					handler: () => {
						throw new Error("db password is hunter2");
					},
				}),
			],
		});
		const res = await app.fetch(new Request("http://t/boom"));
		expect(res.status).toBe(500);
		expect(await res.text()).not.toContain("hunter2");
		expect(logged).toHaveLength(1);
	});

	test("405 with Allow when the path exists for another method; HEAD uses GET", async () => {
		const app = createServer({
			routes: [route({ method: "GET", path: "/items", handler: () => json({ ok: true }) })],
		});
		const res = await app.fetch(new Request("http://t/items", { method: "PUT" }));
		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toBe("GET, HEAD");
		const head = await app.fetch(new Request("http://t/items", { method: "HEAD" }));
		expect(head.status).toBe(200);
		expect(await head.text()).toBe("");
	});

	test("404 uses the error envelope for JSON clients", async () => {
		const app = createServer({ routes: [] });
		const res = await app.fetch(
			new Request("http://t/nope", { headers: { accept: "application/json" } }),
		);
		expect(res.status).toBe(404);
		expect(((await res.json()) as { error: { code: string } }).error.code).toBe("not_found");
	});
});

describe("groups", () => {
	test("prefix, middleware, tags and meta apply to every child", async () => {
		const seen: string[] = [];
		const routes = group(
			{
				prefix: "/api/v1",
				tags: ["v1"],
				meta: { area: "public" },
				middleware: [
					(ctx, next) => {
						seen.push(`${ctx.route?.path}:${String(ctx.route?.meta["area"])}`);
						return next();
					},
				],
			},
			[
				route({ method: "GET", path: "/users", handler: () => [] }),
				group({ prefix: "/admin", meta: { area: "admin" } }, [
					route({ method: "GET", path: "/stats", handler: () => ({}) }),
				]),
			],
		);
		expect(routes.map((r) => r.path)).toEqual(["/api/v1/users", "/api/v1/admin/stats"]);
		expect(routes[1]?.tags).toEqual(["v1"]);
		const app = createServer({ routes });
		await app.fetch(new Request("http://t/api/v1/users"));
		await app.fetch(new Request("http://t/api/v1/admin/stats"));
		expect(seen).toEqual(["/api/v1/users:public", "/api/v1/admin/stats:admin"]);
	});
});

describe("legacy route objects", () => {
	test("{ method, path, handler } still works", async () => {
		const app = createServer({
			routes: [{ method: "GET", path: "/a/:id", handler: (ctx) => json({ id: ctx.params["id"] }) }],
		});
		expect(await (await app.fetch(new Request("http://t/a/1"))).json()).toEqual({ id: "1" });
	});
});
