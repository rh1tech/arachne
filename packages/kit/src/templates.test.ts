import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { type AppServer, createAppServer, createProject } from "./index.ts";

const templates = join(import.meta.dir, "../templates");
const scratch = mkdtempSync(join(tmpdir(), "arachne-templates-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("api template", () => {
	let app: AppServer;
	const base = "http://api.test";
	let token = "";
	let otherToken = "";

	const call = (path: string, init: RequestInit & { bearer?: string } = {}) => {
		const headers = new Headers(init.headers);
		if (init.bearer) headers.set("authorization", `Bearer ${init.bearer}`);
		if (typeof init.body === "string") headers.set("content-type", "application/json");
		return app.fetch(new Request(`${base}${path}`, { ...init, headers }));
	};
	const tokenFor = async (email: string) => {
		await call("/auth/register", {
			method: "POST",
			body: JSON.stringify({ email, password: "a sturdy passphrase" }),
		});
		const login = await call("/auth/login", {
			method: "POST",
			body: JSON.stringify({ email, password: "a sturdy passphrase" }),
		});
		const cookie = login.headers.getSetCookie()[0]?.split(";")[0] ?? "";
		const created = await call("/auth/tokens", {
			method: "POST",
			headers: { cookie, origin: base },
			body: JSON.stringify({ name: "tests" }),
		});
		return ((await created.json()) as { token: string }).token;
	};

	beforeAll(async () => {
		spyOn(console, "info").mockImplementation(() => {});
		process.env["DATABASE_PATH"] = join(scratch, "api.db");
		process.env["UPLOADS_DIR"] = join(scratch, "uploads");
		process.env["BASE_URL"] = base;
		app = await createAppServer({ root: join(templates, "api") });
		token = await tokenFor("ada@example.com");
		otherToken = await tokenFor("bob@example.com");
	});
	afterAll(() => app.close());

	test("anonymous requests are refused", async () => {
		expect((await call("/v1/projects")).status).toBe(401);
		expect(await (await call("/health")).json()).toEqual({ ok: true });
	});

	test("validation, including the cross-field rule, returns issue paths", async () => {
		const res = await call("/v1/projects", {
			method: "POST",
			bearer: token,
			body: JSON.stringify({ name: "", status: "done", dueDate: "2999-01-01", budget: -5 }),
		});
		expect(res.status).toBe(422);
		const body = (await res.json()) as { error: { issues: Array<{ path: string }> } };
		expect(body.error.issues.map((issue) => issue.path).sort()).toEqual(["budget", "name"]);
		const crossField = await call("/v1/projects", {
			method: "POST",
			bearer: token,
			body: JSON.stringify({ name: "Launch", status: "done", dueDate: "2999-01-01" }),
		});
		expect(((await crossField.json()) as { error: { issues: unknown[] } }).error.issues).toEqual([
			{
				location: "body",
				path: "dueDate",
				message: "a done project can't have a due date in the future",
			},
		]);
	});

	test("create, filter, paginate, update, upload, download, isolate", async () => {
		const ids: string[] = [];
		for (const [name, status, tags] of [
			["Website", "active", ["Web", "design"]],
			["Mobile app", "planned", ["mobile"]],
			["Audit", "active", ["web"]],
		] as const) {
			const res = await call("/v1/projects", {
				method: "POST",
				bearer: token,
				body: JSON.stringify({ name, status, tags }),
			});
			expect(res.status).toBe(201);
			ids.push(((await res.json()) as { id: string }).id);
		}
		type Page = { projects: Array<{ name: string }>; total: number };
		const pageOf = async (n: number) =>
			(await (
				await call(`/v1/projects?status=active&perPage=1&page=${n}`, { bearer: token })
			).json()) as Page;
		const [first, second] = [await pageOf(1), await pageOf(2)];
		expect(first.total).toBe(2);
		expect([...first.projects, ...second.projects].map((p) => p.name).sort()).toEqual([
			"Audit",
			"Website",
		]);
		const tagged = (await (await call("/v1/projects?tag=web", { bearer: token })).json()) as {
			total: number;
		};
		expect(tagged.total).toBe(2); // tags are lower-cased on input

		const patched = await call(`/v1/projects/${ids[0]}`, {
			method: "PATCH",
			bearer: token,
			body: JSON.stringify({ budget: 1200.5 }),
		});
		expect(((await patched.json()) as { budget: number }).budget).toBe(1200.5);

		const form = new FormData();
		form.append(
			"file",
			new File(["quarterly numbers"], "../Q3 report.txt", { type: "text/plain" }),
		);
		const uploaded = await call(`/v1/projects/${ids[0]}/attachments`, {
			method: "POST",
			bearer: token,
			body: form,
		});
		expect(uploaded.status).toBe(201);
		const attachment = (await uploaded.json()) as { id: string; name: string; size: number };
		expect(attachment).toMatchObject({ name: "Q3 report.txt", size: 17 });
		const download = await call(`/v1/projects/${ids[0]}/attachments/${attachment.id}`, {
			bearer: token,
		});
		expect(await download.text()).toBe("quarterly numbers");
		expect(download.headers.get("content-disposition")).toContain('filename="Q3 report.txt"');

		const exe = new FormData();
		exe.append("file", new File(["MZ"], "tool.exe", { type: "application/x-msdownload" }));
		expect(
			(
				await call(`/v1/projects/${ids[0]}/attachments`, {
					method: "POST",
					bearer: token,
					body: exe,
				})
			).status,
		).toBe(422);

		expect((await call(`/v1/projects/${ids[0]}`, { bearer: otherToken })).status).toBe(403);
		expect(
			((await (await call("/v1/projects", { bearer: otherToken })).json()) as { total: number })
				.total,
		).toBe(0);
		expect((await call(`/v1/projects/${ids[1]}`, { method: "DELETE", bearer: token })).status).toBe(
			204,
		);
	});

	test("OpenAPI documents the API, including the multipart upload", async () => {
		const doc = (await (await call("/openapi.json")).json()) as {
			paths: Record<string, Record<string, { requestBody?: { content: Record<string, unknown> } }>>;
		};
		expect(Object.keys(doc.paths)).toContain("/v1/projects/{id}/attachments");
		expect(
			Object.keys(doc.paths["/v1/projects/{id}/attachments"]?.["post"]?.requestBody?.content ?? {}),
		).toEqual(["multipart/form-data"]);
	});

	test("MCP lists and calls tools with the API token", async () => {
		const rpc = async (body: unknown) =>
			(await (
				await call("/mcp", { method: "POST", bearer: token, body: JSON.stringify(body) })
			).json()) as {
				result: { tools?: Array<{ name: string }>; structuredContent?: { total?: number } };
			};
		const tools = await rpc({ jsonrpc: "2.0", id: 1, method: "tools/list" });
		expect(tools.result.tools?.map((t) => t.name)).toEqual(["get_v1_projects", "create_project"]);
		const listed = await rpc({
			jsonrpc: "2.0",
			id: 2,
			method: "tools/call",
			params: { name: "get_v1_projects", arguments: { query: { status: "active" } } },
		});
		expect(listed.result.structuredContent?.total).toBe(2);
	});
});

