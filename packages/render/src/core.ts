import { computed, renderEffect as trackEffect, untrack } from "@arachne/signals";

/** Shared hydration / SSR config (dom-expressions compatible subset). */
export const sharedConfig: {
	context?: { id: string; count: number; ids?: number } | undefined;
	get?: ((key: string) => Element | undefined) | undefined;
	has?: ((key: string) => boolean) | undefined;
	hydrate?: boolean | undefined;
	done?: boolean | undefined;
} = {};

let clientIds = 0;

/**
 * Id that matches between SSR and hydration: within `renderToString` /
 * `renderToStream` / `hydrate` it counts per render (prefixed by `renderId`),
 * so the Nth call on the server equals the Nth call while hydrating.
 * Client-only renders fall back to a process-wide counter.
 */
export function createUniqueId(): string {
	const ctx = sharedConfig.context;
	if (!ctx) return `c${(++clientIds).toString(36)}`;
	ctx.ids = (ctx.ids ?? 0) + 1;
	return `${ctx.id}u${ctx.ids.toString(36)}`;
}

export function createComponent<P, R>(Comp: (props: P) => R, props: P): R {
	return untrack(() => Comp(props));
}

type PropsSource<T> = Partial<T> | (() => Partial<T> | undefined) | undefined;

function resolveSource<T>(source: PropsSource<T>): Partial<T> | undefined {
	return typeof source === "function" ? source() : source;
}

/**
 * Merge props left-to-right; later sources win unless their value is `undefined`,
 * so `mergeProps({ size: "md" }, props)` works as defaults. Function sources
 * (emitted for `{...expr}` spreads) are re-read on every access.
 */
export function mergeProps<T extends object>(...sources: Array<PropsSource<T>>): T {
	const read = (key: PropertyKey): unknown => {
		for (let i = sources.length - 1; i >= 0; i--) {
			const source = resolveSource(sources[i]);
			if (!source) continue;
			const value = Reflect.get(source as object, key);
			if (value !== undefined) return value;
		}
		return undefined;
	};
	const keys = (): PropertyKey[] => {
		const out = new Set<PropertyKey>();
		for (const source of sources) {
			const resolved = resolveSource(source);
			if (resolved) for (const key of Reflect.ownKeys(resolved)) out.add(key);
		}
		return [...out];
	};

	if (sources.some((source) => typeof source === "function")) {
		return new Proxy({} as T, {
			get: (_, key) => read(key),
			has: (_, key) => keys().includes(key),
			ownKeys: () => keys() as Array<string | symbol>,
			getOwnPropertyDescriptor: (_, key) =>
				keys().includes(key)
					? { configurable: true, enumerable: true, get: () => read(key) }
					: undefined,
		});
	}

	const target = {} as T;
	for (const key of keys()) {
		Object.defineProperty(target, key, {
			enumerable: true,
			configurable: true,
			get: () => read(key),
		});
	}
	return target;
}

/**
 * Split props into `[picked, rest]`, preserving getters so both halves stay
 * reactive. Use it to forward unknown attributes to the root.
 */
/**
 * Everything except `keys`, as a live view (getters stay reactive). Cheaper
 * than {@link splitProps} when the picked half isn't needed.
 */
export function omitProps<T extends object, const K extends ReadonlyArray<keyof T>>(
	props: T,
	keys: K,
): Omit<T, K[number]> {
	const claimed = new Set<PropertyKey>(keys);
	const restKeys = () => Reflect.ownKeys(props).filter((key) => !claimed.has(key));
	return new Proxy(
		{},
		{
			get: (_, key) => (claimed.has(key) ? undefined : Reflect.get(props, key)),
			has: (_, key) => !claimed.has(key) && Reflect.has(props, key),
			ownKeys: () => restKeys() as Array<string | symbol>,
			getOwnPropertyDescriptor: (_, key) =>
				!claimed.has(key) && Reflect.has(props, key)
					? { configurable: true, enumerable: true, get: () => Reflect.get(props, key) }
					: undefined,
		},
	) as Omit<T, K[number]>;
}

export function splitProps<T extends object, const K extends ReadonlyArray<keyof T>>(
	props: T,
	keys: K,
): [Pick<T, K[number]>, Omit<T, K[number]>] {
	const pick = (keys: ReadonlyArray<PropertyKey>) => {
		const out = {};
		for (const key of keys) {
			Object.defineProperty(out, key, {
				enumerable: true,
				configurable: true,
				get: () => Reflect.get(props, key),
			});
		}
		return out;
	};
	return [pick(keys), omitProps(props, keys)] as [Pick<T, K[number]>, Omit<T, K[number]>];
}

export function memo<T>(fn: () => T, _equal?: boolean): () => T {
	const c = computed(fn);
	return () => c();
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
