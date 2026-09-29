/**
 * Component reference: one page per @arachne/ui component, generated from the
 * shared examples (live preview + code) and the component types (props, slots).
 * Sub-components are documented on their parent's page; components that have a
 * hand-written showcase page get their reference appended there instead.
 */
import { For, Show } from "@arachne/render";
import { effect, untrack } from "@arachne/signals";
import {
	Code,
	DocExample,
	type DocMenuSection,
	DocPage,
	Group,
	ScrollArea,
	Table,
	Tbody,
	Td,
	Text,
	Th,
	Thead,
	Title,
	Tr,
} from "@arachne/ui";
import { actionLog, clearActions } from "../../packages/ui/examples/actions.ts";
import { categories, curatedPages } from "../../packages/ui/examples/catalog-map.ts";
import { exampleGroups } from "../../packages/ui/examples/index.ts";
import { type CatalogEntry, catalog } from "./catalog.generated.ts";

export const CATALOG_PREFIX = "c-";

const curated = new Set(Object.values(curatedPages));
const entries = new Map(catalog.map((entry) => [entry.name, entry] as const));
const examples = new Map(exampleGroups.flatMap((g) => g.examples.map((e) => [e.name, e] as const)));

/** Sidebar sections: one per category; parts and curated components are left out. */
export const catalogSections: DocMenuSection[] = categories.map((category) => ({
	id: `ref-${category.id}`,
	label: category.label,
	items: category.components
		.filter((name) => !curated.has(name))
		.map((name) => ({ id: `${CATALOG_PREFIX}${name}`, label: name })),
}));

/** Callbacks the example fired (`action("onX")` handlers), newest first. */
function ActionLog() {
	return (
		<output class="catalog-actions" aria-live="polite" aria-label="Event log">
			<Show
				when={actionLog().length > 0}
				fallback={
					<span class="catalog-actions-empty">
						Interact with the example — callbacks show up here.
					</span>
				}
			>
				<For each={actionLog()}>
					{(entry) => (
						<code class="catalog-action">
							{entry.name}({entry.args})
						</code>
					)}
				</For>
			</Show>
		</output>
	);
}

/** JSDoc text with `inline code` spans rendered as <Code>. */
function RichText(props: { text: string }) {
	return props.text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <Code>{part}</Code> : part));
}

/** Breathing room kept around fixed-position descendants once they fit. */
const FIXED_GAP_PX = 16;

/**
 * Grow `box` until its fixed-position descendants (banners, FABs, progress bars)
 * fit inside it; returns a disposer. It only grows by the overflow, so it settles.
 */
function fitFixedChildren(box: HTMLElement): () => void {
	const fit = () => {
		const outer = box.getBoundingClientRect();
		let overflow = 0;
		for (const el of box.querySelectorAll<HTMLElement>("*")) {
			if (getComputedStyle(el).position !== "fixed") continue;
			const r = el.getBoundingClientRect();
			if (r.height === 0) continue;
			overflow = Math.max(overflow, outer.top - r.top, r.bottom - outer.bottom);
		}
		if (overflow > 0.5)
			box.style.minHeight = `${Math.ceil(outer.height + overflow + FIXED_GAP_PX)}px`;
	};
	const frame = requestAnimationFrame(fit);
	const observer = new ResizeObserver(fit);
	observer.observe(box);
	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
	};
}

function Preview(props: { name: string }) {
	const example = examples.get(props.name);
	if (!example) return <Text muted>No example.</Text>;
	let dispose: (() => void) | undefined;
	effect(() => () => dispose?.());
	// Built once, untracked (like a component): the example's own state updates
	// patch the DOM instead of re-creating the whole example.
	const content = untrack(() => (example.demo ? example.demo() : example.render({})));
	return (
		// `transform` makes the preview the containing block of fixed-position components.
		<div
			class="catalog-preview"
			ref={(el: HTMLElement) => {
				// Children are attached after the ref runs; measure once they are.
				queueMicrotask(() => {
					dispose = fitFixedChildren(el);
				});
			}}
		>
			{content}
		</div>
	);
}

function PropsTable(props: { entry: CatalogEntry }) {
	return (
		<table class="catalog-props">
			<thead>
				<tr>
					<th scope="col">Prop</th>
					<th scope="col">Type</th>
					<th scope="col">Description</th>
				</tr>
			</thead>
			<tbody>
				<For each={props.entry.props}>
					{(prop) => (
						<tr>
							<td class="catalog-prop-name">
								<code>{prop.name}</code>
								{prop.required ? <span class="catalog-required">required</span> : null}
								{prop.deprecated ? <span class="catalog-deprecated">deprecated</span> : null}
							</td>
							<td>
								<code class="catalog-type">{prop.type}</code>
							</td>
							<td class="catalog-prop-desc">
								{prop.deprecated ? (
									<>
										<RichText text={prop.deprecated} />{" "}
									</>
								) : null}
								<RichText text={prop.description} />
							</td>
						</tr>
					)}
				</For>
			</tbody>
		</table>
	);
}

