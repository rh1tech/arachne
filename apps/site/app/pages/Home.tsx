import { For } from "@arachnejs/render";
import { Link, type RouteProps } from "@arachnejs/router";
import { copyCode } from "../components/copy.ts";
import type { HomeData } from "../site.ts";

const SYNOPSIS = `git clone https://github.com/rh1tech/arachne.git && cd arachne && bun install
bun run arachne create apps/my-app --template static
cd apps/my-app && bun run dev`;

const MODES = [
	{
		flag: "static",
		text: "HTML for every route, rendered at build time. After the first load the page hydrates and routes on the client, fetching each page's data as a JSON file. Upload dist/ to any static host.",
	},
	{
		flag: "server",
		text: "Pages rendered per request on a Bun server, plus API routes, sessions, accounts and permissions. The same route table runs on the server and in the browser.",
	},
	{
		flag: "api",
		text: "No pages. Typed routes validated by schemas: JSON, forms and multipart bodies, file uploads, errors with issue paths, CORS, rate limits, and an OpenAPI 3.1 document.",
	},
];

const DEFAULTS = [
	"CSP with a per-request nonce, HSTS, nosniff, frame and referrer policies",
	"Every declared input validated; failures answer 422 with the path of each issue",
	"Parameterised SQL only; update and delete refuse to run without a where clause",
	"argon2id passwords, hashed session and API tokens, __Host- cookies",
	"CSRF checks via Origin and Fetch Metadata, login lockout, rate limits, audit events",
];

const READ_NEXT = [
	{ name: "Getting started", href: "/docs" },
	{ name: "Framework guide", href: "/docs/guide" },
	{ name: "kit", href: "/docs/packages/kit" },
	{ name: "router", href: "/docs/packages/router" },
	{ name: "server", href: "/docs/packages/server" },
	{ name: "schema", href: "/docs/packages/schema" },
	{ name: "auth", href: "/docs/packages/auth" },
	{ name: "ui", href: "/docs/packages/ui" },
];

/** One block of the home page. */
function Section(props: { class?: string; children?: unknown }) {
	return (
		<section class={props.class ? `home-section ${props.class}` : "home-section"}>
			{props.children}
		</section>
	);
}

/** The home page. */
export function Home(props: RouteProps) {
	const data = () => props.data as HomeData;
	return (
		<div class="home" ref={(el: HTMLElement) => el.addEventListener("click", copyCode)}>
			<Section class="name">
				<h1 class="headline">
					<span class="headline-name">Arachne</span> builds static sites, server‑rendered apps and
					APIs from one TypeScript codebase, on Bun.
				</h1>
			</Section>

			<Section>
				<div class="code terminal" data-lang="sh">
					<button type="button" class="copy" data-copy>
						Copy
					</button>
					<pre tabindex="0">
						<code>
							{SYNOPSIS.split("\n").map((line) => (
								<span class="cmd">{`${line}\n`}</span>
							))}
						</code>
					</pre>
				</div>
				<p class="note">
					Version {data().version} is a pre-release and isn't on npm yet, so projects live in a
					checkout of the repository. <Link href="/docs">Getting started</Link> walks through it.
				</p>
			</Section>

			<Section>
				<p>
					Pages are JSX compiled to direct DOM operations. State lives in signals, so a change
					updates the text node or attribute that reads it: components run once, and there is no
					virtual DOM to diff. The route table, with its layouts, data loaders and head tags, runs
					on the server, at build time and in the browser.
				</p>
				<p>
					On the server, one schema validates a request, types the handler, and produces the OpenAPI
					document and the typed client. Accounts, sessions, permissions, mail, file storage and
					migrations ship as packages of the framework, each usable on its own.
				</p>
			</Section>

			<Section>
				<dl class="options">
					<For each={MODES}>
						{(mode) => (
							<>
								<dt>
									<code>--template {mode.flag}</code>
								</dt>
								<dd>{mode.text}</dd>
							</>
						)}
					</For>
				</dl>
			</Section>

			<Section>
				<p>
					A page with loader data, and a validated API route. Requests without a <code>name</code>{" "}
					get a 422 before the handler runs.
				</p>
				<div class="example">
					<For each={data().examples}>
						{(example) => (
							<figure class="code" data-lang={example.file}>
								<figcaption>{example.file}</figcaption>
								<button type="button" class="copy" data-copy>
									Copy
								</button>
								<pre tabindex="0">
									<code innerHTML={example.html} />
								</pre>
							</figure>
						)}
					</For>
				</div>
			</Section>

			<Section>
				<div class="package-groups">
					<For each={data().groups}>
						{(group) => (
							<div class="package-group">
								<h2>{group.title}</h2>
								<ul class="packages">
									<For each={group.packages}>
										{(pkg) => (
											<li>
												<Link href={pkg.path}>@arachnejs/{pkg.name}</Link>
												<span>{pkg.description}</span>
											</li>
										)}
									</For>
								</ul>
							</div>
						)}
					</For>
				</div>
			</Section>

			<Section>
				<p class="lead-in">On by default:</p>
				<ul class="defaults">
					<For each={DEFAULTS}>{(item) => <li>{item}</li>}</For>
				</ul>
			</Section>

			<Section>
				<p>
					Pre-release. Static, server and API apps work end to end and are covered by unit, process
					and browser tests. Not done yet: Postgres and MySQL drivers, OAuth and passkeys, streaming
					SSR, a GraphQL adapter. The <Link href="/docs/progress">progress log</Link> has the
					details.
				</p>
			</Section>

			<Section>
				<p class="see-also">
					<span>Read next</span>
					<For each={READ_NEXT}>{(item) => <Link href={item.href}>{item.name}</Link>}</For>
				</p>
			</Section>

			<p class="man-strip man-strip-end">
				<span>arachne {data().version}</span>
				<span>
					{data().built}
					{data().commit ? ` · ${data().commit}` : ""}
				</span>
				<span>{data().pages} pages</span>
			</p>
		</div>
	);
}
