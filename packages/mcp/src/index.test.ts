import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	createArachneMcpServer,
	defineMcpModule,
	jsonResult,
	textResult,
	toolName,
} from "../src/index.ts";

describe("defineMcpModule", () => {
	test("freezes module shape", () => {
		const mod = defineMcpModule({
			name: "demo",
			tools: [
				{
					name: toolName("demo", "ping"),
					description: "ping",
					handler: () => textResult("pong"),
				},
			],
		});
		expect(mod.name).toBe("demo");
		expect(mod.tools?.[0]?.name).toBe("arachne_demo_ping");
		expect(() => {
			(mod as { name: string }).name = "x";
		}).toThrow();
	});
});

describe("createArachneMcpServer", () => {
	test("registers tools from modules", () => {
		const mod = defineMcpModule({
			name: "demo",
			tools: [
				{
					name: toolName("demo", "echo"),
					description: "echo",
					inputSchema: { message: z.string() },
					handler: (args) => jsonResult({ echo: args["message"] }),
				},
			],
		});
		const server = createArachneMcpServer({ modules: [mod] });
		expect(server).toBeDefined();
	});

	test("rejects duplicate module names", () => {
		const a = defineMcpModule({ name: "x" });
		const b = defineMcpModule({ name: "x" });
		expect(() => createArachneMcpServer({ modules: [a, b] })).toThrow(/Duplicate/);
	});
});
