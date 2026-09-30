# Getting started

Arachne is a TypeScript framework for Bun. One project layout builds a
pre-rendered static site, a server-rendered app with an API, or an API on
its own. Pages are JSX compiled to direct DOM updates, driven by signals.

This page takes you from an empty directory to a production build in about
ten minutes. The [framework guide](framework/README.md) explains how the
pieces fit together afterwards.

## Requirements

- [Bun](https://bun.sh) 1.3 or newer (`bun --version`).
- macOS, Linux or WSL.

## Get the source

Arachne is pre-release (`0.0.x`) and the `@arachne/*` packages are not on
npm yet. Until they are, projects live inside a checkout of the repository,
where Bun's workspaces link every package:

```bash
git clone https://github.com/rh1tech/arachne.git
cd arachne
bun install
```

> The unscoped `arachne` package on npm is unrelated to this project. Don't
> run `bunx arachne` until the first release; use `bun run arachne` from the
> checkout instead.

## Start from a template

```bash
bun run arachne create apps/my-site --template static
bun install
cd apps/my-site
bun run dev            # http://localhost:3000, reloads as you edit
```

| Template | What you get |
|---|---|
| `static` | A small blog: layout, build-time data, per-page titles, sitemap. Deploy `dist/` anywhere. |
| `server` | Sign-up, email verification, sign-in and password reset; per-user notes with access rules; typed API client; OpenAPI docs; MCP tools. |
| `api` | A projects API: API tokens, validation, pagination, file uploads, CORS, rate limits, OpenAPI. |

The rest of this page builds a smaller app by hand, so you can see what each
file does.

## Build one by hand

### 1. The package

Create `apps/hello/package.json`:

```json
{
  "name": "hello",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "arachne dev",
    "build": "arachne build",
    "start": "arachne start"
  },
  "dependencies": {
    "@arachne/kit": "^0.0.1",
    "@arachne/render": "^0.0.1",
    "@arachne/router": "^0.0.1",
    "@arachne/schema": "^0.0.1",
    "@arachne/server": "^0.0.1",
    "@arachne/signals": "^0.0.1"
  }
}
```

And `apps/hello/tsconfig.json`, so your editor type-checks the JSX:

```json
{
  "compilerOptions": {
    "target": "ES2024",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2024", "DOM", "DOM.Iterable"],
    "types": ["bun"],
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "@arachne/render",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["app", "arachne.config.ts"]
}
```

Run `bun install` from the repository root to link the packages.

### 2. Pages

Pages are a route table in `app/routes.tsx`. A route with `children` is a
layout: it renders the matched child as `props.children`.

```tsx
import { Link, type RouteDefinition, type RouteProps } from "@arachne/router";
import { signal } from "@arachne/signals";

function Layout(props: RouteProps) {
  return (
    <>
      <nav>
        <Link href="/">Home</Link> · <Link href="/about">About</Link>
      </nav>
      <main>{props.children}</main>
    </>
  );
}

function Home() {
  const count = signal(0);
  return (
    <>
      <h1>Hello, Arachne</h1>
      <button type="button" onClick={() => count.set(count() + 1)}>
        Clicked {count()} times
      </button>
    </>
  );
}

function About() {
  return <p>Rendered on the server, then hydrated in the browser.</p>;
}

export const routes: RouteDefinition[] = [
  {
    path: "/",
    component: Layout,
    children: [
      { path: "", component: Home, head: { title: "Home" } },
      { path: "about", component: About, head: { title: "About" } },
    ],
  },
];
```

```bash
cd apps/hello
bun run dev
```

Open <http://localhost:3000>. The HTML arrives already rendered; the
browser then takes it over (hydration). The button updates just its own text
node: components run once, and only the expressions that read `count()`
run again. Links switch pages without a full reload.

### 3. Page data and an API route

`app/server.ts` holds everything that runs only on the server: API routes,
middleware, and **loaders**, which provide data for a page. Loaders are keyed
by route pattern.

```ts
import { defineServer } from "@arachne/kit";
import { s } from "@arachne/schema";
import { route } from "@arachne/server";

const greet = route({
  method: "GET",
  path: "/api/greet",
  query: s.object({ name: s.string({ min: 1, max: 40 }) }),
  handler: (ctx) => ({ message: `Hello, ${ctx.query.name}!` }),
});

export default defineServer({
  routes: [greet],
  loaders: {
    "/": () => ({ now: new Date().toISOString() }),
  },
});
```

Creating this file switches the app from static to server mode, and the dev
server restarts. The query is validated before the handler runs, and
`ctx.query.name` is typed as a `string`:

```bash
curl "localhost:3000/api/greet?name=Ada"
# {"message":"Hello, Ada!"}

curl "localhost:3000/api/greet"
# 422 {"error":{"status":422,"code":"validation_failed","message":"Request validation failed",
#      "issues":[{"location":"query","path":"name","message":"expected string"}]}}
```

The page receives its loader's result as `props.data`. The first request
runs the loader on the server; client-side navigations fetch the same data
as JSON. Replace `Home` with:

```tsx
function Home(props: RouteProps) {
  const data = props.data as { now: string };
  const count = signal(0);
  const reply = signal("");
  const greet = async (event: SubmitEvent) => {
    event.preventDefault();
    const name = new FormData(event.target as HTMLFormElement).get("name");
    const res = await fetch(`/api/greet?name=${encodeURIComponent(String(name))}`);
    const body = await res.json();
    reply.set(res.ok ? body.message : body.error.message);
  };
  return (
    <>
      <h1>Hello, Arachne</h1>
      <p>Rendered at {data.now}.</p>
      <button type="button" onClick={() => count.set(count() + 1)}>
        Clicked {count()} times
      </button>
      <form onSubmit={greet}>
        <input name="name" placeholder="Your name" />
        <button type="submit">Greet</button>
      </form>
      <p>{reply()}</p>
    </>
  );
}
```

For a typed client instead of `fetch`, see
[OpenAPI and the typed client](../packages/server/README.md#openapi-and-the-typed-client).

### 4. Build and run

```bash
bun run build          # dist/client (assets) + dist/server/index.js
bun run start          # PORT=8080 bun run start to pick a port
```

The server bundle includes the `@arachne/*` code. Your app's other
dependencies stay in `node_modules`, so deploy with
`bun install --production` next to `dist/`.

### Static instead

Set the mode in `arachne.config.ts` to pre-render every page:

```ts
import { defineConfig } from "@arachne/kit";

export default defineConfig({
  mode: "static",
  siteUrl: "https://example.com", // for sitemap.xml
});
```

`bun run build` then writes `dist/**/index.html`, a JSON file of loader
data for each page that has a loader, `404.html` and `sitemap.xml`. Loaders run once, at build
time. API routes are not served, because there is no server. Dynamic
routes such as `blog/:slug` list their pages with `paths` in
`app/server.ts`; see [kit: Server](../packages/kit/README.md#server).
`bun run arachne preview` serves the result locally.

This website is an Arachne static build: each page is rendered from the
repository's Markdown at build time.

## Where next

- [Framework guide](framework/README.md): the three modes, how packages fit, security defaults.
- [kit](../packages/kit/README.md): configuration, dev server, CLI.
- [router](../packages/router/README.md): layouts, lazy routes, head tags, links.
- [server](../packages/server/README.md): routes, validation, uploads, OpenAPI.
- [auth](../packages/auth/README.md) and [acl](../packages/acl/README.md): accounts and permissions.
- [UI components](ui/README.md): 330+ accessible components.
