---
"@arachnejs/router": minor
"@arachnejs/kit": minor
---

A route's `head` can set `lang`: the page's `<html lang>`, inner routes winning, for sites in more than one language (`/ru/*` saying `lang: "ru"`). The kit renders it in static, server and dev builds, and the browser's `applyHead` updates it on client navigation, going back to the served page's language on a page that sets none.
