import { For } from "@arachnejs/render";
import { Link, type RouteDefinition, type RouteProps } from "@arachnejs/router";
import type { Post } from "./content.ts";

const formatDate = (iso: string) =>
	new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	});

function Layout(props: RouteProps) {
	return (
		<div class="page">
			<header class="masthead">
				<Link href="/" class="brand">
					Field Notes
				</Link>
				<nav aria-label="Main">
					<Link href="/blog" exact={false}>
						Writing
					</Link>
					<Link href="/about">About</Link>
				</nav>
			</header>
			<main id="main">{props.children}</main>
			<footer class="colophon">
				Built with Arachne · pre-rendered, hydrated, routed on the client.
			</footer>
		</div>
	);
}

function PostCard(props: { post: Post }) {
	return (
		<article class="card">
			<time datetime={props.post.date}>{formatDate(props.post.date)}</time>
			<h3>
				<Link href={`/blog/${props.post.slug}`}>{props.post.title}</Link>
			</h3>
			<p>{props.post.summary}</p>
		</article>
	);
}

function Home(props: RouteProps) {
	const data = props.data as { latest: Post[] };
	return (
		<>
			<section class="hero" aria-labelledby="hero-title">
				<p class="eyebrow">A small static site</p>
				<h1 id="hero-title">Essays on building for the web, one page at a time.</h1>
				<p class="lede">
					Every page here was rendered at build time and still navigates like an app.
				</p>
			</section>
			<section aria-labelledby="latest-title">
				<h2 id="latest-title">Latest</h2>
				<div class="cards">
					<For each={data.latest}>{(post) => <PostCard post={post} />}</For>
				</div>
			</section>
		</>
	);
}

function Blog(props: RouteProps) {
	const data = props.data as { posts: Post[] };
	return (
		<section aria-labelledby="blog-title">
			<h1 id="blog-title">Writing</h1>
			<div class="cards">
				<For each={data.posts}>{(post) => <PostCard post={post} />}</For>
			</div>
		</section>
	);
}

function PostPage(props: RouteProps) {
	const post = props.data as Post;
	return (
		<article class="post">
			<time datetime={post.date}>{formatDate(post.date)}</time>
			<h1>{post.title}</h1>
			<For each={post.body}>{(paragraph) => <p>{paragraph}</p>}</For>
			<p>
				<Link href="/blog">← All writing</Link>
			</p>
		</article>
	);
}

function About() {
	return (
		<section class="prose">
			<h1>About</h1>
			<p>
				Field Notes is an example of an Arachne static site: no server at runtime, HTML for every
				page, and client-side routing after the first load.
			</p>
		</section>
	);
}

/** Rendered (with status 404) for unknown paths; the build writes it to 404.html. */
export function NotFound() {
	return (
		<section class="prose">
			<h1>Page not found</h1>
			<p>
				Try the <Link href="/blog">writing index</Link>.
			</p>
		</section>
	);
}

/** Rendered when a loader fails. */
export function ErrorPage(props: { error: unknown }) {
	return (
		<section class="prose">
			<h1>Something went wrong</h1>
			<p>{(props.error as Error)?.message ?? "Unknown error"}</p>
		</section>
	);
}

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: Layout,
		children: [
			{
				path: "",
				component: Home,
				head: {
					title: "Home",
					meta: [{ name: "description", content: "Essays on building for the web." }],
				},
			},
			{ path: "blog", component: Blog, head: { title: "Writing" } },
			{
				path: "blog/:slug",
				component: PostPage,
				head: ({ data }) => ({
					title: (data as Post).title,
					meta: [
						{ name: "description", content: (data as Post).summary },
						{ property: "og:type", content: "article" },
					],
				}),
			},
			{ path: "about", component: About, head: { title: "About" } },
		],
	},
];
