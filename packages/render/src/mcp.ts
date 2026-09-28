import { defineMcpModule, jsonResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { island } from "./islands.ts";
import { escape, renderToString, ssr, wrapIsland } from "./ssr.ts";

export const mcpModule = defineMcpModule({
	name: "render",
	version: "0.0.1",
	tools: [
		{
			name: toolName("render", "ssr_string"),
			description: "Render a simple SSR template string with escaped text hole.",
			inputSchema: {
				tag: z.string().default("div"),
				text: z.string(),
				className: z.string().optional(),
			},
			handler: (args) => {
				const tag = String(args["tag"] ?? "div");
				const className = args["className"] as string | undefined;
				const html = renderToString(() =>
					ssr(
						[`<${tag}`, ">", `</${tag}>`],
						className ? ` class="${escape(className, true)}"` : "",
						escape(args["text"]),
					),
				);
				return jsonResult({ html });
			},
		},
		{
			name: toolName("render", "wrap_island"),
			description: "Wrap HTML in an <a-island> element for hydration scheduling.",
			inputSchema: {
				html: z.string(),
				chunkId: z.string(),
				propsJson: z.string().default("{}"),
				hydrate: z.string().default("visible"),
			},
			handler: (args) =>
				jsonResult({
					html: wrapIsland(String(args["html"]), {
						chunkId: String(args["chunkId"]),
						propsJson: String(args["propsJson"] ?? "{}"),
						hydrate: String(args["hydrate"] ?? "visible"),
					}),
				}),
		},
		{
			name: toolName("render", "escape"),
			description: "HTML-escape a string (text or attribute mode).",
			inputSchema: {
				value: z.string(),
				attr: z.boolean().optional(),
			},
			handler: (args) =>
				jsonResult({
					escaped: escape(args["value"], Boolean(args["attr"])),
				}),
		},
		{
			name: toolName("render", "island_meta"),
			description: "Describe island() helper metadata for a hydrate strategy.",
			inputSchema: {
				hydrate: z.enum(["visible", "idle", "load", "interaction"]).optional(),
			},
			handler: (args) => {
				const Comp = () => null;
				const wrapped = island(Comp, {
					hydrate: (args["hydrate"] as "visible" | undefined) ?? "visible",
				});
				return jsonResult({
					meta: (wrapped as unknown as { __island: unknown }).__island,
				});
			},
		},
	],
	resources: [
		{
			name: "arachne-render-readme",
			uri: "arachne://render/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
