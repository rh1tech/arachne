/** Component examples grouped for the showcase catalog and reference docs. */
import { examples as app } from "./app.tsx";
import { examples as core } from "./core.tsx";
import { examples as data } from "./data.tsx";
import { demos } from "./demos.tsx";
import { examples as forms } from "./forms.tsx";
import { examples as ops } from "./ops.tsx";
import { examples as surfaces } from "./surfaces.tsx";
import type { Example } from "./types.ts";
import { examples as widgets } from "./widgets.tsx";

export type { Example, ExampleProps } from "./types.ts";

export type ExampleGroup = { id: string; label: string; examples: Example[] };

const withDemos = (list: Example[]): Example[] =>
	list.map((example) => {
		const demo = demos[example.name];
		return demo ? { ...example, demo } : example;
	});

/** Order and labels match the reference docs (`docs/ui/components/<id>.md`). */
export const exampleGroups: ExampleGroup[] = [
	{ id: "core", label: "Overlays & navigation", examples: withDemos(core) },
	{ id: "forms", label: "Forms & pickers", examples: withDemos(forms) },
	{ id: "surfaces", label: "Surfaces & layout", examples: withDemos(surfaces) },
	{ id: "widgets", label: "Widgets & feedback", examples: withDemos(widgets) },
	{ id: "data", label: "Data & advanced", examples: withDemos(data) },
	{ id: "app", label: "App & commerce", examples: withDemos(app) },
	{ id: "ops", label: "Ops & developer", examples: withDemos(ops) },
];
