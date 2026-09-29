import { describe, expect, test } from "bun:test";
import { s } from "@arachne/schema";
import { ApiError, createClient } from "./client.ts";
import { apiDocs, createServer, group, openapi, route } from "./index.ts";

const User = s.describe(s.object({ id: s.uuid(), email: s.email() }), { title: "User" });

const routes = group({ prefix: "/api", tags: ["users"] }, [
	route({
		method: "GET",
		path: "/users/:id",
		summary: "Get a user",
		params: s.object({ id: s.uuid() }),
		query: s.object({ expand: s.optional(s.coerce.boolean()) }),
		response: { 200: User },
		handler: (ctx) => ({ id: ctx.params.id, email: "ada@example.com" }),
	}),
	route({
		method: "POST",
		path: "/users",
		operationId: "createUser",
		body: s.object({ email: s.email(), avatar: s.optional(s.file()) }),
		response: { 201: User },
		handler: (ctx) => {
			ctx.status(201);
			return { id: "3f0e6b8a-2c5d-4c1e-9a7b-1d2e3f4a5b6c", email: ctx.body.email };
		},
	}),
	route({ method: "GET", path: "/internal", openapi: false, handler: () => ({}) }),
]);

describe("openapi()", () => {
	const doc = openapi({ info: { title: "Test API", version: "1.0.0" }, routes }) as {
		openapi: string;
		paths: Record<string, Record<string, Record<string, unknown>>>;
	};

	test("is OpenAPI 3.1 with templated paths", () => {
		expect(doc.openapi).toBe("3.1.0");
		expect(Object.keys(doc.paths)).toEqual(["/api/users/{id}", "/api/users"]);
	});

	test("path and query parameters come from schemas", () => {
		const get = doc.paths["/api/users/{id}"]?.["get"];
		expect(get?.["summary"]).toBe("Get a user");
		expect(get?.["tags"]).toEqual(["users"]);
		expect(get?.["operationId"]).toBe("get_api_users_id");
		expect(get?.["parameters"]).toEqual([
			{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
			{ name: "expand", in: "query", required: false, schema: { type: "boolean" } },
		]);
		const responses = get?.["responses"] as Record<string, { content?: unknown }>;
		expect(responses["200"]?.content).toEqual({
			"application/json": { schema: { $ref: "#/components/schemas/User" } },
		});
		expect(responses["422"]).toBeDefined();
	});

	test("bodies with files are multipart; titled schemas become components", () => {
		const post = doc.paths["/api/users"]?.["post"] as Record<string, unknown>;
		expect(post["operationId"]).toBe("createUser");
		const content = (post["requestBody"] as { content: Record<string, unknown> }).content;
		expect(Object.keys(content)).toEqual(["multipart/form-data"]);
		const components = (doc as unknown as { components: { schemas: Record<string, unknown> } })
			.components.schemas;
		expect(components["User"]).toMatchObject({ type: "object", title: "User" });
	});

	test("routes can opt out", () => {
		expect(doc.paths["/api/internal"]).toBeUndefined();
	});

	test("apiDocs serves the document and an explorer page", async () => {
		const app = createServer({
			routes: [...routes, ...apiDocs({ info: { title: "Test API", version: "1" }, routes })],
		});
		const json = await app.fetch(new Request("http://t/openapi.json"));
		expect(((await json.json()) as { openapi: string }).openapi).toBe("3.1.0");
		const page = await app.fetch(new Request("http://t/docs"));
		expect(page.headers.get("content-type")).toContain("text/html");
		expect(await page.text()).toContain("/openapi.json");
	});
});

describe("createClient", () => {
	const app = createServer({ routes });
	const api = createClient<typeof routes>({ baseUrl: "http://t", fetch: app.fetch });

	test("typed calls build URLs, send bodies and parse responses", async () => {
		const user = await api.get("/api/users/:id", {
			params: { id: "3f0e6b8a-2c5d-4c1e-9a7b-1d2e3f4a5b6c" },
			query: { expand: true },
		});
		const email: string = user.email;
		expect(email).toBe("ada@example.com");
		const created = await api.post("/api/users", { body: { email: "b@c.de" } });
		expect(created.email).toBe("b@c.de");
	});

	test("error envelopes become ApiError", async () => {
		const error = await api
			.post("/api/users", { body: { email: "nope" } })
			.catch((caught: unknown) => caught);
		expect(error).toBeInstanceOf(ApiError);
		expect((error as ApiError).status).toBe(422);
		expect((error as ApiError).code).toBe("validation_failed");
	});
});
