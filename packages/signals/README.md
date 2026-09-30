# @arachnejs/signals

Fine-grained reactivity for Arachne. Algorithm by
[alien-signals](https://github.com/stackblitz/alien-signals) (MIT); public API
is ours.

```ts
import { signal, computed, effect, batch, untrack, resource } from "@arachnejs/signals";

const count = signal(0);
const doubled = computed(() => count() * 2);
effect(() => console.log(doubled()));
count.set(1);
```

See [ADR 0006](../../docs/adr/0006-jsx-compiled-output.md).
