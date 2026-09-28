import { describe, expect, test } from "bun:test";
import { batch, computed, effect, resource, signal, store, untrack } from "../src/index.ts";

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
