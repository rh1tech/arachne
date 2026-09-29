import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

function tool(name: string) {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

test("openapi tool builds a document from route descriptors", async () => {
	const result = await tool("arachne_server_openapi").handler({
		info: { title: "Shop", version: "1.0.0" },
		routes: [
			{
				method: "POST",
				path: "/orders/:id",
				summary: "Update order",
				params: { kind: "object", fields: { id: { kind: "string", format: "uuid" } } },
				body: { kind: "object", fields: { qty: { kind: "number", int: true, min: 1 } } },
			},
		],
	});
	const doc = parse(result);
	expect(doc.openapi).toBe("3.1.0");
	const op = doc.paths["/orders/{id}"].post;
	expect(op.summary).toBe("Update order");
	expect(op.parameters[0]).toEqual({
		name: "id",
		in: "path",
		required: true,
		schema: { type: "string", format: "uuid" },
	});
	expect(op.requestBody.content["application/json"].schema.properties.qty).toEqual({
		type: "integer",
		minimum: 1,
	});
});

test("dispatch validates bodies like a real route", async () => {
	const result = await tool("arachne_server_dispatch").handler({
		routes: [
			{
				method: "POST",
				path: "/echo",
				body: { kind: "object", fields: { email: { kind: "string", format: "email" } } },
			},
		],
		method: "POST",
		path: "/echo",
		body: { email: "nope" },
	});
	const out = parse(result);
	expect(out.status).toBe(422);
	expect(out.body.error.issues[0]).toMatchObject({ location: "body", path: "email" });
});
