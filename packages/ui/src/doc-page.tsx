/**
 * Bulma-style documentation page + example blocks.
 */
import { Show } from "@arachne/render";
import { CodeBlock } from "./pickers.tsx";
import { type SlotProps, setup } from "./system.ts";
import { DynamicHeading, type HeadingLevel } from "./widgets.tsx";

export type DocPageSlot = "root" | "head" | "title" | "description" | "body";

export type DocPageProps = SlotProps<DocPageSlot> & {
	/** Page title. */
	title: string;
	/** Heading level of `title`: `1` for a page, deeper when embedded. Default `1`. */
	titleOrder?: HeadingLevel | undefined;
	/** Text or inline content (e.g. with `<Code>` spans). */
	description?: unknown;
	/** Page body: `DocExample`s and other content. */
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
		["title", "titleOrder", "description", "children"],
		"root" as DocPageSlot,
	);
	return (
		<article {...rest} class={slot.class("root", "a-doc-page")} style={slot.style("root")}>
			<header class={slot.class("head", "a-doc-page-head")} style={slot.style("head")}>
				<DynamicHeading
					level={props.titleOrder ?? 1}
					class={slot.class("title", "a-doc-page-title")}
					style={slot.style("title")}
				>
					{props.title}
				</DynamicHeading>
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
	/** Heading level of `title`, to fit the page's outline. Default `2`. */
	titleOrder?: HeadingLevel | undefined;
	/** Text or inline content (e.g. with `<Code>` spans). */
	description?: unknown;
	/** Source shown under the live preview. */
	code: string;
	/** Language for highlighting the code. */
	language?: string | undefined;
	/** The live preview. */
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
		["title", "titleOrder", "description", "code", "language", "children"],
		"root" as DocExampleSlot,
	);
	return (
		<section {...rest} class={slot.class("root", "a-doc-example")} style={slot.style("root")}>
			<Show when={props.title}>
				<DynamicHeading
					level={props.titleOrder ?? 2}
					class={slot.class("title", "a-doc-example-title")}
					style={slot.style("title")}
				>
					{props.title}
				</DynamicHeading>
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
