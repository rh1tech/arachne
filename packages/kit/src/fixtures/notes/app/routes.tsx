import { Link, type RouteDefinition, type RouteProps } from "@arachnejs/router";
import { signal } from "@arachnejs/signals";

interface Note {
	id: string;
	title: string;
	body: string;
}

function Layout(props: RouteProps) {
	return (
		<div class="shell">
			<nav aria-label="Main">
				<Link href="/">Home</Link> <Link href="/about">About</Link>{" "}
				<Link href="/notes/1">First note</Link>
			</nav>
			<main>{props.children}</main>
		</div>
	);
}

function Home() {
	const count = signal(0);
	return (
		<section>
			<h1>Welcome to Notes</h1>
			<button type="button" id="inc" onClick={() => count.set(count() + 1)}>
				Clicked {count()} times
			</button>
		</section>
	);
}

function About() {
	return <h1>About this app</h1>;
}

function NoteView(props: RouteProps) {
	const note = props.data as Note;
	return (
		<article>
			<h1>{note.title}</h1>
			<p>{note.body}</p>
		</article>
	);
}

export function NotFound() {
	return <h1>Nothing here</h1>;
}

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: Layout,
		children: [
			{ path: "", component: Home, head: { title: "Home" } },
			{
				path: "about",
				component: About,
				head: { title: "About", meta: [{ name: "description", content: "About Notes" }] },
			},
			{
				path: "notes/:id",
				component: NoteView,
				head: ({ data }) => ({ title: (data as Note).title }),
			},
		],
	},
];
