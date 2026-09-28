import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { compile } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "jsx",
	version: "0.0.1",
	tools: [
		{
			name: toolName("jsx", "compile"),
			description: "Compile Arachne JSX/TSX source to DOM or SSR target via dom-expressions/oxc.",
			inputSchema: {
				source: z.string().min(1),
				target: z.enum(["dom", "ssr"]).optional(),
				filename: z.string().optional(),
				hydratable: z.boolean().optional(),
			},
			handler: (args) => {
				try {
					const result = compile(String(args["source"]), {
						target: (args["target"] as "dom" | "ssr" | undefined) ?? "dom",
						filename: (args["filename"] as string | undefined) ?? "mcp.tsx",
						hydratable: (args["hydratable"] as boolean | undefined) ?? true,
					});
					return jsonResult({
						code: result.code,
						isIsland: result.isIsland,
						hydrateStrategy: result.hydrateStrategy,
					});
				} catch (e) {
					return textResult(e instanceof Error ? e.message : String(e), true);
				}
			},
		},
	],
	resources: [
		{
			name: "arachne-jsx-readme",
			uri: "arachne://jsx/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
		{
			name: "arachne-jsx-compiled-output-adr",
			uri: "arachne://jsx/adr-0006",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(
					new URL("../../../docs/adr/0006-jsx-compiled-output.md", import.meta.url),
				).text(),
			}),
		},
	],
	prompts: [
		{
			name: "arachne_jsx_component",
			description: "Write an Arachne JSX component (signals + no VDOM)",
			arguments: [{ name: "name", required: true }],
			handler: (args) => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Write Arachne JSX component ${args["name"] ?? "Widget"} using @arachne/signals. One function body run; fine-grained updates. Optional "use island" for islands.`,
						},
					},
				],
			}),
		},
	],
});

export default mcpModule;
