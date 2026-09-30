import { For, Show } from "@arachne/render";
import { Link, type RouteProps } from "@arachne/router";
import { effect, signal, untrack } from "@arachne/signals";
import { SECTIONS } from "../nav.ts";
import { pathname } from "./Shell.tsx";

/** Documentation layout: section sidebar (a drawer on small screens) around the page. */
export function DocsLayout(props: RouteProps) {
	const menu = signal(false);
	effect(() => {
		pathname();
		menu.set(false);
	});
	const inSection = (paths: string[]) => paths.includes(pathname().replace(/\/+$/, "") || "/");

	return (
		<div class="docs" classList={{ "menu-open": menu() }}>
			<button
				type="button"
				class="menu-toggle"
				aria-expanded={menu()}
				aria-controls="docs-nav"
				onClick={() => menu.set(!menu())}
			>
				{menu() ? "Close contents" : "Contents"}
			</button>
			<nav id="docs-nav" class="sidebar" aria-label="Documentation">
				<For each={SECTIONS}>
					{(section) => (
						<details
							class="nav-section"
							open={untrack(
								() => !section.collapsed || inSection(section.entries.map((e) => e.path)),
							)}
							ref={(el: HTMLDetailsElement) => {
								// Open the section of the current page; never close one the reader opened.
								effect(() => {
									if (inSection(section.entries.map((e) => e.path))) el.open = true;
								});
							}}
						>
							<summary>{section.title}</summary>
							<ul>
								<For each={section.entries}>
									{(entry) => (
										<li>
											<Link href={entry.path} class={entry.code ? "pkg" : undefined}>
												{entry.title}
											</Link>
										</li>
									)}
								</For>
							</ul>
						</details>
					)}
				</For>
			</nav>
			<Show when={menu()}>
				<button
					type="button"
					class="scrim"
					aria-label="Close contents"
					onClick={() => menu.set(false)}
				/>
			</Show>
			{props.children}
		</div>
	);
}
