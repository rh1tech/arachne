import { createComponent } from "@arachnejs/render";
import { computed, effect, signal, untrack } from "@arachnejs/signals";
import { applyHead, type Head, type HeadInput, mergeHeads } from "./head.ts";
import { type HistoryLocation, memoryHistory, type RouterHistory } from "./history.ts";
import { shouldIntercept } from "./links.ts";
import { compilePath, type PathParams, parseLocation } from "./path.ts";

/** Props every route component (page or layout) receives. */
export interface RouteProps {
	/** Path params of the match. */
	params: PathParams;
	/** Current location (base path removed). */
	location: HistoryLocation;
	/** Data from the router's `load` function (or `initialData`). */
	data?: unknown;
	/** For layouts: the rendered child route. */
	children?: unknown;
}

/** A page or layout component. */
export type RouteComponent = (props: RouteProps) => unknown;

/** Props of the `error` component. */
export interface ErrorProps extends RouteProps {
	/** What the loader or lazy import threw. */
	error: unknown;
}

/** A lazily imported component module (`() => import("./Page.tsx")`). */
export type LazyComponent = () => Promise<{ default: RouteComponent } | RouteComponent>;

/** Context for a dynamic `head`. */
export interface HeadContext {
	/** Path params. */
	params: PathParams;
	/** Loaded data. */
	data: unknown;
	/** Location. */
	location: HistoryLocation;
}

/**
 * A route. With `children`, `component` is a layout that receives the child
 * as `props.children`; a child with `path: ""` is the index page.
 */
export interface RouteDefinition {
	/** Path pattern, relative to the parent (`:param`, trailing `*rest`). */
	path: string;
	/** Page or layout component. */
	component?: RouteComponent | undefined;
	/** Code-split component, loaded before the route renders. */
	lazy?: LazyComponent | undefined;
	/** Child routes. */
	children?: RouteDefinition[] | undefined;
	/** Head tags, static or computed from params and data. */
	head?: HeadInput | ((ctx: HeadContext) => HeadInput) | undefined;
	/** Id for loaders and build tools. Default: the full path pattern. */
	id?: string | undefined;
}

/** The route chain matched for a location. */
export interface MatchedRoute {
	/** The innermost route (the page). */
	definition: RouteDefinition;
	/** Outer to inner: layouts, then the page. */
	chain: RouteDefinition[];
	/** Full pattern, e.g. `/blog/:slug`. */
	pattern: string;
	/** Route id (`definition.id` or the pattern). */
	id: string;
	/** Path params. */
	params: PathParams;
	/** Matched pathname (base removed). */
	pathname: string;
	/** Query string of the location (`?a=1`). */
	search: string;
}

/** Options for {@link createRouter}. */
export interface CreateRouterOptions {
	/** Route table. */
	routes: RouteDefinition[];
	/** Location source. Default `memoryHistory("/")`. */
	history?: RouterHistory | undefined;
	/** Rendered when no route matches. */
	fallback?: RouteComponent | undefined;
	/** Rendered when a loader or lazy import fails. */
	error?: ((props: ErrorProps) => unknown) | undefined;
	/** Load data for a match (server: database; client: fetch JSON). */
	load?: ((match: MatchedRoute) => unknown) | undefined;
	/** Data for the first route (from server-rendered HTML), skipping its load. */
	initialData?: unknown;
	/** Loader error the server rendered for the first route (hydration of error pages). */
	initialError?: unknown;
	/**
	 * The HTML being hydrated is the not-found page (a static host's `404.html`
	 * served at a URL a dynamic route would match): render `fallback` first.
	 */
	initialNotFound?: boolean;
	/** Path prefix the app is mounted at (`/docs` for `site.com/docs/*`). */
	base?: string | undefined;
	/** Title template, e.g. `"%s · Site"`. */
	titleTemplate?: string | undefined;
	/** Scroll to top / hash target on navigation (browser only). Default `true`. */
	scroll?: boolean | undefined;
}

