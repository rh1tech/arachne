import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

const tool = (name: string) => {
	const found = mcpModule.tools?.find((t) => t.name === name);
	if (!found) throw new Error(`missing tool ${name}`);
	return found;
};
const parse = (result: { content: Array<{ type: string; text?: string }> }) =>
	JSON.parse(result.content[0]?.text ?? "null");

test("preview validates and renders a message without sending it", async () => {
	const out = parse(
		await tool("arachne_mailer_preview").handler({
			message: {
				from: "Shop <no-reply@shop.io>",
				to: "ada@example.com",
				subject: "Hi",
				html: "<p>Hello <b>Ada</b></p>",
			},
		}),
	);
	expect(out.to).toEqual(["ada@example.com"]);
	expect(out.text).toBe("Hello Ada");
	expect(out.eml).toContain("Subject: Hi");
});

test("preview reports validation errors", async () => {
	const result = await tool("arachne_mailer_preview").handler({
		message: { from: "a@b.co", to: "nope", subject: "Hi", text: "x" },
	});
	expect(result.isError).toBe(true);
	expect(parse(result).error).toContain("invalid address");
});
