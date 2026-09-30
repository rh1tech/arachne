/**
 * The two files shown on the home page. They are the Getting started app,
 * trimmed; keep them in step with docs/getting-started.md.
 */
export const EXAMPLES = [
	{
		file: "app/routes.tsx",
		lang: "tsx",
		code: `import type { RouteDefinition, RouteProps } from "@arachnejs/router";
import { signal } from "@arachnejs/signals";

function Home(props: RouteProps) {
  const data = props.data as { now: string };
  const count = signal(0);
  return (
    <main>
      <h1>Hello, Arachne</h1>
      <p>Rendered at {data.now}.</p>
      <button type="button" onClick={() => count.set(count() + 1)}>
        Clicked {count()} times
      </button>
    </main>
  );
}

export const routes: RouteDefinition[] = [
  { path: "/", component: Home, head: { title: "Home" } },
];
`,
	},
	{
		file: "app/server.ts",
		lang: "ts",
		code: `import { defineServer } from "@arachnejs/kit";
import { s } from "@arachnejs/schema";
import { route } from "@arachnejs/server";

const greet = route({
  method: "GET",
  path: "/api/greet",
  query: s.object({ name: s.string({ min: 1, max: 40 }) }),
  handler: (ctx) => ({ message: \`Hello, \${ctx.query.name}!\` }),
});

export default defineServer({
  routes: [greet],
  loaders: {
    "/": () => ({ now: new Date().toISOString() }),
  },
});
`,
	},
] as const;
