/**
 * Customization contract shared by every component group. Each
 * `fixtures/contract-<group>-harness.tsx` lists cases; `contract.test.ts`
 * renders every case twice (styled / `unstyled`) and checks pass-through.
 */
import { render } from "@arachnejs/render";
import type { Example } from "../../examples/types.ts";
import { configureUI } from "../system.ts";

export type ContractProbe = {
	id: string;
	class: string;
	style: Record<string, string>;
	unstyled?: boolean;
	"data-probe": string;
	"aria-label": string;
};

/** Contract cases are the shared component examples (`packages/ui/examples`). */
export type ContractCase = Example;

export const THEME_CLASS = "theme-probe";

export function runContract(root: HTMLElement, cases: ContractCase[]) {
	configureUI({
		components: Object.fromEntries(
			cases.map((c) => [c.name, { classes: { [c.host ?? "root"]: THEME_CLASS } }]),
		),
	});
	const probe = (c: ContractCase, unstyled: boolean): ContractProbe => {
		const key = `${c.name}${unstyled ? ":unstyled" : ""}`;
		return {
			id: `probe-${key.replace(":", "-")}`,
			class: "probe-class",
			style: { "--probe": "1" },
			"data-probe": key,
			"aria-label": `label-${key}`,
			...(unstyled ? { unstyled: true } : {}),
		};
	};
	const dispose = render(
		() => (
			<div>
				{cases.map((c) => (
					<section data-case={c.name}>
						{c.render(probe(c, false))}
						{c.render(probe(c, true))}
					</section>
				))}
			</div>
		),
		root,
	);
	return {
		cases: cases.map((c) => ({ name: c.name })),
		dispose: () => {
			dispose();
			configureUI({});
		},
	};
}
