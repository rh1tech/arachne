---
"@arachne/render": patch
---

Fix three reactivity bugs that made interactive UI look dead:

- `<Show>` now tracks its children and fallback. A dynamic child such as `<Show when={a()}>{b() ? <X /> : null}</Show>` used to render once and never update. Components inside are still created untracked, so element children stay stable.
- `insert()` gives arrays that contain accessors their own effect. This covers a component returning a fragment with a dynamic part (`<><Button />{open() ? <Panel /> : null}</>`). Before, its dependencies leaked to whichever effect inserted it: state changes either did nothing or re-rendered, and so reset, the whole enclosing tree.
- A `Portal` is now also torn down when the owner it was created in is disposed. A portal from a discarded render pass (its bridge never connected) used to stay in `document.body` and cover the page.
