/**
 * Component reference, generated from the shared examples (live preview + code)
 * and the component types (props, slots). Pages follow examples/catalog-map.ts:
 * one page per component or per family of related components; sub-components
 * are documented on their parent's page; components with a hand-written
 * showcase page get their reference (and their family's) there instead.
 */
import { For, Show } from "@arachnejs/render";
import { effect, signal, untrack } from "@arachnejs/signals";
import {
	Code,
	DocExample,
	type DocMenuItem,
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
} from "@arachnejs/ui";
import { actionLog, clearActions } from "../../packages/ui/examples/actions.ts";
import {
	categories,
	curatedPages,
	type Family,
	isFamily,
	itemComponents,
} from "../../packages/ui/examples/catalog-map.ts";
import { exampleGroups } from "../../packages/ui/examples/index.ts";
import {
	type CatalogEntry,
	type CatalogProp,
	type CatalogType,
	catalog,
} from "./catalog.generated.ts";

export const CATALOG_PREFIX = "c-";
export const FAMILY_PREFIX = "f-";

const entries = new Map(catalog.map((entry) => [entry.name, entry] as const));
const examples = new Map(exampleGroups.flatMap((g) => g.examples.map((e) => [e.name, e] as const)));
/** Hand-written page id by component name. */
const curatedPageOf = new Map(
	Object.entries(curatedPages).map(([page, name]) => [name, page] as const),
);
const families = categories.flatMap((c) => c.components.filter(isFamily));
const familyOf = new Map(families.flatMap((f) => f.components.map((name) => [name, f] as const)));

/** Page id for a category item: its hand-written page if a member has one. */
function pageId(item: string | Family): string {
	const curated = itemComponents(item)
		.map((name) => curatedPageOf.get(name))
		.find(Boolean);
	if (curated) return curated;
	return isFamily(item) ? `${FAMILY_PREFIX}${item.family}` : `${CATALOG_PREFIX}${item}`;
}

/**
 * Sidebar: one section per category, one item per component or family.
 * `extra` adds guide pages at the top of a category (e.g. form recipes).
 */
export function referenceSections(extra: Record<string, DocMenuItem[]> = {}): DocMenuSection[] {
	return categories.map((category) => ({
		id: `ref-${category.id}`,
		label: category.label,
		items: [
			...(extra[category.id] ?? []),
			...category.components.map((item) => ({
				id: pageId(item),
				label: isFamily(item) ? item.title : item,
			})),
		],
	}));
}

/** The preview the user last interacted with: the one whose event log is shown. */
const activePreview = signal("");

