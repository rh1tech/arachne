/** A `<meta>` tag: `name` (description) or `property` (Open Graph) plus `content`. */
export interface HeadMeta {
	/** `name` attribute. */
	name?: string;
	/** `property` attribute (Open Graph). */
	property?: string;
	/** `content` attribute. */
	content: string;
}

/** A `<link>` tag (canonical, alternate, preload, …). */
export interface HeadLink {
	/** `rel` attribute. */
	rel: string;
	/** `href` attribute. */
	href: string;
	/** Other attributes (`hreflang`, `as`, `type`, …). */
	[attribute: string]: string;
}

/** What a route contributes to the document head. */
export interface HeadInput {
	/** Page title (inner routes win). */
	title?: string;
	/** Meta tags (inner routes replace outer ones with the same name/property). */
	meta?: HeadMeta[];
	/** Link tags (appended). */
	links?: HeadLink[];
}

/** The merged head for the current route. */
export interface Head {
	/** Final title (after the title template), if any route set one. */
	title?: string;
	/** Meta tags, deduplicated by name/property. */
	meta: HeadMeta[];
	/** Link tags. */
	links: HeadLink[];
}

const keyOf = (meta: HeadMeta) =>
	meta.name ? `name:${meta.name}` : `property:${meta.property ?? ""}`;

/** Merge head inputs from outer to inner route. */
export function mergeHeads(inputs: readonly HeadInput[], titleTemplate?: string): Head {
	let title: string | undefined;
	const meta = new Map<string, HeadMeta>();
	const links: HeadLink[] = [];
	for (const input of inputs) {
		if (input.title !== undefined) title = input.title;
		for (const tag of input.meta ?? []) {
			const key = keyOf(tag);
			meta.delete(key);
			meta.set(key, tag);
		}
		links.push(...(input.links ?? []));
	}
	const head: Head = { meta: [...meta.values()], links };
	if (title !== undefined) head.title = titleTemplate ? titleTemplate.replace("%s", title) : title;
	return head;
}

function escape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function attributes(record: Record<string, string | undefined>): string {
	return Object.entries(record)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => ` ${key}="${escape(value as string)}"`)
		.join("");
}

/** Serialise a head to HTML for server rendering (all values escaped). */
export function renderHead(head: Head): string {
	let html = head.title === undefined ? "" : `<title>${escape(head.title)}</title>`;
	for (const tag of head.meta) {
		html += `<meta${attributes({ name: tag.name, property: tag.property, content: tag.content })}>`;
	}
	for (const link of head.links) html += `<link${attributes(link)}>`;
	return html;
}

/** Apply a head to the live document (title, managed meta and link tags). */
export function applyHead(doc: Document, head: Head): void {
	if (head.title !== undefined) doc.title = head.title;
	for (const old of doc.head.querySelectorAll("[data-arachne-head]")) old.remove();
	for (const tag of head.meta) {
		const selector = tag.name ? `meta[name="${tag.name}"]` : `meta[property="${tag.property}"]`;
		doc.head.querySelector(selector)?.remove();
		const el = doc.createElement("meta");
		if (tag.name) el.setAttribute("name", tag.name);
		if (tag.property) el.setAttribute("property", tag.property);
		el.setAttribute("content", tag.content);
		el.setAttribute("data-arachne-head", "");
		doc.head.appendChild(el);
	}
	for (const link of head.links) {
		const el = doc.createElement("link");
		for (const [key, value] of Object.entries(link)) el.setAttribute(key, value);
		el.setAttribute("data-arachne-head", "");
		doc.head.appendChild(el);
	}
}
