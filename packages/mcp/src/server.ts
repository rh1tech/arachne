import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ArachneMcpModule } from "./module.ts";
import { applyModule } from "./module.ts";

export interface CreateServerOptions {
	name?: string;
	version?: string;
	modules: ArachneMcpModule[];
}

export function createArachneMcpServer(options: CreateServerOptions): McpServer {
	const server = new McpServer({
		name: options.name ?? "arachne",
		version: options.version ?? "0.0.1",
	});

	const seen = new Set<string>();
	for (const mod of options.modules) {
		if (seen.has(mod.name)) {
			throw new Error(`Duplicate MCP module: ${mod.name}`);
		}
		seen.add(mod.name);
		applyModule(server, mod);
	}

	return server;
}

export async function runStdio(server: McpServer): Promise<void> {
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

export async function runHttp(
	server: McpServer,
	options: { port?: number; host?: string } = {},
): Promise<{ port: number; stop: () => Promise<void> }> {
	const { WebStandardStreamableHTTPServerTransport } = await import(
		"@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
	);
	const port = options.port ?? 3921;
	const host = options.host ?? "127.0.0.1";

	const transport = new WebStandardStreamableHTTPServerTransport({});
	await server.connect(transport);

	const httpServer = Bun.serve({
		port,
		hostname: host,
		async fetch(req) {
			const url = new URL(req.url);
			if (url.pathname !== "/mcp") {
				return new Response("Not Found", { status: 404 });
			}
			return transport.handleRequest(req);
		},
	});

	return {
		port: httpServer.port ?? port,
		stop: async () => {
			httpServer.stop(true);
			await server.close();
		},
	};
}
