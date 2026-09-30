import { currentRouter, Link, type RouteProps } from "@arachnejs/router";
import kit from "../../../../packages/kit/package.json" with { type: "json" };
import { SITE } from "../site.ts";
import { Mark } from "./Mark.tsx";
import { Search } from "./Search.tsx";

/** Header links: label, target, and which paths count as "inside" it. */
const NAV = [
	{
		label: "Docs",
		href: "/docs",
		match: (p: string) => p.startsWith("/docs") && !p.startsWith("/docs/packages/"),
	},
	{
		label: "Packages",
		href: "/docs/packages/kit",
		match: (p: string) => p.startsWith("/docs/packages/"),
	},
];

/** The current app path (reactive in the browser). */
export const pathname = () => currentRouter()?.location().pathname ?? "/";

/** Root layout: header with search, the page, and the colophon. */
export function Shell(props: RouteProps) {
	return (
		<>
			<a class="skip" href="#main">
				Skip to content
			</a>
			<header class="site-header">
				<Link href="/" class="wordmark" aria-label="Arachne home">
					<Mark />
					<span>arachne</span>
				</Link>
				<span class="version" title="Pre-release: APIs can still change">
					{kit.version} · pre-release
				</span>
				<nav class="site-nav" aria-label="Site">
					{NAV.map((item) => (
						<a href={item.href} aria-current={item.match(pathname()) ? "page" : undefined}>
							{item.label}
						</a>
					))}
					{SITE.sourceUrl ? (
						<a
							href={SITE.sourceUrl}
							target="_blank"
							rel="external noopener noreferrer"
							class="nav-external"
						>
							GitHub<span class="sr-only"> (opens in a new tab)</span>
						</a>
					) : null}
				</nav>
				<Search />
			</header>
			<main id="main" class="site-main">
				{props.children}
			</main>
			<footer class="site-footer">
				<span>
					© 2026 Mikhail Matveev,{" "}
					<a href="https://rh1.tech" target="_blank" rel="external noopener noreferrer">
						rh1.tech<span class="sr-only"> (opens in a new tab)</span>
					</a>
				</span>
				<span>arachne {kit.version} · MIT OR Apache-2.0</span>
				<span>This site is an Arachne static build, rendered from the repository's Markdown.</span>
			</footer>
		</>
	);
}
