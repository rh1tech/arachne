import { Link } from "@arachne/router";
import { pathname } from "../components/Shell.tsx";

/** 404 page (`404.html` in the build), worded like `man` when a page is missing. */
export function NotFound() {
	return (
		<section class="not-found" aria-labelledby="not-found-title">
			<pre class="terminal-line">
				<span class="prompt">$</span> man {pathname().replace(/^\//, "") || "index"}
			</pre>
			<h1 id="not-found-title">No manual entry for {pathname()}</h1>
			<p>
				There is no page at this address. Try <Link href="/docs">Getting started</Link>, the{" "}
				<Link href="/docs/guide">framework guide</Link>, or search with <kbd>/</kbd>.
			</p>
		</section>
	);
}

/** Shown when a page's data fails to load. */
export function ErrorPage(props: { error: unknown }) {
	const error = props.error as { status?: number; message?: string } | undefined;
	return (
		<section class="not-found" aria-labelledby="error-title">
			<h1 id="error-title">
				{error?.status === 404 ? "No manual entry" : "This page didn't load"}
			</h1>
			<p>{error?.message ?? "Unknown error."}</p>
			<p>
				<Link href="/docs">Back to the docs</Link>
			</p>
		</section>
	);
}
