import { createComponent } from "@arachne/render";
import { computed, signal } from "@arachne/signals";
import { type HistoryLocation, memoryHistory, type RouterHistory } from "./history.ts";
import { compilePath, type PathParams } from "./path.ts";

export type RouteComponent = (props: RouteProps) => unknown;

export interface RouteProps {
	params: PathParams;
	location: HistoryLocation;
	children?: unknown;
}

export interface RouteDefinition {
	path: string;
	component?: RouteComponent | undefined;
	children?: RouteDefinition[] | undefined;
}

export interface MatchedRoute {
	definition: RouteDefinition;
	params: PathParams;
	pathname: string;
}

export interface Router {
	readonly location: () => HistoryLocation;
	readonly params: () => PathParams;
	readonly matched: () => MatchedRoute | null;
	navigate: (to: string, options?: { replace?: boolean }) => void;
	back: () => void;
	/** Render the matched route component (or fallback). */
	Outlet: () => unknown;
	dispose: () => void;
}

export interface CreateRouterOptions {
	routes: RouteDefinition[];
	history?: RouterHistory | undefined;
	/** Rendered when no route matches. */
	fallback?: RouteComponent | undefined;
}

interface FlatRoute {
	definition: RouteDefinition;
	compiled: ReturnType<typeof compilePath>;
}

function flattenRoutes(routes: RouteDefinition[], parent = ""): FlatRoute[] {
	const out: FlatRoute[] = [];
	for (const route of routes) {
		const joined = route.path.startsWith("/")
			? route.path
			: `${parent.replace(/\/$/, "")}/${route.path}`.replace(/\/+/g, "/");
		const pattern = joined === "" ? "/" : joined;
		if (route.component) {
			out.push({ definition: route, compiled: compilePath(pattern) });
		}
		if (route.children?.length) {
			out.push(...flattenRoutes(route.children, pattern));
		}
	}
	return out;
}

export function createRouter(options: CreateRouterOptions): Router {
	const history = options.history ?? memoryHistory("/");
	const flat = flattenRoutes(options.routes);
	const location = signal(history.location);
	const stop = history.listen((next) => {
		location.set(next);
	});

	const matched = computed(() => {
		const loc = location();
		for (const route of flat) {
			const hit = route.compiled.match(loc.pathname);
			if (hit) {
				return {
					definition: route.definition,
					params: hit.params,
					pathname: hit.pathname,
				} satisfies MatchedRoute;
			}
		}
		return null;
	});

	const params = computed(() => matched()?.params ?? {});

	const Outlet = (): unknown => {
		const current = matched();
		const loc = location();
		const Comp = current?.definition.component ?? options.fallback;
		if (!Comp) return null;
		return createComponent(Comp, {
			params: current?.params ?? {},
			location: loc,
		});
	};

	return {
		location: () => location(),
		params: () => params(),
		matched: () => matched(),
		navigate(to, navOptions) {
			if (navOptions?.replace) history.replace(to);
			else history.push(to);
		},
		back() {
			history.back();
		},
		Outlet,
		dispose() {
			stop();
		},
	};
}
