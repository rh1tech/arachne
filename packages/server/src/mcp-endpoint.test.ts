import { describe, expect, test } from "bun:test";
import { s } from "@arachne/schema";
import { createServer, HttpError, mcpRoute, route } from "./index.ts";

const notes = [{ id: "1", title: "Hello" }];
const api = [
	route({
		method: "GET",
		path: "/api/notes/:id",
		summary: "Get a note",
		mcp: true,
		params: s.object({ id: s.string() }),
		handler: (ctx) =>
			notes.find((n) => n.id === ctx.params.id) ?? Promise.reject(new HttpError(404, "Not found")),
	}),
	route({
		method: "POST",
		path: "/api/notes",
		mcp: { name: "create_note", description: "Create a note" },
		body: s.object({ title: s.string({ min: 1 }) }),
		handler: (ctx) => {
			if (ctx.request.headers.get("authorization") !== "Bearer secret")
				throw new HttpError(401, "Sign in");
			ctx.status(201);
			return { id: "2", title: ctx.body.title };
		},
	}),
	route({ method: "DELETE", path: "/api/notes/:id", handler: () => undefined }),
];

function app() {
	const server = createServer({
		routes: [
			...api,
			mcpRoute({
				name: "notes",
				version: "1.0.0",
				routes: api,
				dispatch: (req) => server.fetch(req),
			}),
		],
	});
	return server;
}

const rpc = (server: ReturnType<typeof app>, body: unknown, headers: Record<string, string> = {}) =>
	server.fetch(
		new Request("http://notes.test/mcp", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json, text/event-stream",
				...headers,
			},
			body: JSON.stringify(body),
		}),
	);

describe("mcpRoute", () => {
	test("initialize and tools/list expose routes marked mcp", async () => {
		const server = app();
		const init = await (
			await rpc(server, {
				jsonrpc: "2.0",
				id: 1,
				method: "initialize",
				params: {
					protocolVersion: "2025-06-18",
					capabilities: {},
					clientInfo: { name: "t", version: "1" },
				},
			})
		).json();
		expect(init.result.serverInfo).toEqual({ name: "notes", version: "1.0.0" });
		expect(init.result.capabilities.tools).toBeDefined();
		const list = await (await rpc(server, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
		expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual([
			"get_api_notes_id",
			"create_note",
		]);
		const get = list.result.tools[0];
		expect(get.description).toBe("Get a note");
		expect(get.inputSchema).toEqual({
			type: "object",
			properties: {
				params: {
					type: "object",
					properties: { id: { type: "string" } },
					required: ["id"],
					additionalProperties: false,
				},
			},
			required: ["params"],
		});
	});

	test("tools/call dispatches through the server with validation and auth", async () => {
		const server = app();
		const ok = await (
			await rpc(server, {
				jsonrpc: "2.0",
				id: 3,
				method: "tools/call",
				params: { name: "get_api_notes_id", arguments: { params: { id: "1" } } },
			})
		).json();
		expect(ok.result.isError).toBeUndefined();
		expect(ok.result.structuredContent).toEqual({ id: "1", title: "Hello" });
		const missing = await (
			await rpc(server, {
				jsonrpc: "2.0",
				id: 4,
				method: "tools/call",
				params: { name: "get_api_notes_id", arguments: { params: { id: "9" } } },
			})
		).json();
		expect(missing.result.isError).toBe(true);
		const anon = await (
			await rpc(server, {
				jsonrpc: "2.0",
				id: 5,
				method: "tools/call",
				params: { name: "create_note", arguments: { body: { title: "x" } } },
			})
		).json();
		expect(anon.result.isError).toBe(true);
		const authed = await (
			await rpc(
				server,
				{
					jsonrpc: "2.0",
					id: 6,
					method: "tools/call",
					params: { name: "create_note", arguments: { body: { title: "New" } } },
				},
				{ authorization: "Bearer secret" },
			)
		).json();
		expect(authed.result.structuredContent).toEqual({ id: "2", title: "New" });
		const invalid = await (
			await rpc(
				server,
				{
					jsonrpc: "2.0",
					id: 7,
					method: "tools/call",
					params: { name: "create_note", arguments: { body: { title: "" } } },
				},
				{ authorization: "Bearer secret" },
			)
		).json();
		expect(invalid.result.isError).toBe(true);
		expect(invalid.result.content[0].text).toContain("validation_failed");
	});

	test("notifications get 202, unknown methods an error, foreign origins 403", async () => {
		const server = app();
		expect(
			(await rpc(server, { jsonrpc: "2.0", method: "notifications/initialized" })).status,
		).toBe(202);
		const unknown = await (
			await rpc(server, { jsonrpc: "2.0", id: 8, method: "resources/list" })
		).json();
		expect(unknown.error.code).toBe(-32601);
		expect(
			(
				await rpc(
					server,
					{ jsonrpc: "2.0", id: 9, method: "ping" },
					{ origin: "https://evil.test" },
				)
			).status,
		).toBe(403);
		const tool = await (
			await rpc(server, { jsonrpc: "2.0", id: 10, method: "tools/call", params: { name: "nope" } })
		).json();
		expect(tool.error.code).toBe(-32602);
	});
});
