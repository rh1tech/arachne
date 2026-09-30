import { afterEach, beforeEach, expect, test } from "bun:test";
import { insert, render } from "@arachne/render";
import { Window } from "happy-dom";
import { createRouter, memoryHistory, type RouteDefinition, type RouteProps } from "./index.ts";

let win: Window;
beforeEach(() => {
	win = new Window({ url: "https://site.test/" });
	Object.assign(globalThis, { window: win, document: win.document, Node: win.Node });
});
afterEach(() => win.close());

const created: string[] = [];

/** A layout: an element with its children inserted reactively, as compiled JSX does. */
const layout =
	(tag: string) =>
	(props: RouteProps): Node => {
		created.push(tag);
		const el = document.createElement(tag);
		const path = document.createElement("span");
		path.className = "path";
		insert(path, () => props.location.pathname);
		el.append(path);
		insert(el, () => props.children);
		return el;
	};

const page = (name: string) => (props: RouteProps) => {
	created.push(name);
	return `${name}:${props.params["slug"] ?? ""}`;
};

const routes: RouteDefinition[] = [
	{
		path: "/",
		component: layout("site"),
		children: [
			{ path: "", component: page("home") },
			{
				path: "docs",
				component: layout("docs"),
				children: [
					{ path: "", component: page("index") },
					{ path: "*slug", component: page("doc") },
				],
			},
		],
	},
];

test("layouts stay mounted while navigating between their children; pages re-render", async () => {
	created.length = 0;
	const router = createRouter({ routes, history: memoryHistory("/docs"), scroll: false });
	const root = document.createElement("div");
	render(() => router.Outlet(), root as unknown as Element);
	const docs = root.querySelector("docs");
	expect(root.textContent).toBe("/docs/docsindex:");

	await router.navigate("/docs/kit");
	expect(root.querySelector("docs")).toBe(docs); // same element: scroll, focus and state survive
	expect(root.textContent).toBe("/docs/kit/docs/kitdoc:kit");
	await router.navigate("/docs/router");
	expect(root.querySelector("docs")).toBe(docs);
	expect(root.textContent).toContain("doc:router");
	expect(created).toEqual(["site", "docs", "index", "doc", "doc"]);
});

test("a layout is replaced when the chain no longer includes it", async () => {
	created.length = 0;
	const router = createRouter({ routes, history: memoryHistory("/docs/kit"), scroll: false });
	const root = document.createElement("div");
	render(() => router.Outlet(), root as unknown as Element);
	const site = root.querySelector("site");
	await router.navigate("/");
	expect(root.querySelector("docs")).toBeNull();
	expect(root.querySelector("site")).toBe(site);
	expect(root.textContent).toBe("/home:");
	await router.navigate("/docs");
	expect(root.querySelector("docs")).not.toBeNull();
	expect(created).toEqual(["site", "docs", "doc", "home", "docs", "index"]);
});
