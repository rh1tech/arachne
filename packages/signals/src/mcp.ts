import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import { z } from "zod";
import { batch, computed, signal } from "./index.ts";

export const mcpModule = defineMcpModule({
	name: "signals",
	version: "0.0.1",
	tools: [
		{
			name: toolName("signals", "simulate"),
			description:
				"Run a tiny signal graph: start value, list of sets, return computed doubled samples.",
			inputSchema: {
				initial: z.number(),
				sets: z.array(z.number()),
			},
			handler: (args) => {
				const initial = args["initial"] as number;
				const sets = args["sets"] as number[];
				const count = signal(initial);
				const doubled = computed(() => count() * 2);
				const samples: number[] = [doubled()];
				batch(() => {
					for (const v of sets) {
						count.set(v);
						samples.push(doubled());
					}
				});
				return jsonResult({ samples, final: count() });
			},
		},
		{
			name: toolName("signals", "api_summary"),
			description: "Summarize @arachne/signals public API.",
			handler: () =>
				textResult(
					[
						"signal(initial) — () get, (v)/.set set, .peek",
						"computed(fn)",
						"effect(fn) → dispose",
						"batch(fn), untrack(fn), root(fn)",
						"resource(fetcher), store(object)",
						"Core algorithm: alien-signals (MIT)",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-signals-readme",
			uri: "arachne://signals/readme",
			mimeType: "text/markdown",
			read: async () => ({
				text: await Bun.file(new URL("../README.md", import.meta.url)).text(),
			}),
		},
	],
	prompts: [
		{
			name: "arachne_signals_component_state",
			description: "Guide for modeling UI state with Arachne signals",
			handler: () => ({
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: "Use @arachne/signals (not React state). Prefer signal/computed/effect. Avoid VDOM patterns.",
						},
					},
				],
			}),
		},
	],
});

export default mcpModule;
