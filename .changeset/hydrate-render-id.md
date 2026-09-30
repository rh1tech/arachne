---
"@arachnejs/render": patch
---

`hydrate(code, element, { renderId })` hydrates markup rendered with `renderToString(…, { renderId })`, so several islands can hydrate separately inside one page without hydration-key collisions.
