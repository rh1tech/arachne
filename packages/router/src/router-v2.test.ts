import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
	createRouter,
	memoryHistory,
	type RouteDefinition,
	type RouteProps,
	renderHead,
	shouldIntercept,
} from "./index.ts";

const text = (value: unknown): string => {
	if (typeof value === "function") return text(value());
	if (Array.isArray(value)) return value.map(text).join("");
	return value == null ? "" : String(value);
};

describe("layouts", () => {
	const routes: RouteDefinition[] = [
		{
			path: "/",
			component: (p: RouteProps) => `<site>${text(p.children)}</site>`,
			children: [
				{ path: "", component: () => "home" },
				{
					path: "blog",
					component: (p: RouteProps) => `<blog>${text(p.children)}</blog>`,
					children: [
						{ path: "", component: () => "index" },
						{ path: ":slug", component: (p: RouteProps) => `post:${p.params["slug"]}` },
					],
				},
			],
		},
	];

	test("nested layouts wrap the matched page", () => {
		const router = createRouter({ routes, history: memoryHistory("/blog/hello") });
		expect(text(router.Outlet())).toBe("<site><blog>post:hello</blog></site>");
		router.navigate("/blog");
		expect(text(router.Outlet())).toBe("<site><blog>index</blog></site>");
		router.navigate("/");
		expect(text(router.Outlet())).toBe("<site>home</site>");
		expect(router.matched()?.chain.map((r) => r.path)).toEqual(["/", ""]);
	});
});

describe("lazy routes and data", () => {
	test("lazy components load before the route commits", async () => {
		let loads = 0;
		const router = createRouter({
			history: memoryHistory("/"),
			routes: [
				{ path: "/", component: () => "home" },
				{
					path: "/about",
					lazy: async () => {
						loads += 1;
						return { default: () => "about (lazy)" };
					},
				},
			],
		});
		const done = router.navigate("/about");
		expect(router.location().pathname).toBe("/");
		expect(router.pending()).toBe(true);
		await done;
		expect(router.pending()).toBe(false);
		expect(text(router.Outlet())).toBe("about (lazy)");
		await router.navigate("/");
		await router.navigate("/about");
		expect(loads).toBe(1);
	});

	test("loaders provide data; the latest navigation wins", async () => {
		const gates = new Map<string, (value: unknown) => void>();
		const router = createRouter({
			history: memoryHistory("/"),
			routes: [
				{ path: "/", component: () => "home" },
				{
					path: "/users/:id",
					component: (p: RouteProps) => `user ${(p.data as { name: string }).name}`,
				},
			],
			load: (match) =>
				match.pathname === "/"
					? undefined
					: new Promise((resolve) => gates.set(match.params["id"] ?? "", resolve)),
		});
		const slow = router.navigate("/users/1");
		const fast = router.navigate("/users/2");
		gates.get("2")?.({ name: "Bea" });
		await fast;
		gates.get("1")?.({ name: "Ann" });
		await slow;
		expect(router.location().pathname).toBe("/users/2");
		expect(text(router.Outlet())).toBe("user Bea");
	});

	test("ready resolves the initial route; initialData skips the first load", async () => {
		let calls = 0;
		const routes = [{ path: "/p/:id", component: (p: RouteProps) => `p${text(p.data)}` }];
		const load = () => {
			calls += 1;
			return "!";
		};
		const server = createRouter({ routes, history: memoryHistory("/p/1"), load });
		await server.ready;
		expect(text(server.Outlet())).toBe("p!");
		const hydrated = createRouter({
			routes,
			history: memoryHistory("/p/1"),
			load,
			initialData: "?",
		});
		await hydrated.ready;
		expect(text(hydrated.Outlet())).toBe("p?");
		expect(calls).toBe(1);
	});

	test("initialError hydrates a server-rendered error page without loading", async () => {
		let calls = 0;
		const router = createRouter({
			history: memoryHistory("/private"),
			routes: [{ path: "/private", component: () => "secret" }],
			load: () => {
				calls += 1;
			},
			initialData: null,
			initialError: { status: 401, message: "Sign in" },
			error: (p) => `error: ${(p.error as { message: string }).message}`,
		});
		await router.ready;
		expect(text(router.Outlet())).toBe("error: Sign in");
		expect(calls).toBe(0);
	});

	test("initialNotFound hydrates a static 404 page served at a URL a route would match", async () => {
		let calls = 0;
		const router = createRouter({
			history: memoryHistory("/docs/missing"),
			routes: [{ path: "/docs/*slug", component: () => "doc" }],
			load: () => {
				calls += 1;
			},
			initialData: null,
			initialNotFound: true,
			fallback: () => "no such page",
		});
		await router.ready;
		expect(text(router.Outlet())).toBe("no such page");
		expect(router.matched()).toBeNull();
		expect(calls).toBe(0);
		await router.navigate("/docs/real");
		expect(text(router.Outlet())).toBe("doc");
	});

	test("loader errors reach the error component", async () => {
		const router = createRouter({
			history: memoryHistory("/"),
			routes: [
				{ path: "/", component: () => "home" },
				{ path: "/broken", component: () => "never" },
			],
			load: (match) => {
				if (match.pathname === "/broken") throw new Error("database down");
			},
			error: (p) => `error: ${(p.error as Error).message}`,
		});
		await router.navigate("/broken");
		expect(text(router.Outlet())).toBe("error: database down");
	});

	test("without an error component, a failed load shows the default error, never the page without data", async () => {
		const quiet = console.error;
		console.error = () => {};
		let pageRenders = 0;
		const router = createRouter({
			history: memoryHistory("/"),
			routes: [
				{ path: "/", component: () => "home" },
				{
					path: "/keys/:id",
					component: (p: RouteProps) => {
						pageRenders++;
						return `key ${(p.data as { key: string }).key}`;
					},
				},
			],
			load: (match) => {
				if (match.pathname === "/keys/1") return Promise.reject(new Error("rate limited"));
				return { key: "ok" };
			},
		});
		try {
			await router.navigate("/keys/1");
			const out = router.Outlet();
			expect(pageRenders).toBe(0);
			expect(router.error()).toBeInstanceOf(Error);
			expect(out).toBeTruthy();
			// Back on a route that loads, the page renders with its data.
			await router.navigate("/keys/2");
			expect(text(router.Outlet())).toBe("key ok");
		} finally {
			console.error = quiet;
			router.dispose();
		}
	});
});

