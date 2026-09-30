/** Server-renders every registered contract case (compiled with target "ssr"). */
import { renderToString } from "@arachnejs/render/ssr";
import type { ContractCase, ContractProbe } from "../test-utils/contract.tsx";
import { cases as app } from "./contract-app-harness.tsx";
import { cases as core } from "./contract-core-harness.tsx";
import { cases as data } from "./contract-data-harness.tsx";
import { cases as forms } from "./contract-forms-harness.tsx";
import { cases as ops } from "./contract-ops-harness.tsx";
import { cases as surfaces } from "./contract-surfaces-harness.tsx";
import { cases as widgets } from "./contract-widgets-harness.tsx";

const groups: Record<string, ContractCase[]> = { core, ops, app, widgets, surfaces, forms, data };

export type SsrResult = { group: string; name: string; html?: string; error?: string };

export function renderAll(): SsrResult[] {
	const out: SsrResult[] = [];
	for (const [group, list] of Object.entries(groups)) {
		for (const c of list) {
			const probe: ContractProbe = {
				id: `probe-${c.name}`,
				class: "probe-class",
				style: { "--probe": "1" },
				"data-probe": c.name,
				"aria-label": `label-${c.name}`,
			};
			try {
				out.push({ group, name: c.name, html: renderToString(() => c.render(probe) as never) });
			} catch (e) {
				out.push({ group, name: c.name, error: (e as Error).stack ?? String(e) });
			}
		}
	}
	return out;
}
