---
"@arachnejs/render": patch
---

Server rendering runs a dynamic child (`{props.children}`, `{cond && <X/>}`) where it stands, so hydration keys follow document order. It was put off until the template was joined, after every other hole beside it: a layout with a `<For>` after `{props.children}` gave the footer its keys first, and the browser then hydrated the page into the footer's elements ("Cannot read properties of null (reading 'nextSibling')").
