# arachne.rh1.tech

The Arachne website, built with Arachne in static mode. Every docs page is
rendered at build time from the repository's own Markdown (package READMEs,
`docs/`), so the site can't drift from the docs.

```bash
bun run dev        # http://localhost:3000
bun run build      # dist/
bun run preview    # serve dist/ (404.html honoured)
bun test app       # content pipeline, search ranking
bun run e2e        # Chromium: search, navigation, 404, drawer, every live example, axe (after build)
```

| Path | |
|---|---|
| `app/nav.ts` | Which repository file becomes which page, and the sidebar order. Add pages here. |
| `app/content/` | Build-time only: Markdown → HTML (`Bun.markdown`), GitHub-style heading ids, link rewriting, Shiki highlighting, search index. |
| `app/server.ts` | Loaders for `/` and `/docs/*`, and the list of pages to prerender. |
| `app/components/`, `app/pages/` | Layout, search dialog, doc and home pages. |
| `app/ui/previews.tsx` | Live UI examples on component pages: its own chunk (`@arachne/ui` + `packages/ui/examples`), loaded on demand; mounts each example as it nears the viewport. |
| `app/styles/` | Tokens (light and dark), base, home, docs. |
| `scripts/prepare.ts` | Copies the IBM Plex fonts from `@fontsource` and the UI kit stylesheet (`public/ui.css`), and writes `public/search.json`. `dev` and `build` run it first. |

Component pages (`docs/ui/components/*.md`) get a live preview per
component: the build puts a slot and the example's code right after each
component's summary (`app/content/previews.ts`, names from the UI catalog),
and the browser renders the same example the playground uses. Site CSS
stays out of previews: element defaults are in a layer below the kit's, and
the Markdown styles use `@scope (.prose) to (.ui-preview)`.

Relative links in the Markdown are rewritten to site pages. Links to files
without a page go to the GitHub repository (`SITE.sourceUrl` in
`app/site.ts`); unset it and they render as plain text.

## Deploy

Static files on `rbx1` behind Cloudflare, like the other `*.rh1.tech` sites:

```bash
bun run build
rsync -a --delete dist/ xtreme@rbx1.re-hash.org:/var/www/arachne-site/
```

The nginx vhost is [`deploy/arachne.rh1.tech.conf`](deploy/arachne.rh1.tech.conf)
(installed as `/etc/nginx/vhosts/arachne.rh1.tech.conf`). Always
`sudo nginx -t` before `sudo systemctl reload nginx`: the host serves other
sites too.