/** Router state and navigation. */
export interface Router {
	/** Current location (base removed). */
	readonly location: () => HistoryLocation;
	/** Current params. */
	readonly params: () => PathParams;
	/** Current match, or `null`. */
	readonly matched: () => MatchedRoute | null;
	/** Data for the current route. */
	readonly data: () => unknown;
	/** Error from the last load, if any. */
	readonly error: () => unknown;
	/** A navigation is loading. */
	readonly pending: () => boolean;
	/** Merged head for the current route. */
	readonly head: () => Head;
	/** Resolves when the initial route (lazy parts and data) is ready. */
	readonly ready: Promise<void>;
	/** Go to an app path; resolves once the new route has rendered. */
	navigate: (to: string, options?: { replace?: boolean }) => Promise<void>;
	/** History back. */
	back: () => void;
	/** App path → URL with the base prefix. */
	href: (to: string) => string;
	/** Match an app path without navigating. */
	resolve: (to: string) => MatchedRoute | null;
	/** Load a path's lazy components (and data) ahead of time. */
	preload: (to: string) => Promise<void>;
	/** Route clicks on plain `<a>` tags inside `root` (default `document`). Returns a cleanup. */
	interceptLinks: (root?: Document | Element) => () => void;
	/** Render the current route (layouts wrapping the page) or the fallback. Use as `{router.Outlet()}`. */
	Outlet: () => unknown;
	/** Component form of {@link Router.Outlet} for `<router.View />` (returns a live accessor). */
	View: () => () => unknown;
	/** Stop listening to history. */
	dispose: () => void;
}

interface Entry {
	chain: RouteDefinition[];
	pattern: string;
	compiled: ReturnType<typeof compilePath>;
}

interface State {
	location: HistoryLocation;
	match: MatchedRoute | null;
	data: unknown;
	error: unknown;
}

function join(parent: string, path: string): string {
	if (path.startsWith("/")) return path;
	const joined = `${parent.replace(/\/$/, "")}/${path}`.replace(/\/+/g, "/");
	return joined.length > 1 ? joined.replace(/\/$/, "") : "/";
}

function flatten(
	routes: RouteDefinition[],
	parent = "",
	ancestors: RouteDefinition[] = [],
): Entry[] {
	const out: Entry[] = [];
	for (const route of routes) {
		const pattern = join(parent || "/", route.path);
		const chain = [...ancestors, route];
		if (route.children?.length) {
			out.push(...flatten(route.children, pattern, chain));
			const hasIndex = route.children.some((child) => child.path === "");
			if (!hasIndex && (route.component || route.lazy))
				out.push({ chain, pattern, compiled: compilePath(pattern) });
		} else if (route.component || route.lazy) {
			out.push({ chain, pattern, compiled: compilePath(pattern) });
		}
	}
	return out;
}

/** One page route in a route table (as build tools see it). */
export interface RouteEntry {
	/** Route id (`id` or the full pattern). */
	id: string;
	/** Full pattern, e.g. `/blog/:slug`. */
	pattern: string;
	/** Has `:params` or a `*rest`: needs params to build a URL. */
	dynamic: boolean;
}

/** Every page route of a table, in match order (for prerendering and tooling). */
export function listRoutes(routes: RouteDefinition[]): RouteEntry[] {
	return flatten(routes).map((entry) => {
		const leaf = entry.chain[entry.chain.length - 1] as RouteDefinition;
		return {
			id: leaf.id ?? entry.pattern,
			pattern: entry.pattern,
			dynamic: /[:*]/.test(entry.pattern),
		};
	});
}

const resolvedLazy = new WeakMap<RouteDefinition, RouteComponent>();

function componentOf(route: RouteDefinition): RouteComponent | undefined {
	return route.component ?? resolvedLazy.get(route);
}

function isPromise<T>(value: unknown): value is Promise<T> {
	return typeof (value as { then?: unknown } | null)?.then === "function";
}

let current: Router | undefined;

/** The most recently created router (used by `Link` when no router prop is given). */
export function currentRouter(): Router | undefined {
	return current;
}

/**
 * Run `fn` with `router` as the current router, then restore the previous
 * one. Servers rendering concurrent requests wrap each synchronous render in
 * it so `Link`s resolve against their own request's router.
 */
export function withRouter<T>(router: Router, fn: () => T): T {
	const previous = current;
	current = router;
	try {
		return fn();
	} finally {
		current = previous;
	}
}

/**
 * Create a router. Without lazy routes or a loader, navigation is
 * synchronous; otherwise the URL and view switch together once the next
 * route is ready, and stale navigations are dropped.
 */
