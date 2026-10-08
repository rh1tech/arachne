# @arachnejs/router

Signal-driven router for Arachne: nested layouts, code-split (lazy) routes,
per-route data, head/title management, `<Link>` and link interception, base
paths, scroll handling. Runs in the browser, on the server (SSR) and at build
time (static prerendering) with the same route table. The path compiler is
shared with `@arachnejs/server` (`@arachnejs/router/path`). See
[ADR 0009](../../docs/adr/0009-router.md).

```tsx
import { browserHistory, createRouter, Link } from "@arachnejs/router";

const routes = [
  {
    path: "/",
    component: (p) => <div class="site"><Nav />{p.children}</div>, // layout
    head: { title: "Home" },
    children: [
      { path: "", component: Home },                                  // index page
      { path: "blog", lazy: () => import("./Blog.tsx") },             // code-split
      {
        path: "blog/:slug",
        component: (p) => <Post post={p.data as Post} />,
        head: ({ data }) => ({ title: (data as Post).title }),
      },
    ],
  },
];

const router = createRouter({
  routes,
  history: browserHistory(),
  base: "/docs",                    // app mounted at site.com/docs
  titleTemplate: "%s · My site",
  load: (match) => fetch(`/data${match.pathname}.json`).then((r) => r.json()), // per-route data
  initialData: window.__DATA__,     // from server-rendered HTML
  fallback: NotFound,
  error: ErrorPage,
});
router.interceptLinks();            // plain <a href="/…"> inside the page route client-side

render(() => <>{router.Outlet()}</>, document.getElementById("app")!);
```

- **Layouts**: a route with `children` renders its `component` around the
  matched child (`props.children`); `path: ""` is the index child. A layout
  stays mounted while you navigate between its children (its DOM, scroll
  positions and local state survive); its `params`/`location`/`data` props
  update in place. Pages are re-created on every navigation.
- **Lazy routes**: `lazy: () => import("./Page.tsx")` (default export or the
  component) loads before the route commits; `router.preload(path)` warms it.
- **Data**: `load(match)` runs for every navigation; the URL and view switch
  together when it resolves, `router.pending()` is true meanwhile, and stale
  navigations are dropped. Errors render `error` with `props.error`.
- **Head**: static or `({ params, data, location }) => ({ title, meta, links, lang })`,
  merged outer → inner, applied to `document` on navigation;
  `renderHead(router.head())` produces the server HTML.
  `lang` sets `<html lang>` for that page (a bilingual site: `/ru/*` routes say
  `lang: "ru"`); the kit renders it, and `applyHead` keeps it in step on navigation.
- **Links**: `<Link href="/blog">` renders a real `<a>` (base path applied,
  `aria-current="page"` + `activeClass` when active, prefetch on hover/focus).
  `shouldIntercept` skips modified clicks, `target`, `download`,
  `rel="external"`, other origins and unknown paths.
- **Scroll**: top on push, hash target when present, restored on back/forward
  (`scroll: false` to opt out).
- `router.Outlet()` in a JSX expression is reactive; `<router.View />` is the
  component form.

| API | Description |
|---|---|
| `createRouter(options)` | `routes`, `history`, `load`, `initialData`, `base`, `titleTemplate`, `fallback`, `error`, `scroll` |
| `router.navigate(to, { replace })` | resolves after the route renders |
| `router.location()` / `params()` / `matched()` / `data()` / `pending()` / `error()` / `head()` | signals |
| `router.ready` | initial route loaded (SSR: await before rendering) |
| `router.href(path)` · `resolve(path)` · `preload(path)` · `interceptLinks(root?)` · `back()` · `dispose()` | |
| `memoryHistory(url)` · `browserHistory()` | history sources |
| `compilePath(pattern)` · `parseLocation(url)` | path utilities (also `@arachnejs/router/path`) |
| `mergeHeads` · `renderHead` · `applyHead` | head utilities |