type HeadingKind = "section" | "label";

/**
 * Two heading styles only: `section` (API / Example / Parts on the page) and
 * `label` (small caps inside a part card). The level follows the nesting.
 */
function Heading(props: { kind: HeadingKind; order: 2 | 3 | 4; children: unknown }) {
	return (
		<Title
			order={props.order}
			class={props.kind === "section" ? "catalog-h-section" : "catalog-h-label"}
		>
			{props.children}
		</Title>
	);
}

/** Props table, slot names and the shared-props note as one compact block. */
function ApiReference(props: { entry: CatalogEntry; order: 2 | 3 | 4; kind?: HeadingKind }) {
	return (
		<section class="catalog-api" aria-label={`${props.entry.name} API`}>
			<Heading kind={props.kind ?? "section"} order={props.order}>
				API
			</Heading>
			<Show
				when={props.entry.props.length > 0}
				fallback={<p class="catalog-meta">No component-specific props.</p>}
			>
				<ScrollArea class="catalog-props-scroll" aria-label={`${props.entry.name} props`}>
					<PropsTable entry={props.entry} />
				</ScrollArea>
			</Show>
			<Show when={props.entry.slots.length > 0}>
				<p class="catalog-meta">
					<span class="catalog-meta-label">Slots</span>
					<For each={props.entry.slots}>{(name) => <code class="catalog-chip">{name}</code>}</For>
					<span class="catalog-meta-hint">
						style them with <code>classes</code> / <code>styles</code>
					</span>
				</p>
			</Show>
			<p class="catalog-meta catalog-meta-hint">
				Plus the shared props: <code>id</code>, <code>data-*</code>, <code>aria-*</code>,{" "}
				<code>on*</code>, <code>class</code>, <code>style</code>, <code>classes</code>,{" "}
				<code>styles</code>, <code>unstyled</code>.
			</p>
		</section>
	);
}

/** A sub-component documented on its parent's page, as a card under "Parts". */
function Part(props: { entry: CatalogEntry }) {
	return (
		<section class="catalog-part" id={`part-${props.entry.name}`}>
			<header class="catalog-part-head">
				<Title order={3} class="catalog-part-title">
					{props.entry.name}
				</Title>
				<p class="catalog-part-summary">
					<RichText text={props.entry.summary} />
				</p>
			</header>
			<ApiReference entry={props.entry} order={4} kind="label" />
			<section class="catalog-section">
				<Heading kind="label" order={4}>
					Example
				</Heading>
				<DocExample code={props.entry.code}>
					<Preview name={props.entry.name} />
				</DocExample>
			</section>
		</section>
	);
}

function Parts(props: { entry: CatalogEntry }) {
	const parts = props.entry.parts.flatMap((name) => entries.get(name) ?? []);
	return (
		<Show when={parts.length > 0}>
			<section class="catalog-section catalog-parts">
				<Heading kind="section" order={2}>
					Parts
				</Heading>
				<p class="catalog-meta catalog-meta-hint">
					{props.entry.name} is composed from these sub-components.
				</p>
				<For each={parts}>{(part) => <Part entry={part} />}</For>
			</section>
		</Show>
	);
}

export function CatalogPage(props: { name: string }) {
	clearActions();
	const entry = entries.get(props.name);
	if (!entry) return <Text muted>Unknown component “{props.name}”.</Text>;
	return (
		<DocPage title={entry.name} description={<RichText text={entry.summary} />}>
			<ApiReference entry={entry} order={2} />
			<section class="catalog-section">
				<Heading kind="section" order={2}>
					Example
				</Heading>
				<DocExample
					description={entry.interactive ? "Interactive demo — opens on demand." : undefined}
					code={entry.code}
				>
					<Preview name={entry.name} />
					<Show when={entry.logsActions}>
						<ActionLog />
					</Show>
				</DocExample>
			</section>
			<Parts entry={entry} />
		</DocPage>
	);
}

/** Props / slots / parts reference appended to a hand-written showcase page. */
export function ComponentReference(props: { pageId: string }) {
	const entry = entries.get(curatedPages[props.pageId] ?? "");
	if (!entry) return null;
	return (
		<section class="catalog-reference" aria-label={`${entry.name} reference`}>
			<ApiReference entry={entry} order={2} />
			<Parts entry={entry} />
		</section>
	);
}
