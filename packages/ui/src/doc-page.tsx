/**
 * Bulma-style documentation page + example blocks.
 */
import { Show } from "@arachne/render";
import { CodeBlock } from "./pickers.tsx";
import { type SlotProps, setup } from "./system.ts";

export type DocPageSlot = "root" | "head" | "title" | "description" | "body";

export type DocPageProps = SlotProps<DocPageSlot> & {
	title: string;
	/** Text or inline content (e.g. with `<Code>` spans). */
	description?: unknown;
	children?: unknown;
};

/**
 * Component docs page: title, short description, then example blocks.
 * Slots: `root` `head` `title` `description` `body`.
 */
export function DocPage(input: DocPageProps) {
	const [props, rest, slot] = setup(
		"DocPage",
		input,
		{},
		["title", "description", "children"],
		"root" as DocPageSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-doc-page")} style={slot.style("root")}>
			<header class={slot.class("head", "a-doc-page-head")} style={slot.style("head")}>
				<h1 class={slot.class("title", "a-doc-page-title")} style={slot.style("title")}>
					{props.title}
				</h1>
				<Show when={props.description}>
					<p class={slot.class("description", "a-doc-page-desc")} style={slot.style("description")}>
						{props.description}
					</p>
				</Show>
			</header>
			<div class={slot.class("body", "a-doc-page-body")} style={slot.style("body")}>
				{props.children}
			</div>
		</article>
	);
}

export type DocExampleSlot = "root" | "title" | "description" | "preview";

export type DocExampleProps = SlotProps<DocExampleSlot> & {
	/** Optional section title above the example (e.g. "Colors"). */
	title?: string | undefined;
	/** Text or inline content (e.g. with `<Code>` spans). */
	description?: unknown;
	/** Source shown under the live preview. */
	code: string;
	language?: string | undefined;
	children?: unknown;
};

/**
 * Live preview + code snippet — the Bulma docs pattern.
 * Slots: `root` `title` `description` `preview`.
 */
export function DocExample(input: DocExampleProps) {
	const [props, rest, slot] = setup(
		"DocExample",
		input,
		{ language: "tsx" },
		["title", "description", "code", "language", "children"],
		"root" as DocExampleSlot,
	);
	return (
		<section {...rest} class={slot.class("root", "a-doc-example")} style={slot.style("root")}>
			<Show when={props.title}>
				<h2 class={slot.class("title", "a-doc-example-title")} style={slot.style("title")}>
					{props.title}
				</h2>
			</Show>
			<Show when={props.description}>
				<p
					class={slot.class("description", "a-doc-example-desc")}
					style={slot.style("description")}
				>
					{props.description}
				</p>
			</Show>
			<div class={slot.class("preview", "a-doc-example-preview")} style={slot.style("preview")}>
				{props.children}
			</div>
			<CodeBlock code={props.code} language={props.language} />
		</section>
	);
}
