import { delegateEvents, render } from "@arachne/render";
import { browserHistory, createRouter, type RouteProps } from "@arachne/router";
import { signal } from "@arachne/signals";

const count = signal(0);
const showList = signal(true);
const items = signal(["silk", "thread", "anchor", "orbit"]);

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
		</div>
	);
}

const mount = document.querySelector("#app");
if (!mount) throw new Error("#app missing");
delegateEvents(["click"]);
render(() => <App />, mount);
