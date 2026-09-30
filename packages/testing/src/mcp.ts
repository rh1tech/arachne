import { defineMcpModule, jsonResult, toolName } from "@arachnejs/mcp";
import { z } from "zod";
import { factory } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "testing",
	version: "0.0.1",
	tools: [
		{
			name: toolName("testing", "factory_demo"),
			description: "Build N demo user objects with the testing factory helper.",
			inputSchema: {
				count: z.number().int().min(1).max(50).default(3),
				namePrefix: z.string().default("user"),
			},
			handler: (args) => {
				const count = Number(args["count"] ?? 3);
				const namePrefix = String(args["namePrefix"] ?? "user");
				const user = factory<{ id: number; name: string }>({
					build: ({ seq }) => {
						const id = seq("user");
						return { id, name: `${namePrefix}-${id}` };
					},
				});
				return jsonResult({
					users: Array.from({ length: count }, () => user()),
				});
			},
		},
	],
	resources: [
		{
			name: "arachne-testing-readme",
			uri: "arachne://testing/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
	prompts: [
		{
			name: "arachne_testing_tdd",
			description: "TDD checklist for an Arachne package",
			handler: () => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: "Follow Arachne TDD: ADR → public types → RED tests → GREEN → refactor → README → ./mcp export. Coverage ≥ 80%.",
						},
					},
				],
			}),
		},
	],
});

export default mcpModule;
