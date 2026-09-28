import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { bunPlugin, vitePlugin } from "./plugin.ts";

export const mcpModule = defineMcpModule({
	name: "vite",
	version: "0.0.1",
	tools: [
		{
			name: toolName("vite", "describe_plugins"),
			description: "Describe @arachne/vite Bun and Vite plugin entrypoints.",
			handler: () =>
				textResult(
					[
						"bunPlugin({ target?, hydratable?, moduleName? }) — Bun.build plugins",
						"vitePlugin({ ... }) — Vite enforce:pre transform for .[jt]sx",
						"Both compile via @arachne/jsx → @arachne/render",
					].join("\n"),
				),
		},
		{
			name: toolName("vite", "plugin_names"),
			description: "Return plugin name metadata for Bun and Vite adapters.",
			inputSchema: {
				kind: z.enum(["bun", "vite"]).default("bun"),
			},
			handler: (args) => {
				const kind = String(args["kind"] ?? "bun");
				if (kind === "vite") {
					const plugin = vitePlugin();
					return jsonResult({ name: plugin.name, enforce: plugin.enforce });
				}
				const plugin = bunPlugin();
				return jsonResult({ name: plugin.name });
			},
		},
	],
	resources: [
		{
			name: "arachne-vite-readme",
			uri: "arachne://vite/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