async function waitFor(url: string, timeoutMs = 15_000): Promise<Response> {
	const started = Date.now();
	for (;;) {
		try {
			return await fetch(url);
		} catch (error) {
			if (Date.now() - started > timeoutMs) throw error;
			await Bun.sleep(100);
		}
	}
}

describe("production builds run as real processes", () => {
	for (const name of ["server", "api"] as const) {
		test(`${name} template: build, start, serve`, async () => {
			const root = join(templates, name);
			const outDir = join(scratch, `dist-${name}`);
			// One build per process, like the CLI (Bun.build gets flaky after many builds in one process).
			const cli = join(import.meta.dir, "../bin/arachne.ts");
			const built = Bun.spawnSync([process.execPath, cli, "build", "--out", outDir], {
				cwd: root,
				stdout: "pipe",
				stderr: "pipe",
			});
			expect(built.stderr.toString()).toBe("");
			expect(built.exitCode).toBe(0);
			const result = { serverEntry: join(outDir, "server", "index.js") };
			expect(existsSync(result.serverEntry)).toBe(true);
			const port = 4300 + Math.floor(Math.random() * 500);
			const child = Bun.spawn([process.execPath, result.serverEntry as string], {
				cwd: scratch,
				env: {
					...process.env,
					PORT: String(port),
					DATABASE_PATH: join(scratch, `${name}-prod.db`),
					UPLOADS_DIR: join(scratch, "prod-uploads"),
				},
				stdout: "pipe",
				stderr: "pipe",
			});
			try {
				if (name === "server") {
					const home = await waitFor(`http://localhost:${port}/`);
					expect(home.status).toBe(200);
					const html = await home.text();
					expect(html).toContain("Your notes, anywhere.");
					const script = /src="(\/assets\/client-[a-z0-9]+\.js)"/.exec(html)?.[1];
					expect(
						(await fetch(`http://localhost:${port}${script}`)).headers.get("cache-control"),
					).toContain("immutable");
					expect((await fetch(`http://localhost:${port}/favicon.svg`)).status).toBe(200);
				} else {
					const health = await waitFor(`http://localhost:${port}/health`);
					expect(await health.json()).toEqual({ ok: true });
				}
			} finally {
				child.kill();
				await child.exited;
			}
		}, 60_000);
	}
});

describe("arachne create", () => {
	test("copies a template and pins workspace dependencies", async () => {
		const target = join(scratch, "My New Site");
		await createProject(target, "static");
		expect(existsSync(join(target, "app/routes.tsx"))).toBe(true);
		expect(existsSync(join(target, "node_modules"))).toBe(false);
		const pkg = JSON.parse(readFileSync(join(target, "package.json"), "utf8")) as {
			name: string;
			dependencies: Record<string, string>;
		};
		expect(pkg.name).toBe("my-new-site");
		const kit = JSON.parse(readFileSync(join(import.meta.dir, "../package.json"), "utf8")) as {
			version: string;
		};
		expect(pkg.dependencies["@arachnejs/kit"]).toBe(`^${kit.version}`);
		// npm drops .gitignore from tarballs, so templates ship it as `gitignore`.
		expect(readFileSync(join(target, ".gitignore"), "utf8")).toContain("node_modules/");
		expect(existsSync(join(target, "gitignore"))).toBe(false);
		await expect(createProject(target, "static")).rejects.toThrow("not empty");
		await expect(createProject(join(scratch, "x"), "nope" as never)).rejects.toThrow(
			"unknown template",
		);
	});
});
