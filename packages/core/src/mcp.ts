import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { z } from "zod";
import { createApp, createToken, defineModule, type Module, ResolutionError } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "core",
	version: "0.0.1",
	tools: [
		{
			name: toolName("core", "create_token_demo"),
			description: "Create a DI token description and verify uniqueness (sandbox demo).",
			inputSchema: {
				description: z.string().min(1),
			},
			handler: (args) => {
				const a = createToken(String(args["description"]));
				const b = createToken(String(args["description"]));
				return jsonResult({
					description: a.description,
					unique: a !== b,
				});
			},
		},
		{
			name: toolName("core", "boot_modules"),
			description: "Boot a throwaway app with the given module names (setup order only).",
			inputSchema: {
				modules: z.array(z.string()).min(1),
			},
			handler: async (args) => {
				const names = args["modules"] as string[];
				const order: string[] = [];
				const modules: Module[] = [];
				for (const name of names) {
					const imports = modules.length > 0 ? [modules[modules.length - 1] as Module] : [];
					modules.push(
						defineModule({
							name,
							imports,
							setup: () => {
								order.push(name);
							},
						}),
					);
				}
				const last = modules[modules.length - 1];
				if (!last) return textResult("no modules", true);
				const app = createApp({ modules: [last] });
				await app.boot();
				await app.dispose();
				return jsonResult({ bootOrder: order });
			},
		},
		{
			name: toolName("core", "explain_resolution_error"),
			description: "Return the ResolutionError message shape.",
			handler: () => {
				const e = new ResolutionError('No provider registered for token "demo"');
				return jsonResult({ name: e.name, message: e.message });
			},
		},
	],
	resources: [
		{
			name: "arachne-core-readme",
			uri: "arachne://core/readme",
			description: "README for @arachnejs/core",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
				mimeType: "text/markdown",
			}),
		},
	],
	prompts: [
		{
			name: "arachne_core_module",
			description: "Scaffold an Arachne core module",
			arguments: [{ name: "name", description: "Module name", required: true }],
			handler: (args) => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Create an @arachnejs/core defineModule named "${args["name"] ?? "example"}" with providers, setup, and dispose. Use createToken for services.`,
						},
					},
				],
			}),
		},
	],
});

export default mcpModule;
