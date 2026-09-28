import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { formatIssues, safeParse } from "./parse.ts";
import { type SchemaSpec, schemaFromSpec } from "./spec.ts";

const schemaSpecSchema: z.ZodTypeAny = z.lazy(() =>
	z.union([
		z.object({
			kind: z.literal("string"),
			min: z.number().optional(),
			max: z.number().optional(),
		}),
		z.object({
			kind: z.literal("number"),
			min: z.number().optional(),
			max: z.number().optional(),
			int: z.boolean().optional(),
		}),
		z.object({ kind: z.literal("boolean") }),
		z.object({
			kind: z.literal("literal"),
			value: z.union([z.string(), z.number(), z.boolean()]),
		}),
		z.object({
			kind: z.literal("enum"),
			values: z.array(z.string()).nonempty(),
		}),
		z.object({ kind: z.literal("optional"), of: schemaSpecSchema }),
		z.object({ kind: z.literal("nullable"), of: schemaSpecSchema }),
		z.object({
			kind: z.literal("defaulted"),
			of: schemaSpecSchema,
			value: z.unknown(),
		}),
		z.object({ kind: z.literal("array"), of: schemaSpecSchema }),
		z.object({
			kind: z.literal("object"),
			fields: z.record(schemaSpecSchema),
		}),
		z.object({
			kind: z.literal("union"),
			options: z.tuple([schemaSpecSchema, schemaSpecSchema]).rest(schemaSpecSchema),
		}),
	]),
);

export const mcpModule = defineMcpModule({
	name: "schema",
	version: "0.0.1",
	tools: [
		{
			name: toolName("schema", "validate"),
			description:
				"Validate a JSON value against a SchemaSpec descriptor (Standard Schema via @arachne/schema).",
			inputSchema: {
				spec: schemaSpecSchema,
				value: z.unknown(),
			},
			handler: (args) => {
				const spec = args["spec"] as SchemaSpec;
				const value = args["value"];
				const schema = schemaFromSpec(spec);
				const result = safeParse(schema, value);
				if (result.issues) {
					return jsonResult({
						ok: false,
						issues: result.issues,
						message: formatIssues(result.issues),
					});
				}
				return jsonResult({ ok: true, value: result.value });
			},
		},
		{
			name: toolName("schema", "api_summary"),
			description: "Summarize @arachne/schema public API.",
			handler: () =>
				textResult(
					[
						"s.string / s.number / s.boolean / s.literal / s.enum",
						"s.object / s.array / s.union",
						"s.optional / s.nullable / s.defaulted",
						"parse(schema, value) · safeParse(schema, value)",
						"Infer<typeof schema> · Standard Schema V1 (~standard)",
						"schemaFromSpec(spec) for JSON descriptors / MCP",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-schema-readme",
			uri: "arachne://schema/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
	prompts: [
		{
			name: "arachne_schema_model",
			description: "Guide for defining domain models with @arachne/schema",
			handler: () => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: "Define domain models with @arachne/schema (s.object / s.array / …). Prefer Standard Schema (~standard) over ad-hoc validators. Keep @arachne/config’s c.* DSL for boot config only.",
						},
					},
				],
			}),
		},
	],
});

export default mcpModule;
