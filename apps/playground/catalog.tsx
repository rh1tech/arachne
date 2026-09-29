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

/** Breathing room beyond a fixed descendant's own inset (banners, FABs). */
const FIXED_GAP_PX = 16;

/** Grow `box` to fit its fixed-position descendants; returns a disposer. */
function fitFixedChildren(box: HTMLElement): () => void {
	const fit = () => {
		let needed = 0;
		const outer = box.getBoundingClientRect();
		for (const el of box.querySelectorAll<HTMLElement>("*")) {
			const style = getComputedStyle(el);
			if (style.position !== "fixed") continue;
			// Stretched to both edges (`inset: 0`): it follows the box, so growing would never settle.
			const r = el.getBoundingClientRect();
			if (Math.abs(r.top - outer.top) < 1 && Math.abs(r.bottom - outer.bottom) < 1) continue;
			// Anchored to one edge: that inset plus the element must fit in the box.
			const inset = Math.max(parseFloat(style.bottom) || 0, parseFloat(style.top) || 0, 0);
			needed = Math.max(needed, el.offsetHeight + inset + FIXED_GAP_PX);
		}
		box.style.minHeight = needed ? `${needed}px` : "";
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
		<Table class="catalog-props" striped>
			<Thead>
				<Tr>
					<Th scope="col">Prop</Th>
					<Th scope="col">Type</Th>
					<Th scope="col">Description</Th>
				</Tr>
			</Thead>
			<Tbody>
				<For each={props.entry.props}>
					{(prop) => (
						<Tr>
							<Td>
								<Code>{prop.name}</Code>
								{prop.required ? <span class="catalog-required"> required</span> : null}
								{prop.deprecated ? <span class="catalog-deprecated"> deprecated</span> : null}
							</Td>
							<Td>
								<code class="catalog-type">{prop.type}</code>
							</Td>
							<Td>
								{prop.deprecated ? (
									<>
										<RichText text={prop.deprecated} />{" "}
									</>
								) : null}
								<RichText text={prop.description} />
							</Td>
						</Tr>
					)}
				</For>
			</Tbody>
		</Table>
	);
}

function Slots(props: { entry: CatalogEntry; order: 2 | 3 | 4 }) {
	return (
		<Show when={props.entry.slots.length > 0}>
			<section class="catalog-section">
				<Title order={props.order} size={(props.order + 2) as 4 | 5 | 6}>
					Slots
				</Title>
				<Text muted>
					Target inner parts with <Code>classes</Code> / <Code>styles</Code>, e.g.{" "}
					<Code>{`classes={{ ${props.entry.slots[0] ?? "root"}: "my-class" }}`}</Code>.
				</Text>
				<Group gap="0.35rem" wrap>
					<For each={props.entry.slots}>{(name) => <Code>{name}</Code>}</For>
				</Group>
			</section>
		</Show>
	);
}

function Props(props: { entry: CatalogEntry; order: 2 | 3 | 4 }) {
	return (
		<section class="catalog-section">
			<Title order={props.order} size={(props.order + 2) as 4 | 5 | 6}>
				Props
			</Title>
			<Show
				when={props.entry.props.length > 0}
				fallback={<Text muted>No component-specific props.</Text>}
			>
				<ScrollArea class="catalog-props-scroll" aria-label={`${props.entry.name} props`}>
					<PropsTable entry={props.entry} />
				</ScrollArea>
			</Show>
		</section>
	);
}

function SharedPropsNote() {
	return (
		<Text muted class="catalog-shared">
			Every component also accepts the shared props: pass-through attributes (<Code>id</Code>,{" "}
			<Code>data-*</Code>, <Code>aria-*</Code>, <Code>on*</Code>), <Code>class</Code>,{" "}
			<Code>style</Code>, <Code>classes</Code>, <Code>styles</Code> and <Code>unstyled</Code>.
		</Text>
	);
}

/** A sub-component documented on its parent's page. */
function Part(props: { entry: CatalogEntry }) {
	return (
		<section class="catalog-part" id={`part-${props.entry.name}`}>
			<Title order={3} size={4}>
				{props.entry.name}
			</Title>
			<Text muted>
				<RichText text={props.entry.summary} />
			</Text>
			<DocExample code={props.entry.code}>
				<Preview name={props.entry.name} />
			</DocExample>
			<Slots entry={props.entry} order={4} />
			<Props entry={props.entry} order={4} />
		</section>
	);
}

function Parts(props: { entry: CatalogEntry }) {
	const parts = props.entry.parts.flatMap((name) => entries.get(name) ?? []);
	return (
		<Show when={parts.length > 0}>
			<section class="catalog-section">
				<Title order={2} size={4}>
					Parts
				</Title>
				<Text muted>
					Compose {props.entry.name} from these sub-components:{" "}
					{parts.map((part, i) => [i ? ", " : "", <Code>{part.name}</Code>])}.
				</Text>
			</section>
			<For each={parts}>{(part) => <Part entry={part} />}</For>
		</Show>
	);
}

export function CatalogPage(props: { name: string }) {
	clearActions();
	const entry = entries.get(props.name);
	if (!entry) return <Text muted>Unknown component “{props.name}”.</Text>;
	return (
		<DocPage title={entry.name} description={<RichText text={entry.summary} />}>
			<DocExample
				title="Example"
				description={entry.interactive ? "Interactive demo — opens on demand." : undefined}
				code={entry.code}
			>
				<Preview name={entry.name} />
				<Show when={entry.logsActions}>
					<ActionLog />
				</Show>
			</DocExample>
			<Slots entry={entry} order={2} />
			<Props entry={entry} order={2} />
			<SharedPropsNote />
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
			<Title order={2} size={3}>
				{entry.name} reference
			</Title>
			<Slots entry={entry} order={3} />
			<Props entry={entry} order={3} />
			<SharedPropsNote />
			<Parts entry={entry} />
		</section>
	);
}