describe("error and not-found pages keep the layout", () => {
	test("errors render inside the page's layouts; 404s inside the root layout", async () => {
		const router = createRouter({
			history: memoryHistory("/"),
			routes: [
				{
					path: "/",
					component: (p: RouteProps) => `<shell>${text(p.children)}</shell>`,
					children: [
						{ path: "", component: () => "home" },
						{ path: "private", component: () => "secret" },
					],
				},
			],
			load: (match) => {
				if (match.pathname === "/private") throw new Error("sign in");
			},
			error: (p) => `error: ${(p.error as Error).message}`,
			fallback: () => "not found",
		});
		await router.navigate("/private");
		expect(text(router.Outlet())).toBe("<shell>error: sign in</shell>");
		await router.navigate("/missing");
		expect(text(router.Outlet())).toBe("<shell>not found</shell>");
	});
});

describe("head", () => {
	test("merges route heads from outer to inner and applies the title template", async () => {
		const router = createRouter({
			titleTemplate: "%s · Arachne",
			history: memoryHistory("/blog/hello"),
			routes: [
				{
					path: "/blog",
					head: { title: "Blog", meta: [{ name: "description", content: "All posts" }] },
					component: (p: RouteProps) => p.children,
					children: [
						{
							path: ":slug",
							head: ({ params }) => ({
								title: `Post ${params["slug"]}`,
								meta: [
									{ name: "description", content: `About ${params["slug"]}` },
									{ property: "og:type", content: "article" },
								],
							}),
							component: () => "post",
						},
					],
				},
			],
		});
		expect(router.head()).toEqual({
			title: "Post hello · Arachne",
			meta: [
				{ name: "description", content: "About hello" },
				{ property: "og:type", content: "article" },
			],
			links: [],
		});
		expect(renderHead(router.head())).toBe(
			'<title>Post hello · Arachne</title><meta name="description" content="About hello"><meta property="og:type" content="article">',
		);
	});

	test("renderHead escapes values", () => {
		expect(renderHead({ title: "<x>", meta: [{ name: "d", content: '"q"' }], links: [] })).toBe(
			'<title>&lt;x&gt;</title><meta name="d" content="&quot;q&quot;">',
		);
	});
});

