/**
 * Build-time entry (bundled for SSR by `content/ssr-examples.ts`): renders
 * one live example to HTML with its own hydration key prefix.
 */
import { renderToString, type SSRPayload } from "@arachnejs/render/ssr";
import { examples, Preview, renderIdOf } from "./preview.tsx";

/** HTML for the example `name`, or `undefined` when there is no such example. */
export function renderExample(name: string, logs: boolean): string | undefined {
	if (!examples.has(name)) return undefined;
	return renderToString(() => (<Preview name={name} logs={logs} />) as SSRPayload, {
		renderId: renderIdOf(name),
	});
}
