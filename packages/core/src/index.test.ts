import { describe, expect, test } from "bun:test";
import {
	Container,
	createApp,
	createConsoleLogger,
	createToken,
	defineModule,
	EventBus,
	ResolutionError,
} from "../src/index.ts";

describe("createToken", () => {
	test("creates unique tokens with description", () => {
		const a = createToken<string>("a");
		const b = createToken<string>("a");
		expect(a).not.toBe(b);
		expect(a.description).toBe("a");
	});
});

describe("Container", () => {
	test("resolves useValue", () => {
		const Tok = createToken<number>("n");
		const c = new Container();
		c.register({ token: Tok, useValue: 42 });
		expect(c.resolve(Tok)).toBe(42);
	});

	test("resolves singleton useFactory once", () => {
		const Tok = createToken<object>("obj");
		const c = new Container();
		let calls = 0;
		c.register({
			token: Tok,
			useFactory: () => {
				calls += 1;
				return {};
			},
			scope: "singleton",
		});
		expect(c.resolve(Tok)).toBe(c.resolve(Tok));
		expect(calls).toBe(1);
	});

	test("resolves transient useFactory each time", () => {
		const Tok = createToken<object>("obj");
		const c = new Container();
		c.register({
			token: Tok,
			useFactory: () => ({}),
			scope: "transient",
		});
		expect(c.resolve(Tok)).not.toBe(c.resolve(Tok));
	});

	test("child container inherits parent and can override", () => {
		const Tok = createToken<string>("s");
		const parent = new Container();
		parent.register({ token: Tok, useValue: "parent" });
		const child = parent.createChild();
		expect(child.resolve(Tok)).toBe("parent");
		child.register({ token: Tok, useValue: "child" });
		expect(child.resolve(Tok)).toBe("child");
		expect(parent.resolve(Tok)).toBe("parent");
	});

	test("throws ResolutionError for missing token", () => {
		const Tok = createToken<string>("missing");
		const c = new Container();
		expect(() => c.resolve(Tok)).toThrow(ResolutionError);
	});

	test("detects circular dependencies", () => {
		const A = createToken<unknown>("A");
		const B = createToken<unknown>("B");
		const c = new Container();
		c.register({
			token: A,
			useFactory: (ctr) => {
				ctr.resolve(B);
				return {};
			},
		});
		c.register({
			token: B,
			useFactory: (ctr) => {
				ctr.resolve(A);
				return {};
			},
		});
		expect(() => c.resolve(A)).toThrow(/circular/i);
	});

	test("resolveAsync awaits async factory", async () => {
		const Tok = createToken<string>("async");
		const c = new Container();
		c.register({
			token: Tok,
			useFactory: async () => "ok",
		});
		await expect(c.resolveAsync(Tok)).resolves.toBe("ok");
	});
});

describe("EventBus", () => {
	test("on / emit / off", () => {
		const bus = new EventBus();
		const seen: number[] = [];
		const off = bus.on("tick", (n: number) => {
			seen.push(n);
		});
		bus.emit("tick", 1);
		off();
		bus.emit("tick", 2);
		expect(seen).toEqual([1]);
	});

	test("once fires a single time", () => {
		const bus = new EventBus();
		let count = 0;
		bus.once("x", () => {
			count += 1;
		});
		bus.emit("x");
		bus.emit("x");
		expect(count).toBe(1);
	});

	test("emitAsync awaits listeners", async () => {
		const bus = new EventBus();
		const order: string[] = [];
		bus.on("job", async () => {
			await Promise.resolve();
			order.push("a");
		});
		bus.on("job", () => {
			order.push("b");
		});
		await bus.emitAsync("job");
		expect(order).toEqual(["a", "b"]);
	});
});

describe("createConsoleLogger", () => {
	test("child inherits bindings", () => {
		const logger = createConsoleLogger({ level: "info", name: "root" });
		const child = logger.child({ req: "1" });
		expect(child.bindings).toEqual({ name: "root", req: "1" });
	});
});

describe("createApp", () => {
	test("boots modules in dependency order and disposes reverse", async () => {
		const order: string[] = [];
		const a = defineModule({
			name: "a",
			async setup() {
				order.push("setup:a");
			},
			async dispose() {
				order.push("dispose:a");
			},
		});
		const b = defineModule({
			name: "b",
			imports: [a],
			async setup() {
				order.push("setup:b");
			},
			async dispose() {
				order.push("dispose:b");
			},
		});
		const app = createApp({ modules: [b] });
		await app.boot();
		await app.dispose();
		expect(order).toEqual(["setup:a", "setup:b", "dispose:b", "dispose:a"]);
	});

	test("registers module providers into the container", async () => {
		const Tok = createToken<string>("svc");
		const mod = defineModule({
			name: "svc",
			providers: [{ token: Tok, useValue: "hello" }],
		});
		const app = createApp({ modules: [mod] });
		await app.boot();
		expect(app.container.resolve(Tok)).toBe("hello");
		await app.dispose();
	});

	test("rejects module import cycles", () => {
		const a = { name: "a", imports: [] as { name: string; imports?: unknown[] }[] };
		const b = { name: "b", imports: [a] };
		a.imports.push(b);
		expect(() => createApp({ modules: [a] })).toThrow(/cycle/i);
	});
});
