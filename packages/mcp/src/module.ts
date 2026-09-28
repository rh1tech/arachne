import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape } from "zod";

export type ToolResult = CallToolResult;

export type ToolHandler = (
	args: Record<string, unknown>,
) => CallToolResult | Promise<CallToolResult>;

export interface McpToolDef {
	name: string;
	description: string;
	inputSchema?: ZodRawShape;
	handler: ToolHandler;
}

export interface McpResourceDef {
	name: string;
	uri: string;
	description?: string;
	mimeType?: string;
	read: () => Promise<{ text: string; mimeType?: string }> | { text: string; mimeType?: string };
}

export interface McpPromptDef {
	name: string;
	description: string;
	arguments?: Array<{ name: string; description?: string; required?: boolean }>;
	handler: (args: Record<string, string | undefined>) => {
		messages: Array<{
			role: "user" | "assistant";
			content: { type: "text"; text: string };
		}>;
	};
}

export interface ArachneMcpModule {
	/** Package short name, e.g. "signals" */
	name: string;
	version?: string;
	tools?: McpToolDef[];
	resources?: McpResourceDef[];
	prompts?: McpPromptDef[];
}

export function defineMcpModule(mod: ArachneMcpModule): ArachneMcpModule {
	return Object.freeze({
		name: mod.name,
		...(mod.version ? { version: mod.version } : {}),
		tools: mod.tools ? [...mod.tools] : [],
		resources: mod.resources ? [...mod.resources] : [],
		prompts: mod.prompts ? [...mod.prompts] : [],
	});
}

export function textResult(text: string, isError = false): CallToolResult {
	return {
		content: [{ type: "text", text }],
		...(isError ? { isError: true } : {}),
	};
}

export function jsonResult(value: unknown, isError = false): CallToolResult {
	return textResult(JSON.stringify(value, null, 2), isError);
}

export function toolName(packageName: string, action: string): string {
	return `arachne_${packageName.replace(/-/g, "_")}_${action}`;
}

export function applyModule(server: McpServer, mod: ArachneMcpModule): void {
	const register = server.registerTool.bind(server) as (
		name: string,
		config: { description: string; inputSchema?: ZodRawShape },
		cb: (args?: Record<string, unknown>) => Promise<CallToolResult>,
	) => void;

	for (const tool of mod.tools ?? []) {
		register(
			tool.name,
			{
				description: tool.description,
				...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
			},
			async (args = {}) => tool.handler(args),
		);
	}

	for (const resource of mod.resources ?? []) {
		const meta = {
			...(resource.description ? { description: resource.description } : {}),
			...(resource.mimeType ? { mimeType: resource.mimeType } : {}),
		};
		server.registerResource(resource.name, resource.uri, meta, async () => {
			const body = await resource.read();
			return {
				contents: [
					{
						uri: resource.uri,
						mimeType: body.mimeType ?? resource.mimeType ?? "text/plain",
						text: body.text,
					},
				],
			};
		});
	}

	for (const prompt of mod.prompts ?? []) {
		const config = {
			description: prompt.description,
			...(prompt.arguments ? { arguments: prompt.arguments } : {}),
		};
		server.registerPrompt(prompt.name, config, async (args) =>
			prompt.handler((args ?? {}) as Record<string, string | undefined>),
		);
	}
}
