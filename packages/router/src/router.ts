import { createComponent } from "@arachne/render";
import { computed, effect, signal } from "@arachne/signals";
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
		match: match(initialLocation),
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
			{ ...state(), ...result, ...(hydrating ? { data: options.initialData } : {}) },
			"initial",
		);
	const ready = isPromise<{ data: unknown; error: unknown }>(initialWork)
		? initialWork.then(initial)
		: (initial(initialWork), Promise.resolve());

	const head = computed((): Head => {
		const { match: m, data, location } = state();
		const inputs = (m?.chain ?? [])
			.map((route) =>
				typeof route.head === "function"
					? route.head({ params: m?.params ?? {}, data, location })
					: route.head,
			)
			.filter((input): input is HeadInput => input !== undefined);
		return mergeHeads(inputs, options.titleTemplate);
	});
	const stopHead = inBrowser ? effect(() => applyHead(document, head())) : () => {};

	const render = (): unknown => {
		const { match: m, location, data, error } = state();
		if (error !== undefined && options.error) {
			return createComponent(options.error, { params: m?.params ?? {}, location, data, error });
		}
		if (!m)
			return options.fallback ? createComponent(options.fallback, { params: {}, location }) : null;
		let node: unknown;
		for (let i = m.chain.length - 1; i >= 0; i -= 1) {
			const component = componentOf(m.chain[i] as RouteDefinition);
			if (!component) continue;
			const props: RouteProps = { params: m.params, location, data };
			if (node !== undefined) props.children = node;
			node = createComponent(component, props);
		}
		return node ?? null;
	};

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
