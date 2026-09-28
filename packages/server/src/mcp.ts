import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { createServer, json } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "server",
	version: "0.0.1",
	tools: [
		{
			name: toolName("server", "dispatch"),
			description: "Dispatch an in-memory HTTP request against a tiny route table (no listen).",
			inputSchema: {
				routes: z.array(
					z.object({
						method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "*"]),
						path: z.string(),
						body: z.unknown().optional(),
					}),
				),
				method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"),
				path: z.string(),
			},
			handler: async (args) => {
				const routes = args["routes"] as Array<{
					method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "*";
					path: string;
					body?: unknown;
				}>;
				const method = String(args["method"] ?? "GET").toUpperCase();
				const path = String(args["path"]);
				const server = createServer({
					routes: routes.map((route) => ({
						method: route.method,
						path: route.path,
						handler: () => json({ matched: route.path, echo: route.body ?? null }),
					})),
				});
				const response = await server.fetch(new Request(`http://test${path}`, { method }));
				const contentType = response.headers.get("content-type") ?? "";
				const payload = contentType.includes("json")
					? await response.json()
					: await response.text();
				return jsonResult({
					status: response.status,
					body: payload,
				});
			},
		},
		{
			name: toolName("server", "api_summary"),
			description: "Summarize @arachne/server public API.",
			handler: () =>
				textResult(
					[
						"createServer({ routes, middleware?, fallback?, port? })",
						"server.fetch(Request) — test without listen",
						"server.listen(port?) → { port, url, stop }",
						"json / text / html response helpers",
						"Paths use @arachne/router compilePath (:param, *rest)",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-server-readme",
			uri: "arachne://server/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
