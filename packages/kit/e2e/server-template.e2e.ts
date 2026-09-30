/**
 * The full-stack template in a real browser: sign-up, email confirmation,
 * sign-in, notes CRUD through the typed client, sign-out, protected pages,
 * API docs and the MCP endpoint.
 */
import { afterAll, beforeAll, expect, spyOn, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type Browser, chromium } from "playwright";
import { type AppServer, createAppServer } from "../src/index.ts";

const root = join(import.meta.dir, "../templates/server");
const dataDir = mkdtempSync(join(tmpdir(), "arachne-notebook-"));
let browser: Browser;
let app: AppServer;
let origin: string;
const mails: string[] = [];

beforeAll(async () => {
	process.env["DATABASE_PATH"] = join(dataDir, "app.db");
	process.env["AUTH_SECRET"] = "an-e2e-secret-that-is-long-enough-123";
	spyOn(console, "info").mockImplementation((...args: unknown[]) => {
		mails.push(args.map(String).join(" "));
	});
	app = await createAppServer({ root });
	const port = 3600 + Math.floor(Math.random() * 300);
	process.env["BASE_URL"] = `http://localhost:${port}`;
	// BASE_URL is read at boot: recreate now that we know the port.
	await app.close();
	app = await createAppServer({ root });
	origin = app.listen(port).url;
	browser = await chromium.launch();
});

afterAll(async () => {
	await browser?.close();
	await app?.close();
	rmSync(dataDir, { recursive: true, force: true });
});

test("sign up, confirm, sign in, manage notes, sign out", async () => {
	const page = await browser.newPage();
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));

	await page.goto(`${origin}/register`);
	await page.fill("input[name=name]", "Ada Lovelace");
	await page.fill("input[name=email]", "ada@example.com");
	await page.fill("input[name=password]", "analytical engine 1843");
	await page.click("button[type=submit]");
	await page.waitForSelector("text=Check your email");

	const link = mails.join("\n").match(/https?:\/\/\S+\/verify-email\?token=\S+/)?.[0];
	expect(link).toBeDefined();
	await page.goto(link as string);
	await expect(page.textContent("main h1")).resolves.toBe("Email confirmed");

	await page.click("main >> text=Sign in");
	await page.waitForURL(`${origin}/login`);
	await page.fill("input[name=email]", "ada@example.com");
	await page.fill("input[name=password]", "analytical engine 1843");
	await page.click("button[type=submit]");
	await page.waitForURL(`${origin}/notes`);
	await expect(page.textContent(".who")).resolves.toBe("ada@example.com");
	await expect(page.textContent(".empty")).resolves.toContain("No notes yet");

	await page.fill("input[name=title]", "Groceries");
	await page.fill("textarea[name=body]", "Flour, eggs, butter");
	await page.click("text=Add note");
	await page.waitForSelector(".list >> text=Groceries");
	await expect(page.textContent(".list p")).resolves.toBe("Flour, eggs, butter");

	await page.click("button[aria-label='Delete Groceries']");
	await page.waitForSelector(".empty");

	await page.click("text=Sign out");
	await page.waitForURL(`${origin}/`);
	await page.waitForSelector("nav >> text=Sign in");
	const protectedPage = await page.goto(`${origin}/notes`);
	expect(protectedPage?.status()).toBe(401);
	await expect(page.textContent("main h1")).resolves.toBe("Please sign in");
	if (errors.length) console.error("PAGE ERRORS", JSON.stringify(errors));
	expect(errors).toEqual([]);
	await page.close();
}, 60_000);

test("wrong passwords show the server's message", async () => {
	const page = await browser.newPage();
	await page.goto(`${origin}/login`);
	await page.fill("input[name=email]", "ada@example.com");
	await page.fill("input[name=password]", "not the password at all");
	await page.click("button[type=submit]");
	await expect(page.textContent("[role=alert]")).resolves.toBe("Invalid email or password");
	await page.close();
}, 30_000);

test("API docs and MCP tools with an API token", async () => {
	const doc = (await (await fetch(`${origin}/openapi.json`)).json()) as {
		paths: Record<string, unknown>;
	};
	expect(Object.keys(doc.paths)).toContain("/api/notes");
	expect((await fetch(`${origin}/docs`)).status).toBe(200);

	const login = await fetch(`${origin}/auth/login`, {
		method: "POST",
		headers: { "content-type": "application/json", origin },
		body: JSON.stringify({ email: "ada@example.com", password: "analytical engine 1843" }),
	});
	const cookie = login.headers.getSetCookie()[0]?.split(";")[0] ?? "";
	const created = (await (
		await fetch(`${origin}/auth/tokens`, {
			method: "POST",
			headers: { "content-type": "application/json", origin, cookie },
			body: JSON.stringify({ name: "agent" }),
		})
	).json()) as { token: string };

	const rpc = async (body: unknown) =>
		(await (
			await fetch(`${origin}/mcp`, {
				method: "POST",
				headers: { "content-type": "application/json", authorization: `Bearer ${created.token}` },
				body: JSON.stringify(body),
			})
		).json()) as {
			result: { tools?: Array<{ name: string }>; structuredContent?: { note?: { title: string } } };
		};
	const tools = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
	expect(tools.result.tools?.map((t) => t.name)).toEqual(["get_api_notes", "create_note"]);
	const call = await rpc({
		jsonrpc: "2.0",
		id: 2,
		method: "tools/call",
		params: { name: "create_note", arguments: { body: { title: "From an agent" } } },
	});
	expect(call.result.structuredContent?.note?.title).toBe("From an agent");
}, 30_000);
