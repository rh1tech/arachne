import { describe, expect, test } from "bun:test";
import { createServer, html, json, text } from "../src/index.ts";

describe("createServer", () => {
	test("matches method and params", async () => {
		const app = createServer({
			routes: [
				{
					method: "GET",
					path: "/api/users/:id",
					handler: (ctx) => json({ id: ctx.params["id"] }),
				},
			],
		});
		const res = await app.fetch(new Request("http://t/api/users/9"));
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ id: "9" });
	});

	test("fallback 404", async () => {
		const app = createServer({ routes: [] });
		const res = await app.fetch(new Request("http://t/missing"));
		expect(res.status).toBe(404);
	});

	test("middleware runs around handler", async () => {
		const seen: string[] = [];
		const app = createServer({
			middleware: [
				async (_ctx, next) => {
					seen.push("before");
					const res = await next();
					seen.push("after");
					return res;
				},
			],
			routes: [
				{
					method: "GET",
					path: "/x",
					handler: () => {
						seen.push("handler");
						return text("ok");
					},
				},
			],
		});
		const res = await app.fetch(new Request("http://t/x"));
		expect(await res.text()).toBe("ok");
		expect(seen).toEqual(["before", "handler", "after"]);
	});

	test("wildcard method", async () => {
		const app = createServer({
			routes: [{ method: "*", path: "/any", handler: (ctx) => text(ctx.request.method) }],
		});
		const res = await app.fetch(new Request("http://t/any", { method: "PUT" }));
		expect(await res.text()).toBe("PUT");
	});

	test("html helper", async () => {
		const app = createServer({
			fallback: () => html("<h1>hi</h1>"),
		});
		const res = await app.fetch(new Request("http://t/"));
		expect(res.headers.get("content-type")).toContain("text/html");
		expect(await res.text()).toBe("<h1>hi</h1>");
	});
});
