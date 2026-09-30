import type { RouteDefinition } from "@arachne/router";
import { DocsLayout } from "./components/DocsLayout.tsx";
import { Shell } from "./components/Shell.tsx";
import { Doc } from "./pages/Doc.tsx";
import { Home } from "./pages/Home.tsx";
import { type DocData, SITE } from "./site.ts";

export { ErrorPage, NotFound } from "./pages/NotFound.tsx";

const docHead = ({ data }: { data: unknown }) => {
	const doc = data as DocData;
	return {
		title: doc.title,
		meta: [
			{ name: "description", content: doc.summary },
			{ property: "og:title", content: doc.title },
			{ property: "og:description", content: doc.summary },
			{ property: "og:url", content: SITE.url + doc.path },
		],
		links: [{ rel: "canonical", href: SITE.url + doc.path }],
	};
};

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: Shell,
		children: [
			{
				path: "",
				component: Home,
				head: {
					meta: [
						{
							name: "description",
							content:
								"Arachne builds static sites, server-rendered apps and APIs from one TypeScript codebase, on Bun.",
						},
						{ property: "og:title", content: "Arachne" },
						{ property: "og:url", content: `${SITE.url}/` },
					],
					links: [{ rel: "canonical", href: `${SITE.url}/` }],
				},
			},
			{
				path: "docs",
				component: DocsLayout,
				children: [
					{ path: "", component: Doc, head: docHead },
					{ path: "*slug", component: Doc, head: docHead },
				],
			},
		],
	},
];