/** Callbacks the example fired (`action("onX")` handlers), newest first. */
function ActionLog(props: { name: string }) {
	const mine = () => actionLog().length > 0 && activePreview() === props.name;
	return (
		<output class="catalog-actions" aria-live="polite" aria-label={`${props.name} event log`}>
			<Show
				when={mine()}
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
			onPointerDown={() => activePreview.set(props.name)}
			onFocusIn={() => activePreview.set(props.name)}
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

function PropsTable(props: { rows: CatalogProp[]; first?: string; defaults?: boolean }) {
	return (
		<table class="catalog-props">
			<thead>
				<tr>
					<th scope="col">{props.first ?? "Prop"}</th>
					<th scope="col">Type</th>
					<Show when={props.defaults !== false}>
						<th scope="col">Default</th>
					</Show>
					<th scope="col">Description</th>
				</tr>
			</thead>
			<tbody>
				<For each={props.rows}>
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
							<Show when={props.defaults !== false}>
								<td class="catalog-prop-default">
									{prop.defaultValue ? <code>{prop.defaultValue}</code> : null}
								</td>
							</Show>
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
type Level = 2 | 3 | 4 | 5 | 6;
const deeper = (level: Level): Level => Math.min(6, level + 1) as Level;

function Heading(props: { kind: HeadingKind; order: Level; children: unknown }) {
	return (
		<Title
			order={props.order}
			class={props.kind === "section" ? "catalog-h-section" : "catalog-h-label"}
		>
			{props.children}
		</Title>
	);
}

/** Data types the props use: an object's fields, or an alias's values. */
function TypesReference(props: { types: CatalogType[] }) {
	return (
		<Show when={props.types.length > 0}>
			<div class="catalog-types">
				<For each={props.types}>
					{(type) => (
						<div class="catalog-type-doc">
							<p class="catalog-meta">
								<span class="catalog-meta-label">Type</span>
								<code class="catalog-type-name">{type.name}</code>
								<Show when={type.description}>
									<span class="catalog-meta-hint">
										<RichText text={type.description} />
									</span>
								</Show>
							</p>
							<Show
								when={type.fields}
								fallback={
									<code class="catalog-type catalog-type-definition">{type.definition}</code>
								}
							>
								{(fields: CatalogProp[]) => (
									<ScrollArea class="catalog-props-scroll" aria-label={`${type.name} fields`}>
										<PropsTable rows={fields} first="Field" defaults={false} />
									</ScrollArea>
								)}
							</Show>
						</div>
					)}
				</For>
			</div>
		</Show>
	);
}

/** Props table, slot names and the shared-props note as one compact block. */
function ApiReference(props: { entry: CatalogEntry; order: Level; kind?: HeadingKind }) {
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
					<PropsTable rows={props.entry.props} />
				</ScrollArea>
			</Show>
			<TypesReference types={props.entry.types} />
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

/** An example block with its preview and (when it logs callbacks) the event log. */
function Example(props: { entry: CatalogEntry }) {
	return (
		<DocExample
			description={props.entry.interactive ? "Interactive demo — opens on demand." : undefined}
			code={props.entry.code}
		>
			<Preview name={props.entry.name} />
			<Show when={props.entry.logsActions}>
				<ActionLog name={props.entry.name} />
			</Show>
		</DocExample>
	);
}

/** A sub-component documented on its parent's page, as a card under "Parts". */
function Part(props: { entry: CatalogEntry; level: Level }) {
	return (
		<section class="catalog-part" id={`part-${props.entry.name}`}>
			<header class="catalog-part-head">
				<Title order={props.level} class="catalog-part-title">
					{props.entry.name}
				</Title>
				<p class="catalog-part-summary">
					<RichText text={props.entry.summary} />
				</p>
			</header>
			<ApiReference entry={props.entry} order={deeper(props.level)} kind="label" />
			<section class="catalog-section">
				<Heading kind="label" order={deeper(props.level)}>
					Example
				</Heading>
				<Example entry={props.entry} />
			</section>
		</section>
	);
}

/** "Parts" heading at `level`, part cards one level below. */
function Parts(props: { entry: CatalogEntry; level: Level }) {
	const parts = props.entry.parts.flatMap((name) => entries.get(name) ?? []);
	return (
		<Show when={parts.length > 0}>
			<section class="catalog-section catalog-parts">
				<Heading kind={props.level === 2 ? "section" : "label"} order={props.level}>
					Parts
				</Heading>
				<p class="catalog-meta catalog-meta-hint">
					{props.entry.name} is composed from these sub-components.
				</p>
				<For each={parts}>{(part) => <Part entry={part} level={deeper(props.level)} />}</For>
			</section>
		</Show>
	);
}

/** One member of a family page: name, summary, API, example, parts. */
function Member(props: { entry: CatalogEntry; withExample?: boolean }) {
	return (
		<section class="catalog-member" id={`member-${props.entry.name}`}>
			<header class="catalog-part-head">
				<Title order={2} class="catalog-member-title">
					{props.entry.name}
				</Title>
				<p class="catalog-part-summary">
					<RichText text={props.entry.summary} />
				</p>
			</header>
			<ApiReference entry={props.entry} order={3} kind="label" />
			<Show when={props.withExample !== false}>
				<section class="catalog-section">
					<Heading kind="label" order={3}>
						Example
					</Heading>
					<Example entry={props.entry} />
				</section>
			</Show>
			<Parts entry={props.entry} level={3} />
		</section>
	);
}

/** Links to the members at the top of a family page. */
function MemberIndex(props: { family: Family }) {
	return (
		<nav class="catalog-meta" aria-label={`${props.family.title} components`}>
			<span class="catalog-meta-label">On this page</span>
			<For each={props.family.components}>
				{(name) => (
					<a class="catalog-chip catalog-chip-link" href={`#member-${name}`}>
						{name}
					</a>
				)}
			</For>
		</nav>
	);
}

/** A page for a family of related components (e.g. the colour inputs). */
export function FamilyPage(props: { family: Family }) {
	clearActions();
	const members = props.family.components.flatMap((name) => entries.get(name) ?? []);
	return (
		<DocPage title={props.family.title} description={props.family.description}>
			<MemberIndex family={props.family} />
			<For each={members}>{(entry) => <Member entry={entry} />}</For>
		</DocPage>
	);
}

/**
 * Generated page for an id: `f-<family>`, or `c-<Component>` (a family member
 * resolves to its family's page). Undefined for other ids.
 */
export function referencePage(id: string): unknown {
	if (id.startsWith(FAMILY_PREFIX)) {
		const family = families.find((f) => f.family === id.slice(FAMILY_PREFIX.length));
		return family ? <FamilyPage family={family} /> : undefined;
	}
	if (!id.startsWith(CATALOG_PREFIX)) return undefined;
	const name = id.slice(CATALOG_PREFIX.length);
	const family = familyOf.get(name);
	return family ? <FamilyPage family={family} /> : <CatalogPage name={name} />;
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
				<Example entry={entry} />
			</section>
			<Parts entry={entry} level={2} />
		</DocPage>
	);
}

/** Props / slots / parts reference appended to a hand-written showcase page. */
export function ComponentReference(props: { pageId: string }) {
	const entry = entries.get(curatedPages[props.pageId] ?? "");
	if (!entry) return null;
	// Family siblings are documented here too, each with its own example.
	const siblings = (familyOf.get(entry.name)?.components ?? [])
		.filter((name) => name !== entry.name)
		.flatMap((name) => entries.get(name) ?? []);
	return (
		<section class="catalog-reference" aria-label={`${entry.name} reference`}>
			<ApiReference entry={entry} order={2} />
			<Parts entry={entry} level={2} />
			<For each={siblings}>{(sibling) => <Member entry={sibling} />}</For>
		</section>
	);
}
