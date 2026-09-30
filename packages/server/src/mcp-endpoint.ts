import { compilePath } from "@arachne/router/path";
import { type JsonSchema, toJSONSchema } from "@arachne/schema";
import { json } from "./context.ts";
import { type AnyRoute, route } from "./route.ts";

/** Options for {@link mcpRoute}. */
export interface McpRouteOptions {
	/** Endpoint path. Default `/mcp`. */
	path?: string;
	/** Server name reported to clients. */
	name: string;
	/** Server version reported to clients. */
	version: string;
	/** Routes to consider; those with `mcp` set become tools. */
	routes: readonly AnyRoute[];
	/** Sends a request through the app (usually `(req) => server.fetch(req)`), so middleware and guards apply. */
	dispatch: (request: Request) => Promise<Response>;
	/** Extra origins allowed to call the endpoint from browsers. */
	allowedOrigins?: readonly string[];
}

/** A tool generated from a route. */
export interface RouteTool {
	/** Tool name. */
	name: string;
	/** Tool description. */
	description: string;
	/** JSON Schema of `{ params?, query?, body? }`. */
	inputSchema: JsonSchema;
	/** The route it calls. */
	route: AnyRoute;
}

const PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

function toolName(r: AnyRoute): string {
	const custom = typeof r.mcp === "object" ? r.mcp.name : undefined;
	const raw =
		custom ??
		r.operationId ??
		`${r.method.toLowerCase()}_${r.path
			.split("/")
			.filter(Boolean)
			.map((segment) => segment.replace(/^[:*]/, ""))
			.join("_")}`;
	return raw.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 64);
}

function pathParamsSchema(path: string): JsonSchema | undefined {
	const names = [...path.matchAll(/[:*]([A-Za-z0-9_]*)/g)].map((m) => m[1] || "rest");
	if (names.length === 0) return undefined;
	return {
		type: "object",
		properties: Object.fromEntries(names.map((name) => [name, { type: "string" }])),
		required: names,
		additionalProperties: false,
	};
}

/** Tools for the routes that set `mcp`. */
export function routeTools(routes: readonly AnyRoute[]): RouteTool[] {
	return routes
		.filter((r) => r.mcp && r.method !== "*")
		.map((r) => {
			const properties: Record<string, JsonSchema> = {};
			const required: string[] = [];
			const params = r.schemas.params ? toJSONSchema(r.schemas.params) : pathParamsSchema(r.path);
			if (params) {
				properties["params"] = params;
				required.push("params");
			}
			if (r.schemas.query) properties["query"] = toJSONSchema(r.schemas.query);
			if (r.schemas.body) {
				properties["body"] = toJSONSchema(r.schemas.body);
				required.push("body");
			}
			const description =
				(typeof r.mcp === "object" ? r.mcp.description : undefined) ??
				r.description ??
				r.summary ??
				`${r.method} ${r.path}`;
			return {
				name: toolName(r),
				description,
				inputSchema: { type: "object", properties, ...(required.length ? { required } : {}) },
				route: r,
			};
		});
}

type RpcId = string | number | null;
interface RpcRequest {
	jsonrpc?: string;
	id?: RpcId;
	method?: string;
	params?: Record<string, unknown>;
}

const rpcError = (id: RpcId, code: number, message: string) => ({
	jsonrpc: "2.0",
	id,
	error: { code, message },
});
const rpcResult = (id: RpcId, result: unknown) => ({ jsonrpc: "2.0", id, result });

function buildCall(
	tool: RouteTool,
	args: Record<string, unknown>,
	origin: string,
	auth: string | null,
): Request {
	const params = (args["params"] ?? {}) as Record<string, unknown>;
	const path = compilePath(tool.route.path).build(
		Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
	);
	const url = new URL(path, origin);
	for (const [key, value] of Object.entries((args["query"] ?? {}) as Record<string, unknown>)) {
		for (const item of Array.isArray(value) ? value : [value]) {
			if (item !== undefined && item !== null) url.searchParams.append(key, String(item));
		}
	}
	const headers = new Headers({ accept: "application/json" });
	if (auth) headers.set("authorization", auth);
	const hasBody = args["body"] !== undefined;
	if (hasBody) headers.set("content-type", "application/json");
	return new Request(url, {
		method: tool.route.method,
		headers,
		...(hasBody ? { body: JSON.stringify(args["body"]) } : {}),
	});
}

