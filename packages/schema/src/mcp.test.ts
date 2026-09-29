import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

function tool(name: string) {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
}

const text = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

test("json_schema tool turns a spec into JSON Schema", async () => {
	const result = await tool("arachne_schema_json_schema").handler({
		spec: {
			kind: "object",
			fields: {
				email: { kind: "string", format: "email" },
				tags: { kind: "record", of: { kind: "boolean" } },
			},
		},
	});
	expect(text(result)).toEqual({
		type: "object",
		properties: {
			email: { type: "string", format: "email" },
			tags: { type: "object", additionalProperties: { type: "boolean" } },
		},
		required: ["email", "tags"],
		additionalProperties: false,
	});
});

test("validate tool understands formats", async () => {
	const result = await tool("arachne_schema_validate").handler({
		spec: { kind: "string", format: "email" },
		value: "nope",
	});
	expect(text(result)).toMatchObject({ ok: false, message: "expected email address" });
});
