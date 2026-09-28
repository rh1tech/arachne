#!/usr/bin/env bun
import { createArachneMcpServer, loadMcpModules, runHttp, runStdio } from "../src/index.ts";

function parseArgs(argv: string[]): {
	modules?: string[];
	http: boolean;
	port: number;
} {
	let modules: string[] | undefined;
	let http = false;
	let port = 3921;
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--modules" && argv[i + 1]) {
			modules = argv[i + 1]
				?.split(",")
				.map((s) => s.trim())
				.filter(Boolean);
			i += 1;
		} else if (arg === "--http") {
			http = true;
		} else if (arg === "--port" && argv[i + 1]) {
			port = Number(argv[i + 1]);
			i += 1;
		}
	}
	return { ...(modules ? { modules } : {}), http, port };
}

const args = parseArgs(process.argv.slice(2));
const modules = await loadMcpModules(args.modules);
if (modules.length === 0) {
	console.error("arachne-mcp: no MCP modules loaded");
	process.exit(1);
}

const server = createArachneMcpServer({
	name: "arachne",
	version: "0.0.1",
	modules,
});

if (args.http) {
	const { port } = await runHttp(server, { port: args.port });
	console.error(`arachne-mcp listening on http://127.0.0.1:${port}/mcp`);
} else {
	await runStdio(server);
}
