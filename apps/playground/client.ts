import { createComponent, For, insert, render, Show } from "@arachne/render";
import { signal } from "@arachne/signals";

const count = signal(0);
const showList = signal(true);
const items = signal(["silk", "thread", "anchor", "orbit"]);

function App() {
	const root = document.createElement("div");
	root.className = "demo";

	const counter = document.createElement("section");
	counter.className = "panel";
	const counterTitle = document.createElement("h2");
	counterTitle.textContent = "Signal";
	const counterValue = document.createElement("p");
	counterValue.className = "metric";
	insert(counterValue, () => String(count()));
	const counterActions = document.createElement("div");
	counterActions.className = "actions";
	const dec = document.createElement("button");
	dec.type = "button";
	dec.textContent = "−";
	dec.onclick = () => count.set(count() - 1);
	const inc = document.createElement("button");
	inc.type = "button";
	inc.textContent = "+";
	inc.onclick = () => count.set(count() + 1);
	const toggle = document.createElement("button");
	toggle.type = "button";
	toggle.className = "ghost";
	toggle.textContent = "Toggle list";
	toggle.onclick = () => showList.set(!showList());
	const add = document.createElement("button");
	add.type = "button";
	add.className = "ghost";
	add.textContent = "Add item";
	add.onclick = () => {
		const next = `node-${items().length + 1}`;
		items.set([...items(), next]);
	};
	counterActions.append(dec, inc, toggle, add);
	counter.append(counterTitle, counterValue, counterActions);

	const listPanel = document.createElement("section");
	listPanel.className = "panel";
	const listTitle = document.createElement("h2");
	listTitle.textContent = "Show + For";
	const listHost = document.createElement("div");
	listHost.className = "list-host";
	insert(
		listHost,
		createComponent(Show, {
			get when() {
				return showList();
			},
			get fallback() {
				const empty = document.createElement("p");
				empty.className = "muted";
				empty.textContent = "List hidden";
				return empty;
			},
			get children() {
				const ul = document.createElement("ul");
				ul.className = "web";
				insert(
					ul,
					createComponent(For<string>, {
						get each() {
							return items();
						},
						children: (item) => {
							const li = document.createElement("li");
							li.textContent = item;
							return li;
						},
					}),
				);
				return ul;
			},
		}),
	);
	listPanel.append(listTitle, listHost);

	root.append(counter, listPanel);
	return root;
}

const mount = document.querySelector("#app");
if (!mount) throw new Error("#app missing");
render(App, mount);
