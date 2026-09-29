import { describe, expect, test } from "bun:test";
import {
	batch,
	computed,
	deferEffects,
	effect,
	isServerRender,
	renderEffect,
	resource,
	signal,
	store,
	untrack,
	withoutEffects,
} from "../src/index.ts";

describe("signal", () => {
	test("get / set via call and methods", () => {
		const count = signal(0);
		expect(count()).toBe(0);
		count(1);
		expect(count.get()).toBe(1);
		count.set(2);
		expect(count.peek()).toBe(2);
	});
});

describe("computed + effect", () => {
	test("tracks and updates", () => {
		const count = signal(1);
		const doubled = computed(() => count() * 2);
		const seen: number[] = [];
		const stop = effect(() => {
			seen.push(doubled());
		});
		expect(seen).toEqual([2]);
		count.set(2);
		expect(seen).toEqual([2, 4]);
		stop();
		count.set(3);
		expect(seen).toEqual([2, 4]);
	});
});

describe("batch", () => {
	test("coalesces updates", () => {
		const a = signal(0);
		const b = signal(0);
		let runs = 0;
		effect(() => {
			a();
			b();
			runs += 1;
		});
		expect(runs).toBe(1);
		batch(() => {
			a.set(1);
			b.set(1);
		});
		expect(runs).toBe(2);
	});
});

describe("untrack", () => {
	test("does not subscribe", () => {
		const a = signal(0);
		let runs = 0;
		effect(() => {
			untrack(() => a());
			runs += 1;
		});
		a.set(1);
		expect(runs).toBe(1);
	});
});

describe("untrack ownership", () => {
	test("effects created under untrack are disposed with the enclosing effect", () => {
		const show = signal(true);
		const tick = signal(0);
		let runs = 0;
		let cleanups = 0;
		effect(() => {
			if (!show()) return;
			untrack(() => {
				effect(() => {
					tick();
					runs++;
					return () => {
						cleanups++;
					};
				});
			});
		});
		tick.set(1);
		expect(runs).toBe(2);

		show.set(false);
		expect(cleanups).toBe(2);
		tick.set(2);
		expect(runs).toBe(2);
	});

	test("untrack still hides reads from the enclosing effect", () => {
		const outer = signal(0);
		const inner = signal(0);
		let parentRuns = 0;
		effect(() => {
			outer();
			parentRuns++;
			untrack(() => {
				inner();
				effect(() => {
					inner();
				});
			});
		});
		inner.set(1);
		expect(parentRuns).toBe(1);
		outer.set(1);
		expect(parentRuns).toBe(2);
	});

	test("untrack outside any effect creates a root effect", () => {
		const a = signal(0);
		let runs = 0;
		const stop = untrack(() =>
			effect(() => {
				a();
				runs++;
			}),
		);
		a.set(1);
		expect(runs).toBe(2);
		stop();
		a.set(2);
		expect(runs).toBe(2);
	});
});

describe("deferEffects", () => {
	test("queues effects until the callback returns, then starts them under their owner", () => {
		const order: string[] = [];
		const toggle = signal(true);
		const tick = signal(0);
		let childRuns = 0;
		effect(() => {
			if (!toggle()) return;
			untrack(() =>
				deferEffects(() => {
					effect(() => {
						tick();
						childRuns++;
						order.push("user");
					});
					renderEffect(() => {
						order.push("render");
					});
					order.push("body");
				}),
			);
		});
		expect(order).toEqual(["render", "body", "user"]);
		tick.set(1);
		expect(childRuns).toBe(2);
		toggle.set(false);
		tick.set(2);
		expect(childRuns).toBe(2);
	});

	test("a deferred effect disposed before it starts never runs", () => {
		let runs = 0;
		deferEffects(() => {
			const stop = effect(() => {
				runs++;
			});
			stop();
		});
		expect(runs).toBe(0);
	});
});

describe("withoutEffects", () => {
	test("skips effects created inside (server rendering) but keeps computeds", () => {
		const a = signal(1);
		let runs = 0;
		const doubled = withoutEffects(() => {
			expect(isServerRender()).toBe(true);
			const stop = effect(() => {
				a();
				runs++;
			});
			stop();
			return computed(() => a() * 2);
		});
		expect(runs).toBe(0);
		expect(doubled()).toBe(2);
		expect(isServerRender()).toBe(false);
		effect(() => {
			a();
			runs++;
		});
		expect(runs).toBe(1);
	});

	test("nests and restores after throwing", () => {
		expect(() =>
			withoutEffects(() => {
				withoutEffects(() => {});
				expect(isServerRender()).toBe(true);
				throw new Error("boom");
			}),
		).toThrow("boom");
		expect(isServerRender()).toBe(false);
	});
});

describe("resource", () => {
	test("resolves async value", async () => {
		const r = resource(async () => {
			await Promise.resolve();
			return 42;
		});
		expect(r.loading()).toBe(true);
		await Bun.sleep(10);
		expect(r()).toBe(42);
		expect(r.state().status).toBe("ready");
	});
});

describe("store", () => {
	test("deep path tracking at top level", () => {
		const user = store({ name: "ada", age: 0 });
		const seen: string[] = [];
		effect(() => {
			seen.push(user.name);
		});
		user.name = "grace";
		expect(seen).toEqual(["ada", "grace"]);
		user.age = 1;
		expect(seen).toEqual(["ada", "grace"]);
	});
});
