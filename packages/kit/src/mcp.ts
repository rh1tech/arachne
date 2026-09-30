import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { toRoute } from "@arachnejs/server";
import { z } from "zod";
import { build } from "./build.ts";
import { buildSsr } from "./bundle.ts";
import { resolveConfig } from "./config.ts";
import { createProject, TEMPLATES, type TemplateName } from "./create.ts";
import { loadServer } from "./server-def.ts";

const needsConfirm = (action: string) =>
	jsonResult({ error: `${action} writes files; call again with confirm: true` }, true);

/** MCP tools for inspecting, building and creating Arachne apps. */
export const mcpModule = defineMcpModule({
	name: "kit",
	version: "0.0.1",
	tools: [
		{
			name: toolName("kit", "config"),
			description: "Resolve an app's configuration (mode, base, title, files found).",
			inputSchema: { root: z.string() },
			handler: async (args) => {
				const config = await resolveConfig(String(args["root"]));
				return jsonResult({
					mode: config.mode,
					base: config.base,
					titleTemplate: config.titleTemplate ?? null,
					hydrate: config.hydrate,
					hasRoutes: config.routesFile !== undefined,
					hasServer: config.serverFile !== undefined,
					styles: config.styles,
					outDir: config.outDir,
					mcp: config.mcp ?? null,
				});
			},
		},
		{
			name: toolName("kit", "routes"),
			description:
				"List an app's pages (pattern, loader, prerender coverage) and API routes. Evaluates app/server.ts.",
			inputSchema: { root: z.string() },
			handler: async (args) => {
				const config = await resolveConfig(String(args["root"]));
				const server = await loadServer(config, false);
				try {
					const pages = config.routesFile
						? (await buildSsr(config, { dev: false })).module.routeList().map((route) => ({
								...route,
								loader: Boolean(server.loaders?.[route.id]),
								prerender: !route.dynamic || Boolean(server.paths?.[route.id]),
							}))
						: [];
					const api = (server.routes ?? [])
						.map(toRoute)
						.map((r) => ({ method: r.method, path: r.path, summary: r.summary ?? null }));
					return jsonResult({ pages, api });
				} finally {
					await server.dispose?.();
				}
			},
		},
		{
			name: toolName("kit", "build"),
			description:
				"Production build of an app (writes the output directory). Requires confirm: true.",
			inputSchema: {
				root: z.string(),
				mode: z.enum(["static", "server", "api"]).optional(),
				confirm: z.boolean().optional(),
			},
			handler: async (args) => {
				if (args["confirm"] !== true) return needsConfirm("build");
				const mode = args["mode"] as "static" | "server" | "api" | undefined;
				const result = await build(String(args["root"]), mode ? { mode } : {});
				return jsonResult({
					mode: result.mode,
					outDir: result.outDir,
					pages: result.pages.map((p) => p.url),
					skipped: result.skipped,
					serverEntry: result.serverEntry ?? null,
				});
			},
		},
		{
			name: toolName("kit", "create"),
			description: `Create a project from a template (${TEMPLATES.join(", ")}). Requires confirm: true.`,
			inputSchema: {
				dir: z.string(),
				template: z.enum(TEMPLATES),
				confirm: z.boolean().optional(),
			},
			handler: async (args) => {
				if (args["confirm"] !== true) return needsConfirm("create");
				const target = await createProject(String(args["dir"]), args["template"] as TemplateName);
				return jsonResult({ created: target, next: ["bun install", "bun run dev"] });
			},
		},
		{
			name: toolName("kit", "api_summary"),
			description: "Summarize @arachnejs/kit.",
			handler: () =>
				textResult(
					[
						"Project: arachne.config.ts (defineConfig) · app/routes.tsx (pages) · app/server.ts (defineServer) · public/",
						"Modes: static (prerendered HTML + client routing) · server (SSR + API) · api (routes only)",
						"defineServer(({ dev }) => ({ routes, middleware, loaders: { '/blog/:slug': fn }, paths, openapi, db, tables, dispose }))",
						"CLI: arachne dev | build [--mode] | start | preview | create <dir> --template | routes | openapi | migrate",
						"Dev: hot reload over WebSocket (CSS swap, error overlay), server restarts when app/server.ts's imports change",
						"Programmatic: createAppServer({ root, dev }) · build(root, options) · preview({ dir }) · startDevServer({ root })",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-kit-readme",
			uri: "arachne://kit/readme",
			mimeType: "text/markdown",
			read: async () => ({ text: await Bun.file(new URL("../README.md", import.meta.url)).text() }),
		},
	],
});

export default mcpModule;
