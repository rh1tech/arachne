import { omitProps } from "@arachne/render";
import { shouldIntercept } from "./links.ts";
import { currentRouter, type Router } from "./router.ts";

/** Props for {@link Link}. Other attributes are passed to the `<a>`. */
export interface LinkProps {
	/** App path (`/blog/hello`, `?page=2`, `#section`) or an absolute URL. */
	href: string;
	/** Replace the current history entry instead of pushing. */
	replace?: boolean | undefined;
	/** Load the target route's code and data on hover/focus. Default `true`. */
	prefetch?: boolean | undefined;
	/** Class names. */
	class?: string | undefined;
	/** Extra class when the link matches the current path. Default `active`. */
	activeClass?: string | undefined;
	/** Match the current path exactly (default) or by prefix (`false`). */
	exact?: boolean | undefined;
	/** Router to use. Default: the most recently created router. */
	router?: Router | undefined;
	/** Link content. */
	children?: unknown;
	/** Other anchor attributes. */
	[attribute: string]: unknown;
}

const OWN = [
	"href",
	"replace",
	"prefetch",
	"class",
	"activeClass",
	"exact",
	"router",
	"children",
] as const;

/**
 * An `<a>` that navigates client-side. Works without JavaScript (it is a
 * real link, server-rendered with the base path), marks itself
 * `aria-current="page"` when active, and prefetches on intent.
 */
export function Link(props: LinkProps) {
	const rest = omitProps(props, OWN);
	const router = () => props.router ?? currentRouter();
	const url = () => router()?.href(props.href) ?? props.href;
	const active = () => {
		const r = router();
		if (!r || !props.href.startsWith("/")) return false;
		const path = props.href.split(/[?#]/)[0] ?? "/";
		const current = r.location().pathname;
		return props.exact === false
			? current === path || current.startsWith(`${path.replace(/\/$/, "")}/`)
			: current === path;
	};
	const onClick = (event: MouseEvent) => {
		const r = router();
		const anchor = event.currentTarget as HTMLAnchorElement;
		if (
			!r ||
			!shouldIntercept(event, anchor, () => r.resolve(props.href) !== null, window.location.origin)
		)
			return;
		event.preventDefault();
		void r.navigate(props.href, { replace: props.replace === true });
	};
	const onIntent = () => {
		if (props.prefetch !== false && props.href.startsWith("/")) void router()?.preload(props.href);
	};
	return (
		<a
			{...rest}
			href={url()}
			class={
				[props.class, active() ? (props.activeClass ?? "active") : undefined]
					.filter(Boolean)
					.join(" ") || undefined
			}
			aria-current={active() ? "page" : undefined}
			onClick={onClick}
			onMouseEnter={onIntent}
			onFocus={onIntent}
		>
			{props.children}
		</a>
	);
}
