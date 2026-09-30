import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { z } from "zod";
import { ConfigError, c, loadConfig } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "config",
	version: "0.0.1",
	tools: [
		{
			name: toolName("config", "validate_object"),
			description:
				"Validate a JSON object against a simple Arachne config schema (port/name/debug demo schema, or pass raw keys).",
			inputSchema: {
				value: z.record(z.unknown()),
				requireDatabaseUrl: z.boolean().optional(),
			},
			handler: async (args) => {
				const requireDb = Boolean(args["requireDatabaseUrl"]);
				const schema = c.object({
					port: c.defaulted(c.number(), 3000),
					debug: c.defaulted(c.boolean(), false),
					...(requireDb
						? { databaseUrl: c.string({ min: 1 }) }
						: { databaseUrl: c.optional(c.string()) }),
				});
				try {
					const config = await loadConfig(schema, {
						defaults: args["value"] as Record<string, unknown>,
						env: {},
					});
					return jsonResult({ ok: true, config });
				} catch (e) {
					if (e instanceof ConfigError) {
						return jsonResult({ ok: false, issues: e.issues }, true);
					}
					return textResult(e instanceof Error ? e.message : String(e), true);
				}
			},
		},
		{
			name: toolName("config", "parse_env"),
			description: "Map ARACHNE_* env keys into a nested object (same rules as loadConfig).",
			inputSchema: {
				env: z.record(z.string()),
				prefix: z.string().optional(),
			},
			handler: async (args) => {
				const { envToObject } = await import("./index.ts");
				return jsonResult(
					envToObject(
						args["env"] as Record<string, string>,
						(args["prefix"] as string | undefined) ?? "ARACHNE_",
					),
				);
			},
		},
	],
	resources: [
		{
			name: "arachne-config-readme",
			uri: "arachne://config/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
