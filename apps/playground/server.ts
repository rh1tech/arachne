import { join } from "node:path";
import { createServer, html } from "@arachne/server";
import { bunPlugin } from "@arachne/vite";

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
			handler: () => Response.json({ ok: true, package: "@arachne/server" }),
		},
	],
	fallback: async () => {
		const body = await Bun.file(join(root, "index.html")).text();
		return html(body);
	},
});

const { url } = app.listen();
console.log(`Arachne playground → ${url}`);
