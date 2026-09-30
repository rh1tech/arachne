import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { memoryHistory } from "./history.ts";
import { compilePath } from "./path.ts";
import { createRouter, type RouteDefinition } from "./router.ts";

export const mcpModule = defineMcpModule({
	name: "router",
	version: "0.0.1",
	tools: [
		{
			name: toolName("router", "match"),
			description: "Match a pathname against a path pattern (:param, *rest).",
			inputSchema: {
				pattern: z.string(),
				pathname: z.string(),
			},
			handler: (args) => {
				const pattern = String(args["pattern"]);
				const pathname = String(args["pathname"]);
				try {
					const compiled = compilePath(pattern);
					const match = compiled.match(pathname);
					return jsonResult({ ok: true, match });
				} catch (e) {
					return jsonResult({
						ok: false,
						error: e instanceof Error ? e.message : String(e),
					});
				}
			},
		},
		{
			name: toolName("router", "simulate"),
			description: "Create a memory router and walk a sequence of navigations.",
			inputSchema: {
				routes: z.array(
					z.object({
						path: z.string(),
						name: z.string(),
					}),
				),
				initial: z.string().default("/"),
				navigations: z.array(z.string()),
			},
			handler: (args) => {
				const routes = args["routes"] as Array<{ path: string; name: string }>;
				const initial = String(args["initial"] ?? "/");
				const navigations = args["navigations"] as string[];
				const history = memoryHistory(initial);
				const router = createRouter({
					history,
					routes: routes.map((route) => ({
						path: route.path,
						component: () => route.name,
					})),
					fallback: () => "not-found",
				});
				const samples: Array<{ href: string; view: unknown; params: Record<string, string> }> = [];
				const snap = (): void => {
					samples.push({
						href: router.location().href,
						view: router.Outlet(),
						params: router.params(),
					});
				};
				snap();
				for (const to of navigations) {
					router.navigate(to);
					snap();
				}
				router.dispose();
				return jsonResult({ samples });
			},
		},
		{
			name: toolName("router", "resolve"),
			description:
				"Resolve a path against a route tree (paths, children, titles) and report the matched chain, params and final title.",
			inputSchema: {
				routes: z.array(z.record(z.unknown())),
				path: z.string(),
				titleTemplate: z.string().optional(),
			},
			handler: (args) => {
				type Spec = { path: string; title?: string; children?: Spec[] };
				const toRoutes = (specs: Spec[]): RouteDefinition[] =>
					specs.map((spec) => ({
						path: spec.path,
						component: () => spec.path,
						...(spec.title ? { head: { title: spec.title } } : {}),
						...(spec.children ? { children: toRoutes(spec.children) } : {}),
					}));
				const router = createRouter({
					routes: toRoutes(args["routes"] as Spec[]),
					history: memoryHistory(String(args["path"])),
					...(args["titleTemplate"] ? { titleTemplate: String(args["titleTemplate"]) } : {}),
				});
				const match = router.matched();
				const result = match
					? {
							pattern: match.pattern,
							chain: match.chain.map((r) => r.path),
							params: match.params,
							title: router.head().title ?? null,
						}
					: { pattern: null };
				router.dispose();
				return jsonResult(result);
			},
		},
		{
			name: toolName("router", "api_summary"),
			description: "Summarize @arachne/router public API.",
			handler: () =>
				textResult(
					[
						"compilePath(pattern) — :param and *rest (also @arachne/router/path)",
						"memoryHistory / browserHistory",
						"createRouter({ routes, history, load, initialData, base, titleTemplate, fallback, error, scroll })",
						"routes: { path, component | lazy, children (layout + index path ''), head }",
						"router.location / params / matched / data / pending / error / head (signals) · ready",
						"router.navigate / back / href / resolve / preload / interceptLinks / Outlet / View / dispose",
						"<Link href activeClass exact replace prefetch> · renderHead(head) for SSR",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-router-readme",
			uri: "arachne://router/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
});

export default mcpModule;
