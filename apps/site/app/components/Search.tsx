import { For, Show } from "@arachnejs/render";
import { currentRouter } from "@arachnejs/router";
import { computed, effect, signal } from "@arachnejs/signals";
import { rank } from "../search.ts";
import type { SearchRecord } from "../site.ts";

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement &&
	(target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * Header search: a button that opens a dialog over the page. The index
 * (`/search.json`, pages and their headings) loads on first open. `/` or
 * Ctrl/⌘-K opens it; arrows move, Enter follows, Escape closes.
 */
export function Search() {
	const index = signal<SearchRecord[] | undefined>(undefined);
	const failed = signal(false);
	const query = signal("");
	const active = signal(0);
	const results = computed(() => rank(index() ?? [], query()));
	let dialog: HTMLDialogElement | undefined;
	let input: HTMLInputElement | undefined;

	const load = async () => {
		if (index()) return;
		try {
			const res = await fetch("/search.json");
			if (!res.ok) throw new Error(`search index: HTTP ${res.status}`);
			index.set((await res.json()) as SearchRecord[]);
		} catch {
			failed.set(true);
		}
	};
	const open = () => {
		if (!dialog || dialog.open) return;
		dialog.showModal();
		input?.select();
		void load();
	};
	const close = () => {
		// Chromium leaves focus on the input of a closed dialog; `/` would then type into it.
		input?.blur();
		dialog?.close();
	};
	const follow = (record: SearchRecord | undefined) => {
		if (!record) return;
		close();
		void currentRouter()?.navigate(record.url);
	};

	effect(() => {
		const onKey = (event: KeyboardEvent) => {
			const shortcut = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
			if (
				shortcut ||
				(event.key === "/" && !isTyping(event.target) && !event.metaKey && !event.ctrlKey)
			) {
				event.preventDefault();
				open();
			}
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});

	const onKeyDown = (event: KeyboardEvent) => {
		const count = results().length;
		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();
			if (count > 0) active.set((active() + (event.key === "ArrowDown" ? 1 : count - 1)) % count);
		} else if (event.key === "Escape") {
			// A search input would clear itself first; one Escape should close.
			event.preventDefault();
			close();
		} else if (event.key === "Enter") {
			event.preventDefault();
			follow(results()[active()]);
		}
	};

	return (
		<>
			<button
				type="button"
				class="search-trigger"
				onClick={open}
				aria-keyshortcuts="/ Control+K Meta+K"
			>
				<span>Search</span>
				<kbd>/</kbd>
			</button>
			<dialog
				class="search"
				aria-label="Search the documentation"
				ref={(el: HTMLDialogElement) => {
					dialog = el;
					// A click on the dialog itself (not its content) is a click on the backdrop.
					el.addEventListener("click", (event) => {
						if (event.target === el) close();
					});
				}}
			>
				<div class="search-box">
					<input
						ref={(el: HTMLInputElement) => {
							input = el;
						}}
						type="search"
						role="combobox"
						aria-expanded={results().length > 0}
						aria-controls="search-results"
						aria-autocomplete="list"
						aria-activedescendant={results().length > 0 ? `search-hit-${active()}` : undefined}
						placeholder="Search pages and sections"
						autocomplete="off"
						spellcheck={false}
						value={query()}
						onInput={(event: InputEvent) => {
							query.set((event.target as HTMLInputElement).value);
							active.set(0);
						}}
						onKeyDown={onKeyDown}
					/>
					<button type="button" class="search-close" onClick={close}>
						Esc
					</button>
				</div>
				<div id="search-results" role="listbox" aria-label="Results">
					<For each={results()}>
						{(record, i) => (
							<div
								id={`search-hit-${i()}`}
								role="option"
								tabIndex={-1}
								aria-selected={active() === i()}
								onPointerMove={() => active.set(i())}
							>
								<a href={record.url} onClick={close}>
									<span class="hit-title">{record.title}</span>
									<span class="hit-where">
										{record.page ? `${record.page} · ` : ""}
										{record.section}
									</span>
								</a>
							</div>
						)}
					</For>
				</div>
				<Show when={query().trim() !== "" && index() && results().length === 0}>
					<p class="search-note">No matches for “{query().trim()}”.</p>
				</Show>
				<Show when={failed()}>
					<p class="search-note" role="alert">
						The search index didn't load. Check your connection and reopen search.
					</p>
				</Show>
				<Show when={query().trim() === "" && !failed()}>
					<p class="search-note">
						Titles and section headings of every page. ↑ ↓ to move, Enter to open.
					</p>
				</Show>
			</dialog>
		</>
	);
}
