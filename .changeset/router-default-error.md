---
"@arachnejs/router": patch
"@arachnejs/kit": patch
---

A failed page load no longer renders the page without its data. With no `error` component, the router shows its own `DefaultErrorPage` ("Something went wrong", or "Not found" for a 404) and logs the failure, in the browser and on the server alike. Before, client-side navigation rendered the page with `data` undefined, which crashed pages that read their data. `DefaultErrorPage` is exported for apps that want to wrap it.
