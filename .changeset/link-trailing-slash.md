---
"@arachnejs/router": patch
---

`<Link>` counts as the current page whether or not its href or the location ends in a slash: `/rules/` is active on `/rules`, as the router already matches them alike. Static sites whose URLs end in `/` never highlighted their current link.
