# @arachnejs/core

Kernel for the Arachne framework: dependency injection, module lifecycle,
typed events, and a logger interface.

## Install

```bash
bun add @arachnejs/core
```

## Quick start

```ts
import {
  createApp,
  createToken,
  defineModule,
  type Logger,
} from "@arachnejs/core";

const Greeter = createToken<{ hello(): string }>("Greeter");

const greet = defineModule({
  name: "greet",
  providers: [
    {
      token: Greeter,
      useValue: { hello: () => "hi" },
    },
  ],
  async setup(ctx) {
    ctx.logger.info(ctx.container.resolve(Greeter).hello());
  },
});

const app = createApp({ modules: [greet] });
await app.boot();
await app.dispose();
```

## API

| Export | Role |
|---|---|
| `createToken` | Opaque DI token |
| `Container` | Singleton / transient / factory providers, child scopes |
| `defineModule` | Declarative module with providers + lifecycle |
| `EventBus` | Typed pub/sub |
| `createConsoleLogger` | Default `Logger` |
| `createApp` | Boots modules in topological order |

Zero runtime dependencies. See [ADR 0003](../../docs/adr/0003-core-kernel.md).
