import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	cors,
	createServer,
	memoryRateLimitStore,
	rateLimit,
	requestId,
	route,
	securityHeaders,
	serveStatic,
	sse,
} from "./index.ts";

const ok = route({ method: "GET", path: "/x", handler: () => ({ ok: true }) });

describe("cookies", () => {
	test("reads request cookies and writes Set-Cookie", async () => {
		const app = createServer({
			routes: [
				route({
					method: "GET",
					path: "/c",
					handler: (ctx) => {
						ctx.cookies.set("sid", "abc 123", { httpOnly: true, maxAge: 60, sameSite: "lax" });
						ctx.cookies.delete("old");
						return { theme: ctx.cookies.get("theme") ?? null };
					},
				}),
			],
		});
		const res = await app.fetch(
			new Request("http://t/c", { headers: { cookie: "theme=dark; a=b" } }),
		);
		expect(await res.json()).toEqual({ theme: "dark" });
		const cookies = res.headers.getSetCookie();
		expect(cookies).toContain("sid=abc%20123; Max-Age=60; Path=/; HttpOnly; SameSite=Lax");
		expect(cookies.some((c) => c.startsWith("old=; Max-Age=0"))).toBe(true);
	});
});

describe("cors", () => {
	const app = createServer({
		middleware: [cors({ origin: ["https://app.example"], credentials: true, maxAge: 600 })],
		routes: [ok],
	});

	test("preflight answers allowed origins", async () => {
		const res = await app.fetch(
			new Request("http://t/x", {
				method: "OPTIONS",
				headers: {
					origin: "https://app.example",
					"access-control-request-method": "POST",
					"access-control-request-headers": "content-type",
				},
			}),
		);
		expect(res.status).toBe(204);
		expect(res.headers.get("access-control-allow-origin")).toBe("https://app.example");
		expect(res.headers.get("access-control-allow-credentials")).toBe("true");
		expect(res.headers.get("access-control-allow-headers")).toBe("content-type");
		expect(res.headers.get("access-control-max-age")).toBe("600");
		expect(res.headers.get("vary")).toContain("Origin");
	});

	test("unknown origins get no CORS headers", async () => {
		const res = await app.fetch(
			new Request("http://t/x", { headers: { origin: "https://evil.example" } }),
		);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});
});

describe("securityHeaders", () => {
	test("sets hardening headers and a per-request CSP nonce", async () => {
		const app = createServer({
			middleware: [securityHeaders()],
			routes: [route({ method: "GET", path: "/n", handler: (ctx) => ({ nonce: ctx.nonce }) })],
		});
		const a = await app.fetch(new Request("http://t/n"));
		const b = await app.fetch(new Request("http://t/n"));
		const nonceA = ((await a.json()) as { nonce: string }).nonce;
		const nonceB = ((await b.json()) as { nonce: string }).nonce;
		expect(nonceA).toMatch(/^[A-Za-z0-9+/=]{16,}$/);
		expect(nonceA).not.toBe(nonceB);
		expect(a.headers.get("content-security-policy")).toContain(`'nonce-${nonceA}'`);
		expect(a.headers.get("x-content-type-options")).toBe("nosniff");
		expect(a.headers.get("x-frame-options")).toBe("DENY");
		expect(a.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
		expect(a.headers.get("strict-transport-security")).toContain("max-age=");
	});
});

describe("rateLimit", () => {
	test("limits per key and reports standard headers", async () => {
		let now = 0;
		const app = createServer({
			middleware: [
				rateLimit({
					windowMs: 1000,
					max: 2,
					key: (ctx) => ctx.request.headers.get("x-user") ?? "anon",
					store: memoryRateLimitStore({ now: () => now }),
				}),
			],
			routes: [ok],
		});
		const hit = (user: string) =>
			app.fetch(new Request("http://t/x", { headers: { "x-user": user } }));
		expect((await hit("a")).status).toBe(200);
		const second = await hit("a");
		expect(second.headers.get("ratelimit-remaining")).toBe("0");
		const third = await hit("a");
		expect(third.status).toBe(429);
		expect(third.headers.get("retry-after")).toBe("1");
		expect((await hit("b")).status).toBe(200);
		now = 1001;
		expect((await hit("a")).status).toBe(200);
	});
});

describe("requestId", () => {
	test("echoes a valid incoming id or creates one", async () => {
		const app = createServer({
			middleware: [requestId()],
			routes: [route({ method: "GET", path: "/id", handler: (ctx) => ({ id: ctx.requestId }) })],
		});
		const given = await app.fetch(
			new Request("http://t/id", { headers: { "x-request-id": "abc-123" } }),
		);
		expect(given.headers.get("x-request-id")).toBe("abc-123");
		const made = await app.fetch(new Request("http://t/id"));
		expect(((await made.json()) as { id: string }).id).toMatch(/^[0-9a-f-]{36}$/);
	});
});

describe("serveStatic", () => {
	const dir = join(tmpdir(), `arachne-static-${Date.now()}`);
	beforeAll(() => {
		mkdirSync(join(dir, "docs"), { recursive: true });
		writeFileSync(join(dir, "app.js"), "console.log(1)");
		writeFileSync(join(dir, "docs/index.html"), "<h1>docs</h1>");
		writeFileSync(join(tmpdir(), "secret.txt"), "top secret");
	});
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	test("serves files with type, etag and cache headers; directories use index.html", async () => {
		const app = createServer({ middleware: [serveStatic({ root: dir, maxAge: 60 })], routes: [] });
		const js = await app.fetch(new Request("http://t/app.js"));
		expect(js.status).toBe(200);
		expect(js.headers.get("content-type")).toContain("javascript");
		expect(js.headers.get("cache-control")).toBe("public, max-age=60");
		const etag = js.headers.get("etag") ?? "";
		const cached = await app.fetch(
			new Request("http://t/app.js", { headers: { "if-none-match": etag } }),
		);
		expect(cached.status).toBe(304);
		expect(await (await app.fetch(new Request("http://t/docs"))).text()).toBe("<h1>docs</h1>");
	});

	test("never escapes the root", async () => {
		const app = createServer({ middleware: [serveStatic({ root: dir })], routes: [] });
		for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/docs/..%2f..%2fsecret.txt"]) {
			const res = await app.fetch(new Request(`http://t${path}`));
			expect(await res.text()).not.toContain("top secret");
		}
	});

	test("falls through to routes when no file matches", async () => {
		const app = createServer({ middleware: [serveStatic({ root: dir })], routes: [ok] });
		expect((await app.fetch(new Request("http://t/x"))).status).toBe(200);
	});
});

describe("sse", () => {
	test("streams events in text/event-stream format", async () => {
		const app = createServer({
			routes: [
				route({
					method: "GET",
					path: "/events",
					handler: () =>
						sse(async (send) => {
							send({ event: "tick", data: { n: 1 } });
							send({ data: "plain", id: "2" });
						}),
				}),
			],
		});
		const res = await app.fetch(new Request("http://t/events"));
		expect(res.headers.get("content-type")).toBe("text/event-stream");
		expect(await res.text()).toBe('event: tick\ndata: {"n":1}\n\nid: 2\ndata: plain\n\n');
	});
});
