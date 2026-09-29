---
"@arachne/vite": minor
---

With `target: "ssr"`, `bunPlugin` and `vitePlugin` resolve bare `@arachne/render` imports to `@arachne/render/ssr`. Library code such as the UI kit now uses server-safe runtime helpers when bundled for the server.
