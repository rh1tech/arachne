import { join } from "node:path";

const root = import.meta.dir;
const port = Number(process.env["PORT"] ?? 3920);

async function bundleClient(): Promise<Uint8Array> {
	const result = await Bun.build({
		entrypoints: [join(root, "client.ts")],
		target: "browser",
		format: "esm",
		minify: false,
		sourcemap: "inline",
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

const server = Bun.serve({
	port,
	async fetch(req) {
		const url = new URL(req.url);

		if (url.pathname === "/" || url.pathname === "/index.html") {
			return new Response(Bun.file(join(root, "index.html")), {
				headers: { "content-type": "text/html; charset=utf-8" },
			});
		}

		if (url.pathname === "/styles.css") {
			return new Response(Bun.file(join(root, "styles.css")), {
				headers: { "content-type": "text/css; charset=utf-8" },
			});
		}

		if (url.pathname === "/client.js") {
			if (url.searchParams.has("rebuild")) {
				clientJs = await bundleClient();
			}
			return new Response(clientJs, {
				headers: {
					"content-type": "application/javascript; charset=utf-8",
					"cache-control": "no-store",
				},
			});
		}

		return new Response("Not found", { status: 404 });
	},
});

console.log(`Arachne playground → http://localhost:${server.port}`);
