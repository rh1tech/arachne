import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Adding or removing an entry file changes the app's mode (static → server
// when `app/server.ts` appears), so the dev server has to restart.
const root = join(import.meta.dir, `fixtures/entries-${Date.now().toString(36)}`);
const port = 5300 + Math.floor(Math.random() * 400);
const origin = `http://localhost:${port}`;
let child: ReturnType<typeof Bun.spawn>;

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

beforeAll(async () => {
	mkdirSync(join(root, "app"), { recursive: true });
	writeFileSync(
		join(root, "app/routes.tsx"),
		`export const routes = [{ path: "/", component: () => <h1>Pages only</h1> }];\n`,
	);
	child = Bun.spawn(
		[process.execPath, join(import.meta.dir, "../bin/arachne.ts"), "dev", "--port", String(port)],
		{ cwd: root, stdout: "ignore", stderr: "ignore" },
	);
	await until(async () => (await fetch(`${origin}/`)).ok);
}, 30_000);

afterAll(async () => {
	child.kill("SIGTERM");
	await child.exited;
	rmSync(root, { recursive: true, force: true });
});

test("creating app/server.ts restarts the dev server in server mode", async () => {
	expect((await fetch(`${origin}/api/ping`)).status).toBe(404);
	writeFileSync(
		join(root, "app/server.ts"),
		`import { defineServer } from "${join(import.meta.dir, "index.ts")}";
export default defineServer({
	routes: [{ method: "GET", path: "/api/ping", handler: () => ({ pong: true }) }],
});
`,
	);
	const body = await until(async () => {
		const res = await fetch(`${origin}/api/ping`);
		return res.ok ? ((await res.json()) as { pong: boolean }) : undefined;
	});
	expect(body).toEqual({ pong: true });
}, 30_000);

test("deleting app/server.ts restarts it without the API", async () => {
	rmSync(join(root, "app/server.ts"));
	await until(async () => (await fetch(`${origin}/api/ping`)).status === 404);
	expect(await (await fetch(`${origin}/`)).text()).toContain("Pages only");
}, 30_000);
