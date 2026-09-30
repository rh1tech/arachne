---
"@arachnejs/kit": patch
---

Builds retry (twice) when Bun reports "EISDIR reading file" for a path that is a regular file, an intermittent Bun failure on Linux. Build log entries without a source position now show their message.
