import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { type Condition, createAcl, type GroupDef, type Subject } from "./acl.ts";

const groupSchema = z.object({
	level: z.number().optional(),
	inherits: z.array(z.string()).optional(),
	grants: z.array(z.string()),
	description: z.string().optional(),
});

const subjectSchema = z.object({
	id: z.string(),
	groups: z.array(z.string()),
	grants: z.array(z.string()).optional(),
	scopes: z.array(z.string()).optional(),
	blocked: z.boolean().optional(),
});

/** Conditions named in grants, answered with fixed truth values (default `false`). */
function assumed(
	groups: Record<string, GroupDef>,
	subject: Subject,
	assume: Record<string, boolean>,
) {
	const names = new Set<string>();
	const rules = [
		...Object.values(groups).flatMap((group) => group.grants),
		...(subject.grants ?? []),
	];
	for (const rule of rules) {
		const at = rule.indexOf("@");
		if (at !== -1) for (const name of rule.slice(at + 1).split(",")) names.add(name);
	}
	const conditions: Record<string, Condition> = {};
	for (const name of names) conditions[name] = () => assume[name] === true;
	return conditions;
}

function build(args: Record<string, unknown>) {
	const groups = args["groups"] as Record<string, GroupDef>;
	const subject = args["subject"] as Subject;
	const assume = (args["assume"] as Record<string, boolean> | undefined) ?? {};
	return { acl: createAcl({ groups, conditions: assumed(groups, subject, assume) }), subject };
}

/** MCP tools for designing and debugging `@arachne/acl` policies. */
export const mcpModule = defineMcpModule({
	name: "acl",
	version: "0.0.1",
	tools: [
		{
			name: toolName("acl", "check"),
			description:
				"Evaluate one permission for a subject against group definitions and explain the deciding rule. Conditions (`perm@name`) take their result from `assume`.",
			inputSchema: {
				groups: z.record(groupSchema),
				subject: subjectSchema,
				permission: z.string(),
				assume: z.record(z.boolean()).optional(),
			},
			handler: (args) => {
				try {
					const { acl, subject } = build(args);
					return jsonResult(acl.explain(subject, String(args["permission"])));
				} catch (error) {
					return jsonResult({ error: (error as Error).message }, true);
				}
			},
		},
		{
			name: toolName("acl", "permissions"),
			description:
				"List a subject's effective permissions (unconditional and conditional) and level.",
			inputSchema: { groups: z.record(groupSchema), subject: subjectSchema },
			handler: (args) => {
				try {
					const { acl, subject } = build(args);
					return jsonResult({ level: acl.level(subject), ...acl.permissions(subject) });
				} catch (error) {
					return jsonResult({ error: (error as Error).message }, true);
				}
			},
		},
		{
			name: toolName("acl", "api_summary"),
			description: "Summarize the @arachne/acl model and API.",
			handler: () =>
				textResult(
					[
						"Rules: resource:action · wildcards posts:* / *:read / * · deny !rule · conditions rule@owner,published",
						"Groups: { level, inherits, grants } · subjects: { id, groups, grants?, scopes?, blocked? }",
						"Order: blocked → token scopes → direct user rules → group rules; deny beats allow within a tier",
						"createAcl({ permissions?, conditions, groups }) → acl.can / assert / explain / permissions / level / atLeast / canManage / with",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-acl-readme",
			uri: "arachne://acl/readme",
			mimeType: "text/markdown",
			read: async () => ({ text: await Bun.file(new URL("../README.md", import.meta.url)).text() }),
		},
	],
});

export default mcpModule;
