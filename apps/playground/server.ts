import { join } from "node:path";
import { createServer, html, json } from "@arachne/server";
import { bunPlugin } from "@arachne/vite";
import { db, notes } from "./db.ts";

const root = import.meta.dir;
const port = Number(process.env["PORT"] ?? 3920);

async function bundleClient(): Promise<Uint8Array> {
	const result = await Bun.build({
		entrypoints: [join(root, "client.tsx")],
		target: "browser",
		format: "esm",
		minify: false,
		sourcemap: "inline",
		plugins: [bunPlugin({ hydratable: false })],
	});
	if (!result.success) {
		const message = result.logs.map(String).join("\n");
		throw new Error(`playground bundle failed:\n${message}`);
	}
	const artifact = result.outputs[0];
	if (!artifact) throw new Error("playground bundle produced no output");
	return new Uint8Array(await artifact.arrayBuffer());
}

let clientJs = await bundleClient();

const app = createServer({
	port,
	routes: [
		{
			method: "GET",
			path: "/styles.css",
			handler: () =>
				new Response(Bun.file(join(root, "styles.css")), {
					headers: { "content-type": "text/css; charset=utf-8" },
				}),
		},
		{
			method: "GET",
			path: "/client.js",
			handler: async (ctx) => {
				if (ctx.query.has("rebuild")) clientJs = await bundleClient();
				return new Response(clientJs, {
					headers: {
						"content-type": "application/javascript; charset=utf-8",
						"cache-control": "no-store",
					},
				});
			},
		},
		{
			method: "GET",
			path: "/api/health",
			handler: () => json({ ok: true, package: "@arachne/server" }),
		},
		{
			method: "GET",
			path: "/api/notes",
			handler: async () => json({ notes: await db.select(notes).all() }),
		},
		{
			method: "POST",
			path: "/api/notes",
			handler: async (ctx) => {
				const body = await ctx.json<{ body?: string }>();
				const text = body.body?.trim();
				if (!text) return json({ error: "body required" }, { status: 400 });
				const row = await db.insert(notes).values({
					id: crypto.randomUUID(),
					body: text,
					createdAt: new Date().toISOString(),
				});
				return json({ note: row }, { status: 201 });
			},
		},
		{
			method: "DELETE",
			path: "/api/notes/:id",
			handler: async (ctx) => {
				const id = ctx.params["id"];
				if (!id) return json({ error: "missing id" }, { status: 400 });
				await db.delete(notes).where({ id }).run();
				return json({ ok: true });
			},
		},
	],
	fallback: async () => {
		const body = await Bun.file(join(root, "index.html")).text();
		return html(body);
	},
});

const { url } = app.listen();
console.log(`Arachne playground → ${url}`);
