import { For, Show } from "@arachnejs/render";
import { Link, type RouteProps } from "@arachnejs/router";
import { effect } from "@arachnejs/signals";
import { copyCode } from "../components/copy.ts";
import { bindTableScroll } from "../components/tableScroll.ts";
import type { DocData } from "../site.ts";

/** One documentation page rendered from repository Markdown. */
export function Doc(props: RouteProps) {
	const doc = () => props.data as DocData;
	let prose: HTMLElement | undefined;

	// Edge fades on wide tables, and live UI examples when the page has them.
	effect(() => {
		doc().html;
		let stopped = false;
		let unmountTables: (() => void) | undefined;
		let unmountPreviews: (() => void) | undefined;
		queueMicrotask(() => {
			if (stopped || !prose) return;
			unmountTables = bindTableScroll(prose);
			if (!doc().previews) return;
			import("../ui/previews.tsx").then(
				(module) => {
					if (!stopped && prose) unmountPreviews = module.mountPreviews(prose);
				},
				(error: unknown) => {
					console.error("[site] live examples failed to load", error);
					for (const status of prose?.querySelectorAll(".ui-preview-status") ?? []) {
						status.textContent = "The live example didn't load. Reload the page to try again.";
					}
				},
			);
		});
		return () => {
			stopped = true;
			unmountTables?.();
			unmountPreviews?.();
		};
	});

	return (
		<>
			<article class="doc">
				<header class="doc-header">
					<p class="doc-meta">
						<span>{doc().section}</span>
						<code class="doc-source" title="Source file in the repository">
							{doc().source}
						</code>
					</p>
					<h1 classList={{ pkg: doc().title.startsWith("@arachnejs/") }}>{doc().title}</h1>
				</header>
				<div
					class="prose"
					innerHTML={doc().html}
					ref={(el: HTMLElement) => {
						prose = el;
						el.addEventListener("click", copyCode);
					}}
				/>
				<nav class="pager" aria-label="Previous and next page">
					<Show when={doc().prev}>
						{(prev: { title: string; path: string }) => (
							<Link href={prev.path} class="pager-prev">
								<span>Previous</span>
								{prev.title}
							</Link>
						)}
					</Show>
					<Show when={doc().next}>
						{(next: { title: string; path: string }) => (
							<Link href={next.path} class="pager-next">
								<span>Next</span>
								{next.title}
							</Link>
						)}
					</Show>
				</nav>
			</article>
			<aside class="toc" aria-label="On this page">
				<Show when={doc().headings.length > 1}>
					<p class="toc-title">On this page</p>
					<ul>
						<For each={doc().headings}>
							{(heading) => (
								<li classList={{ sub: heading.level === 3 }}>
									<a href={`#${heading.id}`}>{heading.text}</a>
								</li>
							)}
						</For>
					</ul>
				</Show>
			</aside>
		</>
	);
}