export function createRouter(options: CreateRouterOptions): Router {
	const history = options.history ?? memoryHistory("/");
	const base = (options.base ?? "").replace(/\/$/, "");
	const entries = flatten(options.routes);
	const inBrowser = typeof window !== "undefined" && typeof document !== "undefined";

	const strip = (location: HistoryLocation): HistoryLocation => {
		if (!base || !location.pathname.startsWith(base)) return location;
		const pathname = location.pathname.slice(base.length) || "/";
		return { ...location, pathname, href: `${pathname}${location.search}${location.hash}` };
	};
	const href = (to: string) =>
		base && to.startsWith("/") ? `${base}${to === "/" ? "" : to}` || "/" : to;

	const match = (location: HistoryLocation): MatchedRoute | null => {
		for (const entry of entries) {
			const hit = entry.compiled.match(location.pathname);
			if (!hit) continue;
			const definition = entry.chain[entry.chain.length - 1] as RouteDefinition;
			return {
				definition,
				chain: entry.chain,
				pattern: entry.pattern,
				id: definition.id ?? entry.pattern,
				params: hit.params,
				pathname: hit.pathname,
				search: location.search,
			};
		}
		return null;
	};
	const locate = (to: string) => {
		const { pathname, search, hash } = parseLocation(to);
		return {
			pathname,
			search,
			hash,
			href: `${pathname}${search}${hash}`,
		} satisfies HistoryLocation;
	};

	/** Resolve lazy components and data; sync when there is nothing to wait for. */
	const prepare = (
		target: MatchedRoute | null,
		withData = true,
	): { data: unknown; error: unknown } | Promise<{ data: unknown; error: unknown }> => {
		if (!target) return { data: undefined, error: undefined };
		try {
			const lazy = target.chain
				.filter((route) => route.lazy && !resolvedLazy.has(route))
				.map(async (route) => {
					const mod = await (route.lazy as LazyComponent)();
					resolvedLazy.set(route, typeof mod === "function" ? mod : mod.default);
				});
			const data = withData ? options.load?.(target) : undefined;
			if (lazy.length === 0 && !isPromise(data)) return { data, error: undefined };
			return Promise.all([Promise.all(lazy), data]).then(
				([, value]) => ({ data: value, error: undefined }),
				(error: unknown) => ({ data: undefined, error }),
			);
		} catch (error) {
			return { data: undefined, error };
		}
	};

	const initialLocation = strip(history.location);
	const state = signal<State>({
		location: initialLocation,
		match: options.initialNotFound ? null : match(initialLocation),
		data: options.initialData,
		error: undefined,
	});
	const pending = signal(false);
	let navigation = 0;
	let expected: (State & { href: string }) | undefined;
	const scrollPositions = new Map<string, number>();

	const scrollAfter = (next: State, kind: "push" | "pop") => {
		if (!inBrowser || options.scroll === false) return;
		const id = next.location.hash.slice(1);
		const target = id ? document.getElementById(decodeURIComponent(id)) : null;
		if (target) target.scrollIntoView?.();
		else if (kind === "pop") window.scrollTo?.(0, scrollPositions.get(next.location.href) ?? 0);
		else window.scrollTo?.(0, 0);
	};

	const commit = (next: State, kind: "push" | "pop" | "initial") => {
		if (inBrowser && kind !== "initial")
			scrollPositions.set(state().location.href, window.scrollY ?? 0);
		state.set(next);
		if (kind !== "initial") scrollAfter(next, kind);
	};

	const stop = history.listen((raw) => {
		const location = strip(raw);
		if (expected && expected.href === raw.href) {
			const next = expected;
			expected = undefined;
			commit({ location, match: next.match, data: next.data, error: next.error }, "push");
			return;
		}
		// Back/forward or an external push: load, then switch.
		const id = ++navigation;
		const target = match(location);
		const work = prepare(target);
		const apply = (result: { data: unknown; error: unknown }) => {
			if (id !== navigation) return;
			pending.set(false);
			commit({ location, match: target, ...result }, "pop");
		};
		if (isPromise<{ data: unknown; error: unknown }>(work)) {
			pending.set(true);
			void work.then(apply);
		} else apply(work);
	});

	const navigate: Router["navigate"] = (to, navOptions) => {
		const id = ++navigation;
		const location = locate(to);
		const target = match(location);
		const work = prepare(target);
		const go = (result: { data: unknown; error: unknown }) => {
			if (id !== navigation) return;
			pending.set(false);
			const url = href(location.href);
			expected = { location, match: target, ...result, href: locate(url).href };
			if (navOptions?.replace) history.replace(url);
			else history.push(url);
		};
		if (isPromise<{ data: unknown; error: unknown }>(work)) {
			pending.set(true);
			return work.then(go);
		}
		go(work);
		return Promise.resolve();
	};

	// With initialData (hydration), only lazy components load; the data is already here.
	const hydrating = options.initialData !== undefined;
	const initialWork = prepare(state().match, !hydrating);
	const initial = (result: { data: unknown; error: unknown }) =>
		commit(
			{
				...state(),
				...result,
				...(hydrating
					? { data: options.initialData, error: result.error ?? options.initialError }
					: {}),
			},
			"initial",
		);
	const ready = isPromise<{ data: unknown; error: unknown }>(initialWork)
		? initialWork.then(initial)
		: (initial(initialWork), Promise.resolve());

	const head = computed((): Head => {
		const { match: m, data, location, error } = state();
		const inputs: HeadInput[] = [];
		for (const route of m?.chain ?? []) {
			if (typeof route.head !== "function") {
				if (route.head) inputs.push(route.head);
				continue;
			}
			// A failed load has no data to describe, and a head must never break rendering.
			if (error !== undefined) continue;
			try {
				inputs.push(route.head({ params: m?.params ?? {}, data, location }));
			} catch (headError) {
				console.error("[router] head() failed", headError);
			}
		}
		return mergeHeads(inputs, options.titleTemplate);
	});
	const stopHead = inBrowser ? effect(() => applyHead(document, head())) : () => {};

	// Top-level layouts (`/` routes with children) frame the not-found page.
	const rootLayouts = options.routes.filter(
		(route) =>
			(route.path === "/" || route.path === "") &&
			route.children?.length &&
			(route.component || route.lazy),
	);

	/**
	 * What to render: the layouts around the page (outermost first) and the
	 * page itself. Layouts are keyed by their route definition.
	 */
	type Frames = { layouts: RouteDefinition[]; page: () => unknown };
	const withComponent = (chain: RouteDefinition[]) => chain.filter((r) => componentOf(r));
	const frames = computed((): Frames => {
		const { match: m, location, data, error } = state();
		if (error !== undefined && options.error) {
			const errorPage = options.error;
			const props = { params: m?.params ?? {}, location, data };
			return {
				layouts: withComponent(m ? m.chain.slice(0, -1) : []),
				page: () => createComponent(errorPage, { ...props, error }),
			};
		}
		if (!m) {
			const fallback = options.fallback;
			if (!fallback) return { layouts: [], page: () => null };
			return {
				layouts: withComponent(rootLayouts),
				page: () => createComponent(fallback, { params: {}, location }),
			};
		}
		const chain = withComponent(m.chain);
		const leaf = chain[chain.length - 1];
		const component = leaf && componentOf(leaf);
		return {
			layouts: chain.slice(0, -1),
			page: () =>
				component ? createComponent(component, { params: m.params, location, data }) : null,
		};
	});

	// Props for a mounted layout: live getters, since the layout isn't
	// re-created while its children change.
	const layoutProps = (children: () => unknown): RouteProps => ({
		get params() {
			return state().match?.params ?? {};
		},
		get location() {
			return state().location;
		},
		get data() {
			return state().data;
		},
		children,
	});

	/**
	 * The view from chain depth `depth` down. A layout is created once and
	 * stays mounted while the same route definition is at its depth (its DOM,
	 * scroll positions and local state survive navigations between its
	 * children); only the part below it re-renders. The page is re-created on
	 * every navigation.
	 */
	const level = (depth: number): (() => unknown) => {
		const layout = computed(() => frames().layouts[depth]);
		return () => {
			const definition = layout();
			if (!definition) return frames().page();
			const component = componentOf(definition) as RouteComponent;
			return untrack(() => createComponent(component, layoutProps(level(depth + 1))));
		};
	};

	const render = (): unknown => level(0)();

	const router: Router = {
		location: () => state().location,
		params: () => state().match?.params ?? {},
		matched: () => state().match,
		data: () => state().data,
		error: () => state().error,
		pending: () => pending(),
		head: () => head(),
		ready,
		navigate,
		back: () => history.back(),
		href,
		resolve: (to) => match(locate(to)),
		async preload(to) {
			await prepare(match(locate(to)));
		},
		interceptLinks(root) {
			const target = root ?? document;
			const known = (pathname: string) => {
				if (base && !pathname.startsWith(base)) return false;
				return match(locate(base ? pathname.slice(base.length) || "/" : pathname)) !== null;
			};
			const onClick = (event: Event) => {
				const anchor = (event.target as Element | null)?.closest?.("a");
				if (
					!anchor ||
					!shouldIntercept(
						event as MouseEvent,
						anchor as HTMLAnchorElement,
						known,
						window.location.origin,
					)
				)
					return;
				event.preventDefault();
				const url = new URL(anchor.getAttribute("href") ?? "/", window.location.href);
				const appPath = base ? url.pathname.slice(base.length) || "/" : url.pathname;
				void navigate(`${appPath}${url.search}${url.hash}`);
			};
			target.addEventListener("click", onClick);
			return () => target.removeEventListener("click", onClick);
		},
		// Called in a reactive scope (a JSX expression), `Outlet()` re-renders on navigation.
		Outlet: () => render(),
		// Components run untracked once, so the component form returns an accessor instead.
		View: () => () => render(),
		dispose() {
			stop();
			stopHead();
			if (current === router) current = undefined;
		},
	};
	current = router;
	return router;
}
