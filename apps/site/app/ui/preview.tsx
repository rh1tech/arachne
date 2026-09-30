/**
 * One live example's markup: the stage and, for examples that report
 * callbacks, the event log. Rendered to HTML at build time
 * (`examples-ssr.tsx`) and hydrated in the browser (`previews.tsx`), so both
 * sides must build exactly this.
 */
import { For, Show } from "@arachnejs/render";
import { signal, untrack } from "@arachnejs/signals";
import { actionLog } from "../../../../packages/ui/examples/actions.ts";
import { exampleGroups } from "../../../../packages/ui/examples/index.ts";

/** Every example by component name. */
export const examples = new Map(
	exampleGroups.flatMap((group) => group.examples.map((e) => [e.name, e] as const)),
);

/** Hydration key prefix of one example's markup (unique on a page; the page's own keys are numbers). */
export const renderIdOf = (name: string): string => `x-${name}-`;

/** The example the reader touched last: its event log shows the calls. */
const active = signal<string | undefined>(undefined);

function EventLog(props: { name: string }) {
	const mine = () => active() === props.name && actionLog().length > 0;
	return (
		<output class="ui-preview-log" aria-live="polite" aria-label={`${props.name} event log`}>
			<Show
				when={mine()}
				fallback={<span>Interact with the example: callbacks show up here.</span>}
			>
				<For each={actionLog()}>
					{(entry) => (
						<code>
							{entry.name}({entry.args})
						</code>
					)}
				</For>
			</Show>
		</output>
	);
}

/** The live example `name` (demo form when it has one), with its event log when `logs`. */
export function Preview(props: { name: string; logs: boolean }) {
	const example = examples.get(props.name);
	// Built once, untracked: the example's own state patches the DOM in place.
	const content = untrack(() => (example?.demo ? example.demo() : example?.render({})));
	return (
		<>
			<div
				class="ui-preview-stage"
				onPointerDown={() => active.set(props.name)}
				onFocusIn={() => active.set(props.name)}
			>
				{content}
			</div>
			<Show when={props.logs}>
				<EventLog name={props.name} />
			</Show>
		</>
	);
}
