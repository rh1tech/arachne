import { delegateEvents, render } from "@arachne/render";
import { browserHistory, createRouter, type RouteProps } from "@arachne/router";
import { signal } from "@arachne/signals";

const count = signal(0);
const showList = signal(true);
const items = signal(["silk", "thread", "anchor", "orbit"]);

type Note = { id: string; body: string; createdAt: string };
const noteList = signal<Note[]>([]);
const draft = signal("");
const notesError = signal("");

async function refreshNotes(): Promise<void> {
	const res = await fetch("/api/notes");
	const data = (await res.json()) as { notes: Note[] };
	noteList.set(data.notes);
}

async function addNote(): Promise<void> {
	const body = (draft() ?? "").trim();
	if (!body) return;
	notesError.set("");
	const res = await fetch("/api/notes", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ body }),
	});
	if (!res.ok) {
		const err = (await res.json()) as { error?: string };
		notesError.set(err.error ?? "failed");
		return;
	}
	draft.set("");
	await refreshNotes();
}

async function removeNote(id: string): Promise<void> {
	await fetch(`/api/notes/${id}`, { method: "DELETE" });
	await refreshNotes();
}

void refreshNotes();

function Home() {
	return <p class="route-view">Home route</p>;
}

function User(props: RouteProps) {
	return <p class="route-view">User #{props.params["id"]}</p>;
}

function NotFound() {
	return <p class="route-view muted">No route matched</p>;
}

const router = createRouter({
	history: browserHistory(),
	routes: [
		{ path: "/", component: Home },
		{ path: "/users/:id", component: User },
		{ path: "*", component: NotFound },
	],
});

function App() {
	return (
		<div class="demo">
			<section class="panel">
				<h2>Signal</h2>
				<p class="metric">{count()}</p>
				<div class="actions">
					<button type="button" onClick={() => count.set(count() - 1)}>
						−
					</button>
					<button type="button" onClick={() => count.set(count() + 1)}>
						+
					</button>
					<button type="button" class="ghost" onClick={() => showList.set(!showList())}>
						Toggle list
					</button>
					<button
						type="button"
						class="ghost"
						onClick={() => items.set([...items(), `node-${items().length + 1}`])}
					>
						Add item
					</button>
				</div>
			</section>

			<section class="panel">
				<h2>Show + For</h2>
				<div class="list-host">
					<Show when={showList()} fallback={<p class="muted">List hidden</p>}>
						<ul class="web">
							<For each={items()}>{(item) => <li>{item}</li>}</For>
						</ul>
					</Show>
				</div>
			</section>

			<section class="panel panel-wide">
				<h2>Router</h2>
				<p class="pathline">{router.location().href}</p>
				<div class="actions">
					<button type="button" class="ghost" onClick={() => router.navigate("/")}>
						Home
					</button>
					<button type="button" class="ghost" onClick={() => router.navigate("/users/7")}>
						User 7
					</button>
					<button type="button" class="ghost" onClick={() => router.navigate("/nope")}>
						Missing
					</button>
				</div>
				<div class="outlet">{router.Outlet()}</div>
			</section>

			<section class="panel panel-wide">
				<h2>DB notes</h2>
				<p class="muted">In-memory SQLite via @arachne/db + @arachne/db-sqlite</p>
				<div class="note-form">
					<input
						type="text"
						value={draft()}
						placeholder="Write a note"
						onInput={(e: InputEvent) => draft.set((e.target as HTMLInputElement).value)}
						onKeyDown={(e: KeyboardEvent) => {
							if (e.key === "Enter") void addNote();
						}}
					/>
					<button type="button" onClick={() => void addNote()}>
						Save
					</button>
				</div>
				<Show when={notesError()} fallback={null}>
					<p class="muted">{notesError()}</p>
				</Show>
				<ul class="web">
					<For each={noteList()}>
						{(note) => (
							<li class="note-row">
								<span>{note.body}</span>
								<button type="button" class="ghost" onClick={() => void removeNote(note.id)}>
									Delete
								</button>
							</li>
						)}
					</For>
				</ul>
			</section>
		</div>
	);
}

const mount = document.querySelector("#app");
if (!mount) throw new Error("#app missing");
delegateEvents(["click", "input", "keydown"]);
render(() => <App />, mount);
