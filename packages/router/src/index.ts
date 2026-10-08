export { DefaultErrorPage } from "./default-error.tsx";
export {
	applyHead,
	type Head,
	type HeadInput,
	type HeadLink,
	type HeadMeta,
	mergeHeads,
	renderHead,
} from "./head.ts";
export {
	browserHistory,
	type HistoryLocation,
	memoryHistory,
	type RouterHistory,
} from "./history.ts";
export { Link, type LinkProps } from "./link.tsx";
export { shouldIntercept } from "./links.ts";
export {
	type CompiledPath,
	compilePath,
	normalizePathname,
	type PathMatch,
	type PathParams,
	parseLocation,
} from "./path.ts";
export {
	type CreateRouterOptions,
	createRouter,
	currentRouter,
	type ErrorProps,
	type HeadContext,
	type LazyComponent,
	listRoutes,
	type MatchedRoute,
	type RouteComponent,
	type RouteDefinition,
	type RouteEntry,
	type RouteProps,
	type Router,
	withRouter,
} from "./router.ts";