describe("base path", () => {
	test("routes under a base and builds prefixed hrefs", () => {
		const router = createRouter({
			base: "/docs",
			history: memoryHistory("/docs/guide"),
			routes: [
				{ path: "/", component: () => "root" },
				{ path: "/guide", component: () => "guide" },
			],
		});
		expect(text(router.Outlet())).toBe("guide");
		expect(router.href("/guide?x=1")).toBe("/docs/guide?x=1");
		router.navigate("/");
		expect(router.location().pathname).toBe("/");
		expect(text(router.Outlet())).toBe("root");
	});
});

describe("in the browser", () => {
	let win: Window;
	beforeEach(() => {
		win = new Window({ url: "https://site.test/" });
		Object.assign(globalThis, {
			window: win,
			document: win.document,
			HTMLElement: win.HTMLElement,
			MouseEvent: win.MouseEvent,
		});
	});
	afterEach(() => {
		win.close();
	});

	const click = (el: Element, init: Record<string, unknown> = {}) => {
		const event = new win.MouseEvent("click", {
			bubbles: true,
			cancelable: true,
			button: 0,
			...init,
		} as never);
		el.dispatchEvent(event as unknown as Event);
		return event;
	};

	test("shouldIntercept only takes plain same-origin left clicks on known routes", () => {
		const a = win.document.createElement("a");
		win.document.body.appendChild(a);
		const known = (path: string) => path === "/about";
		const check = (
			href: string,
			init: Record<string, unknown> = {},
			attrs: Record<string, string> = {},
		) => {
			a.setAttribute("href", href);
			for (const name of ["target", "download", "rel"]) a.removeAttribute(name);
			for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
			const event = new win.MouseEvent("click", {
				bubbles: true,
				cancelable: true,
				button: 0,
				...init,
			} as never);
			return shouldIntercept(
				event as unknown as MouseEvent,
				a as unknown as HTMLAnchorElement,
				known,
				"https://site.test",
			);
		};
		expect(check("/about")).toBe(true);
		expect(check("https://site.test/about")).toBe(true);
		expect(check("/about", { metaKey: true })).toBe(false);
		expect(check("/about", { ctrlKey: true })).toBe(false);
		expect(check("/about", { button: 1 })).toBe(false);
		expect(check("/about", {}, { target: "_blank" })).toBe(false);
		expect(check("/about", {}, { download: "" })).toBe(false);
		expect(check("/about", {}, { rel: "external" })).toBe(false);
		expect(check("https://other.test/about")).toBe(false);
		expect(check("/api/data")).toBe(false);
		expect(check("mailto:a@b.co")).toBe(false);
	});

	test("interceptLinks routes plain anchors and leaves others alone", async () => {
		const { browserHistory } = await import("./index.ts");
		const router = createRouter({
			history: browserHistory(win as never),
			routes: [
				{ path: "/", component: () => "home" },
				{ path: "/about", component: () => "about" },
			],
			scroll: false,
		});
		const stop = router.interceptLinks(win.document as unknown as Document);
		win.document.body.innerHTML =
			'<a id="in" href="/about">About</a><a id="out" href="/files/x.pdf">PDF</a>';
		const inside = click(win.document.getElementById("in") as unknown as Element);
		expect(inside.defaultPrevented).toBe(true);
		await Promise.resolve();
		expect(win.location.pathname).toBe("/about");
		expect(text(router.Outlet())).toBe("about");
		const outside = click(win.document.getElementById("out") as unknown as Element);
		expect(outside.defaultPrevented).toBe(false);
		stop();
		router.dispose();
	});

	test("navigation scrolls to the top or to the hash target", async () => {
		const { browserHistory } = await import("./index.ts");
		const scrolls: unknown[] = [];
		win.scrollTo = ((x: number, y: number) => scrolls.push([x, y])) as never;
		win.document.body.innerHTML = '<h2 id="api">API</h2>';
		const target = win.document.getElementById("api") as unknown as { scrollIntoView: () => void };
		target.scrollIntoView = () => scrolls.push("api");
		const router = createRouter({
			history: browserHistory(win as never),
			routes: [
				{ path: "/docs", component: () => "docs" },
				{ path: "/", component: () => "home" },
			],
		});
		await router.navigate("/docs");
		await router.navigate("/docs#api");
		expect(scrolls).toEqual([[0, 0], "api"]);
		router.dispose();
	});
});
