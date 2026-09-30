# @arachnejs/vite

## 0.1.0

### Minor Changes

- 1c29d58: With `target: "ssr"`, `bunPlugin` and `vitePlugin` resolve bare `@arachnejs/render` imports to `@arachnejs/render/ssr`. Library code such as the UI kit now uses server-safe runtime helpers when bundled for the server.

### Patch Changes

- Updated dependencies [7d5880f]
  - @arachnejs/mcp@0.1.0
  - @arachnejs/jsx@0.1.0
