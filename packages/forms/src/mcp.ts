import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { s } from "@arachnejs/schema";
import { z } from "zod";
import { createForm } from "./create-form.ts";

export const mcpModule = defineMcpModule({
	name: "forms",
	version: "0.0.1",
	tools: [
		{
			name: toolName("forms", "validate_demo"),
			description: "Validate a name/age object with createForm + schema.",
			inputSchema: {
				name: z.string(),
				age: z.number(),
			},
			handler: async (args) => {
				const schema = s.object({
					name: s.string({ min: 1 }),
					age: s.number({ int: true, min: 0 }),
				});
				let submitted: unknown;
				const form = createForm({
					schema,
					initial: { name: String(args["name"]), age: Number(args["age"]) },
					onSubmit: (values) => {
						submitted = values;
					},
				});
				const ok = await form.submit();
				return jsonResult({
					ok,
					errors: form.errors(),
					submitted: submitted ?? null,
				});
			},
		},
		{
			name: toolName("forms", "api_summary"),
			description: "Summarize @arachnejs/forms public API.",
			handler: () =>
				textResult(
					[
						"createForm({ schema, initial, onSubmit })",
						"form.get/set/values/errors/validate/submit/reset",
						"TextField, TextAreaField, SelectField, CheckboxField, SwitchField, RadioField, Form",
						"FormWhen (conditional fields), FormColumns/FormColumn, FormSection, FormArea",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-forms-readme",
			uri: "arachne://forms/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
