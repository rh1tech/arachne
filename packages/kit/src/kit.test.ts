import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	type AppServer,
	createAppServer,
	renderDocument,
	resolveConfig,
	serializeJson,
} from "./index.ts";

const root = join(import.meta.dir, "fixtures/notes");

describe("resolveConfig", () => {
	test("reads arachne.config.ts and fills defaults", async () => {
		const config = await resolveConfig(root);
		expect(config.mode).toBe("server"); // app/server.ts exists
		expect(config.base).toBe("/");
		expect(config.titleTemplate).toBe("%s · Notes");
		expect(config.routesFile).toBe(join(root, "app/routes.tsx"));
		expect(config.serverFile).toBe(join(root, "app/server.ts"));
		expect(config.styles).toEqual([join(root, "app/styles.css")]);
		expect(config.hydrate).toBe(true);
	});

	test("overrides win and base is normalised", async () => {
		const config = await resolveConfig(root, { mode: "static", base: "docs" });
		expect(config.mode).toBe("static");
		expect(config.base).toBe("/docs/");
	});
});

describe("renderDocument", () => {
	test("escapes boot data so it can't close the script tag", () => {
		expect(serializeJson({ html: "</script><script>alert(1)</script>" })).toBe(
			'{"html":"\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e"}',
		);
		const html = renderDocument({
			lang: "en",
			head: "<title>T</title>",
			styles: ["/assets/app.css"],
			scripts: ["/assets/client.js"],
			boot: { data: null },
			body: "<main>hi</main>",
			nonce: "abc",
		});
		expect(html).toStartWith("<!doctype html>");
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<link rel="stylesheet" href="/assets/app.css">');
		expect(html).toContain('<script type="module" src="/assets/client.js" nonce="abc"></script>');
		expect(html).toContain('<script type="application/json" id="__arachne">{"data":null}</script>');
		expect(html).toContain('<div id="app"><main>hi</main></div>');
	});
});

describe("server mode", () => {
	let app: AppServer;
	beforeAll(async () => {
		app = await createAppServer({ root, dev: false });
	});
	afterAll(async () => {
		await app.close();
	});

	test("server-renders pages with layout, head, boot data and assets", async () => {
		const res = await app.fetch(new Request("http://notes.test/"));
		expect(res.status).toBe(200);
		expect(res.headers.get("content-type")).toContain("text/html");
		const html = await res.text();
		expect(html).toContain("<title>Home · Notes</title>");
		expect(html).toContain("Welcome to Notes");
		expect(html).toContain('aria-current="page"');
		expect(html).toMatch(/<script type="module" src="\/assets\/client-[a-z0-9]+\.js"/);
		expect(html).toMatch(/<link rel="stylesheet" href="\/assets\/styles-[a-z0-9]+\.css">/);
		expect(html).toContain('data-hk="');
	});

	test("loader data renders on the server and is embedded (escaped) for hydration", async () => {
		const html = await (await app.fetch(new Request("http://notes.test/notes/1"))).text();
		expect(html).toContain("<title>First &lt;note&gt; · Notes</title>");
		expect(html).toContain("<h1>First &lt;note&gt;</h1>");
		expect(html).toContain('"title":"First \\u003cnote\\u003e"');
	});

	test("loader HttpErrors set the status; unknown pages are 404 with the fallback", async () => {
		const missing = await app.fetch(new Request("http://notes.test/notes/99"));
		expect(missing.status).toBe(404);
		const unknown = await app.fetch(new Request("http://notes.test/nope"));
		expect(unknown.status).toBe(404);
		expect(await unknown.text()).toContain("Nothing here");
	});

	test("client navigations fetch loader data as JSON", async () => {
		const res = await app.fetch(new Request("http://notes.test/__arachne/data/notes/2"));
		const body = (await res.json()) as { data: unknown; build: string };
		expect(body.data).toEqual({ id: "2", title: "Second note", body: "Another one." });
		// The build the data belongs to: the client reloads when it isn't its own.
		const page = await (await app.fetch(new Request("http://notes.test/notes/2"))).text();
		expect(body.build).toMatch(/^[a-z0-9]+$/);
		expect(page).toContain(`"build":"${body.build}"`);
		expect((await app.fetch(new Request("http://notes.test/__arachne/data/nope"))).status).toBe(
			404,
		);
	});

	test("API routes, built assets and public files are served", async () => {
		expect(
			await (await app.fetch(new Request("http://notes.test/api/notes?limit=1"))).json(),
		).toEqual({
			notes: [{ id: "1", title: "First <note>", body: "Hello from the server." }],
		});
		const html = await (await app.fetch(new Request("http://notes.test/"))).text();
		const script = /src="(\/assets\/client-[a-z0-9]+\.js)"/.exec(html)?.[1] ?? "";
		const js = await app.fetch(new Request(`http://notes.test${script}`));
		expect(js.status).toBe(200);
		expect(js.headers.get("cache-control")).toContain("immutable");
		expect(await (await app.fetch(new Request("http://notes.test/robots.txt"))).text()).toContain(
			"User-agent",
		);
	});

	test("security headers are on by default", async () => {
		const res = await app.fetch(new Request("http://notes.test/about"));
		expect(res.headers.get("content-security-policy")).toContain("script-src 'self'");
		expect(res.headers.get("x-content-type-options")).toBe("nosniff");
	});
});
