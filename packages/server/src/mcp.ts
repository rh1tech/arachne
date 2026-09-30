import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { type SchemaSpec, schemaFromSpec } from "@arachnejs/schema";
import { schemaSpecSchema } from "@arachnejs/schema/mcp";
import { z } from "zod";
import { createServer, openapi, route } from "./index.ts";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

/** A route described with JSON schema specs (MCP input). */
interface RouteSpec {
	method: (typeof METHODS)[number] | "*";
	path: string;
	summary?: string;
	params?: SchemaSpec;
	query?: SchemaSpec;
	body?: SchemaSpec;
	response?: SchemaSpec;
	/** Canned value the route returns (dispatch only). */
	returns?: unknown;
}

const routeSpecSchema = z.object({
	method: z.enum([...METHODS, "*"]),
	path: z.string(),
	summary: z.string().optional(),
	params: schemaSpecSchema.optional(),
	query: schemaSpecSchema.optional(),
	body: schemaSpecSchema.optional(),
	response: schemaSpecSchema.optional(),
	returns: z.unknown().optional(),
});

function toRoutes(specs: RouteSpec[]) {
	return specs.map((spec) =>
		route({
			method: spec.method,
			path: spec.path,
			...(spec.summary ? { summary: spec.summary } : {}),
			...(spec.params ? { params: schemaFromSpec(spec.params) } : {}),
			...(spec.query ? { query: schemaFromSpec(spec.query) } : {}),
			...(spec.body ? { body: schemaFromSpec(spec.body) } : {}),
			...(spec.response ? { response: { 200: schemaFromSpec(spec.response) } } : {}),
			handler: (ctx) =>
				spec.returns ?? {
					matched: spec.path,
					params: ctx.params,
					query: ctx.query,
					body: ctx.body,
				},
		}),
	);
}

/** MCP tools for designing and trying out `@arachnejs/server` routes. */
export const mcpModule = defineMcpModule({
	name: "server",
	version: "0.0.1",
	tools: [
		{
			name: toolName("server", "dispatch"),
			description:
				"Dispatch an in-memory HTTP request against routes described with SchemaSpecs. Validation behaves like a real route (422 with issue paths); matched routes echo params/query/body or return `returns`.",
			inputSchema: {
				routes: z.array(routeSpecSchema),
				method: z.enum(METHODS).default("GET"),
				path: z.string(),
				body: z.unknown().optional(),
				headers: z.record(z.string()).optional(),
			},
			handler: async (args) => {
				const server = createServer({ routes: toRoutes(args["routes"] as RouteSpec[]) });
				const method = String(args["method"] ?? "GET");
				const body = args["body"];
				const headers = new Headers((args["headers"] as Record<string, string>) ?? {});
				if (body !== undefined && !headers.has("content-type")) {
					headers.set("content-type", "application/json");
				}
				const response = await server.fetch(
					new Request(`http://mcp${String(args["path"])}`, {
						method,
						headers,
						...(body === undefined ? {} : { body: JSON.stringify(body) }),
					}),
				);
				const type = response.headers.get("content-type") ?? "";
				const payload = type.includes("json") ? await response.json() : await response.text();
				return jsonResult({ status: response.status, body: payload });
			},
		},
		{
			name: toolName("server", "openapi"),
			description:
				"Generate an OpenAPI 3.1 document from routes described with SchemaSpecs (the same generator apps use).",
			inputSchema: {
				info: z.object({
					title: z.string(),
					version: z.string(),
					description: z.string().optional(),
				}),
				routes: z.array(routeSpecSchema),
			},
			handler: (args) =>
				jsonResult(
					openapi({
						info: args["info"] as { title: string; version: string },
						routes: toRoutes(args["routes"] as RouteSpec[]),
					}),
				),
		},
		{
			name: toolName("server", "api_summary"),
			description: "Summarize @arachnejs/server public API.",
			handler: () =>
				textResult(
					[
						"route({ method, path, params?, query?, headers?, body?, response?, meta?, middleware?, handler }) — typed + validated (422)",
						"group({ prefix, tags, meta, middleware }, routes) — nest and flatten",
						"createServer({ routes, middleware, codecs, bodyLimit, validateResponses, trustProxy, onError })",
						"server.fetch(Request) for tests · server.listen(port)",
						"ctx: params/query/body typed · cookies · state · route · ip · nonce · status() · header()",
						"Bodies: JSON, multipart (s.file), urlencoded (a[b][0] keys), CBOR via @arachnejs/server/cbor",
						"Errors: throw new HttpError(status, message, { code, details }) → { error: { status, code, message } }",
						"Middleware: cors, securityHeaders (CSP nonce), rateLimit, requestId, serveStatic",
						"sse(producer) · openapi({ info, routes }) · apiDocs() → /openapi.json + /docs",
						"@arachnejs/server/client: createClient<typeof routes>() typed fetch client",
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
