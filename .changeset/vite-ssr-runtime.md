---
"@arachnejs/vite": minor
---

With `target: "ssr"`, `bunPlugin` and `vitePlugin` resolve bare `@arachnejs/render` imports to `@arachnejs/render/ssr`. Library code such as the UI kit now uses server-safe runtime helpers when bundled for the server.
