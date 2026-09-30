import { afterAll, beforeAll, expect, test } from "bun:test";
import { cpSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Same depth as fixtures/notes, so its relative imports keep working.
const root = join(import.meta.dir, `fixtures/dev-${Date.now().toString(36)}`);
const port = 4900 + Math.floor(Math.random() * 400);
const origin = `http://localhost:${port}`;
let child: ReturnType<typeof Bun.spawn>;
const messages: Array<{ type: string; styles?: string[] }> = [];
let socket: WebSocket | undefined;

const edit = (file: string, from: string, to: string) => {
	const path = join(root, file);
	writeFileSync(path, readFileSync(path, "utf8").replace(from, to));
};

async function until<T>(check: () => T | Promise<T>, timeoutMs = 20_000): Promise<NonNullable<T>> {
	const started = Date.now();
	for (;;) {
		try {
			const value = await check();
			if (value) return value as NonNullable<T>;
		} catch {
			// not ready yet
		}
		if (Date.now() - started > timeoutMs) throw new Error("timed out");
		await Bun.sleep(100);
	}
}

const connect = () =>
	new Promise<void>((resolve) => {
		socket = new WebSocket(`ws://localhost:${port}/__arachne/hmr`);
		socket.onopen = () => resolve();
		socket.onmessage = (event) => messages.push(JSON.parse(String(event.data)));
	});
const page = async () => (await fetch(`${origin}/`)).text();

beforeAll(async () => {
	cpSync(join(import.meta.dir, "fixtures/notes"), root, {
		recursive: true,
		filter: (path) => !/[\\/](\.arachne|dist[^\\/]*)([\\/]|$)/.test(path),
	});
	child = Bun.spawn(
		[process.execPath, join(import.meta.dir, "../bin/arachne.ts"), "dev", "--port", String(port)],
		{
			cwd: root,
			stdout: "ignore",
			stderr: "ignore",
		},
	);
	await until(async () => (await fetch(`${origin}/`)).ok);
	await connect();
}, 30_000);

afterAll(async () => {
	socket?.close();
	child.kill("SIGTERM");
	await child.exited;
	rmSync(root, { recursive: true, force: true });
});

test("pages include the reload client", async () => {
	expect(await page()).toContain("__arachne/hmr");
});

test("editing a component rebuilds and tells browsers to reload", async () => {
	edit("app/routes.tsx", "Welcome to Notes", "Welcome back");
	await until(() => messages.some((m) => m.type === "reload"));
	expect(await page()).toContain("Welcome back");
}, 30_000);

test("editing CSS swaps stylesheets without a reload", async () => {
	messages.length = 0;
	edit("app/styles.css", "--accent: oklch(60% 0.2 250);", "--accent: oklch(55% 0.25 30);");
	const css = await until(() => messages.find((m) => m.type === "css"));
	expect(css.styles?.[0]).toMatch(/\/assets\/styles-[a-z0-9]+\.css$/);
	const text = await (await fetch(`${origin}${css.styles?.[0]}`)).text();
	expect(text).toContain("oklch(55% .25 30)");
}, 30_000);

test("a syntax error is reported to the browser, and fixing it recovers", async () => {
	messages.length = 0;
	edit("app/routes.tsx", "function About() {", "function About() {{{");
	await until(() => messages.some((m) => m.type === "error"));
	edit("app/routes.tsx", "function About() {{{", "function About() {");
	await until(() => messages.some((m) => m.type === "reload"));
	expect(await page()).toContain("Welcome back");
}, 30_000);

test("editing the server restarts it with the new code", async () => {
	edit("app/server.ts", "Second note", "Second note, edited");
	await until(async () => {
		const res = await fetch(`${origin}/api/notes`);
		const body = (await res.json()) as { notes: Array<{ title: string }> };
		return body.notes.some((n) => n.title === "Second note, edited");
	});
}, 30_000);
