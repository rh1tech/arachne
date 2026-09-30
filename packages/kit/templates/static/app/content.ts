/** A blog post. In a real site this could come from Markdown files or a CMS. */
export interface Post {
	slug: string;
	title: string;
	date: string;
	summary: string;
	body: string[];
}

export const posts: Post[] = [
	{
		slug: "shipping-without-a-server",
		title: "Shipping without a server",
		date: "2026-09-18",
		summary:
			"Pre-rendered pages load instantly from any CDN, and the router takes over after the first paint.",
		body: [
			"Every page of this site was rendered to HTML at build time. Opening a page downloads finished markup, so the first paint does not wait for JavaScript.",
			"Once the client bundle loads, it hydrates the existing markup instead of rebuilding it. From then on, links swap pages in place and fetch each page's data as a small JSON file.",
			"The whole `dist/` folder can go to any static host: object storage, a CDN, or GitHub Pages.",
		],
	},
	{
		slug: "notes-on-signals",
		title: "Notes on signals",
		date: "2026-09-02",
		summary:
			"Fine-grained reactivity updates the exact text node that changed, with no virtual DOM to diff.",
		body: [
			"A signal holds a value and remembers who read it. When it changes, only those readers run again.",
			"Components run once. The markup they return is wired directly to the signals it reads, so a counter update touches one text node.",
		],
	},
	{
		slug: "a-field-guide-to-hydration",
		title: "A field guide to hydration",
		date: "2026-08-21",
		summary: "What the server sends, what the browser adopts, and why the two must agree.",
		body: [
			"The server marks the elements it renders with small keys. The client walks the same component tree and claims those elements rather than creating new ones.",
			"Server and client must render the same tree. Branch on data, not on `typeof window`.",
		],
	},
];

export const findPost = (slug: string) => posts.find((post) => post.slug === slug);
