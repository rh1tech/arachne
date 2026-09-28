import { effect as trackEffect, untrack } from "@arachne/signals";

/** Shared hydration / SSR config (dom-expressions compatible subset). */
export const sharedConfig: {
	context?: { id: string; count: number } | undefined;
	get?: ((key: string) => Element | undefined) | undefined;
	has?: ((key: string) => boolean) | undefined;
	hydrate?: boolean | undefined;
	done?: boolean | undefined;
} = {};

export function createComponent<P, R>(Comp: (props: P) => R, props: P): R {
	return untrack(() => Comp(props));
}

export function mergeProps<T extends object>(...sources: Array<Partial<T> | undefined>): T {
	const target = {} as T;
	for (const source of sources) {
		if (!source) continue;
		for (const key of Reflect.ownKeys(source)) {
			Object.defineProperty(target, key, {
				enumerable: true,
				configurable: true,
				get: () => Reflect.get(source as object, key),
			});
		}
	}
	return target;
}

export function memo<T>(fn: () => T, _equal?: boolean): () => T {
	let value: T | undefined;
	let ran = false;
	return () => {
		if (!ran) {
			value = fn();
			ran = true;
		}
		return value as T;
	};
}

/**
 * Two-arg effect matching @dom-expressions/compiler 0.50 emit:
 * `effect(() => expr, (v) => apply(v))`
 * Also accepts classic single-arg `effect(() => { ... })`.
 */
export function effect<T>(compute: (prev?: T) => T, apply?: (value: T, prev?: T) => void): void {
	if (!apply) {
		trackEffect(() => {
			compute();
		});
		return;
	}
	let prev: T | undefined;
	trackEffect(() => {
		const value = compute(prev);
		untrack(() => apply(value, prev));
		prev = value;
	});
}

export function scope<T extends () => unknown>(fn: T): T {
	return fn;
}

export { untrack };