async function callTool(
	tool: RouteTool,
	args: Record<string, unknown>,
	request: Request,
	options: McpRouteOptions,
) {
	let response: Response;
	try {
		response = await options.dispatch(
			buildCall(tool, args, new URL(request.url).origin, request.headers.get("authorization")),
		);
	} catch (error) {
		return { content: [{ type: "text", text: (error as Error).message }], isError: true };
	}
	const text = response.status === 204 ? "" : await response.text();
	let structured: unknown;
	try {
		structured = text ? JSON.parse(text) : undefined;
	} catch {
		structured = undefined;
	}
	return {
		content: [{ type: "text", text: text || `HTTP ${response.status}` }],
		...(structured && typeof structured === "object" && !Array.isArray(structured)
			? { structuredContent: structured }
			: {}),
		...(response.ok ? {} : { isError: true }),
	};
}

async function handle(
	message: RpcRequest,
	request: Request,
	tools: RouteTool[],
	options: McpRouteOptions,
) {
	const id = message.id ?? null;
	switch (message.method) {
		case "initialize": {
			const requested = String(message.params?.["protocolVersion"] ?? "");
			return rpcResult(id, {
				protocolVersion: PROTOCOL_VERSIONS.includes(requested) ? requested : PROTOCOL_VERSIONS[0],
				capabilities: { tools: { listChanged: false } },
				serverInfo: { name: options.name, version: options.version },
			});
		}
		case "ping":
			return rpcResult(id, {});
		case "tools/list":
			return rpcResult(id, {
				tools: tools.map(({ name, description, inputSchema }) => ({
					name,
					description,
					inputSchema,
				})),
			});
		case "tools/call": {
			const tool = tools.find((t) => t.name === message.params?.["name"]);
			if (!tool) return rpcError(id, -32602, `Unknown tool: ${String(message.params?.["name"])}`);
			const args = (message.params?.["arguments"] ?? {}) as Record<string, unknown>;
			return rpcResult(id, await callTool(tool, args, request, options));
		}
		default:
			return rpcError(id, -32601, `Method not found: ${String(message.method)}`);
	}
}

/**
 * An MCP endpoint (Streamable HTTP, stateless JSON responses) that exposes
 * routes marked `mcp: true` as tools. Calls go through `dispatch` with the
 * caller's `Authorization` header, so validation, auth and ACL guards apply
 * exactly as for HTTP clients.
 */
export function mcpRoute(options: McpRouteOptions): AnyRoute {
	const tools = routeTools(options.routes);
	return route({
		method: "POST",
		path: options.path ?? "/mcp",
		openapi: false,
		handler: async (ctx) => {
			const origin = ctx.request.headers.get("origin");
			// DNS-rebinding protection (MCP spec): browsers must be same-origin or allowed.
			if (origin && origin !== ctx.url.origin && !options.allowedOrigins?.includes(origin)) {
				return json(rpcError(null, -32000, "Origin not allowed"), { status: 403 });
			}
			let payload: RpcRequest | RpcRequest[];
			try {
				payload = (await ctx.request.json()) as RpcRequest | RpcRequest[];
			} catch {
				return json(rpcError(null, -32700, "Parse error"), { status: 400 });
			}
			const messages = Array.isArray(payload) ? payload : [payload];
			const requests = messages.filter((m) => m.id !== undefined);
			if (requests.length === 0) return new Response(null, { status: 202 });
			const replies = await Promise.all(
				requests.map((m) => handle(m, ctx.request, tools, options)),
			);
			return json(Array.isArray(payload) ? replies : replies[0]);
		},
	});
}
