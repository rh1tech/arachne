import { computed, root, untrack } from "@arachne/signals";

export type ShowProps<T> = {
	when: T | undefined | null | false;
	keyed?: boolean | undefined;
	fallback?: unknown;
	children: unknown | ((item: NonNullable<T> | (() => NonNullable<T>)) => unknown);
};

export type ForProps<T> = {
	each: readonly T[] | undefined | null | false;
	fallback?: unknown;
	children: (item: T, index: () => number) => unknown;
};

export type SuspenseProps = {
	fallback?: unknown;
	children?: unknown;
};

const FALLBACK = Symbol("fallback");

function disposeAll(disposers: Array<(() => void) | undefined>): void {
	for (const d of disposers) d?.();
}

/**
 * Keyed list map adapted from Solid's mapArray (MIT) — item identity reuse +
 * per-row effectScope disposal via alien-signals.
 */
export function mapArray<T, R>(
	list: () => readonly T[] | undefined | null | false,
	mapFn: (item: T, index: () => number) => R,
	options: { fallback?: (() => R) | undefined } = {},
): () => R[] {
	let items: Array<T | typeof FALLBACK> = [];
	let mapped: R[] = [];
	let disposers: Array<(() => void) | undefined> = [];
	let len = 0;
	const indexes = mapFn.length > 1 ? ([] as Array<((i: number) => void) | undefined>) : null;

	return () => {
		const newItems = (list() || []) as T[];
		const newLen = newItems.length;

		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: ports Solid mapArray algorithm
		return untrack(() => {
			let newIndices: Map<T, number>;
			let newIndicesNext: number[];
			let temp: R[];
			let tempDisposers: Array<(() => void) | undefined>;
			let tempIndexes: Array<((i: number) => void) | undefined> | undefined;
			let start: number;
			let end: number;
			let newEnd: number;
			let item: T;
			let i: number;
			let j: number;

			if (newLen === 0) {
				if (len !== 0) {
					disposeAll(disposers);
					disposers = [];
					items = [];
					mapped = [];
					len = 0;
					if (indexes) indexes.length = 0;
				}
				const fallback = options.fallback;
				if (fallback) {
					items = [FALLBACK];
					let result!: R;
					disposers[0] = root(() => {
						result = fallback();
					});
					mapped[0] = result;
					len = 1;
				}
				return mapped;
			}

			if (len === 0) {
				mapped = new Array(newLen);
				for (j = 0; j < newLen; j += 1) {
					items[j] = newItems[j] as T;
					mapped[j] = createRow(j);
				}
				len = newLen;
				return mapped;
			}

			temp = new Array(newLen);
			tempDisposers = new Array(newLen);
			if (indexes) tempIndexes = new Array(newLen);

			for (
				start = 0, end = Math.min(len, newLen);
				start < end && items[start] === newItems[start];
				start += 1
			);

			for (
				end = len - 1, newEnd = newLen - 1;
				end >= start && newEnd >= start && items[end] === newItems[newEnd];
				end -= 1, newEnd -= 1
			) {
				temp[newEnd] = mapped[end] as R;
				tempDisposers[newEnd] = disposers[end];
				if (indexes && tempIndexes) tempIndexes[newEnd] = indexes[end];
			}

			newIndices = new Map();
			newIndicesNext = new Array(newEnd + 1);
			for (j = newEnd; j >= start; j -= 1) {
				item = newItems[j] as T;
				i = newIndices.get(item) as number;
				newIndicesNext[j] = i === undefined ? -1 : i;
				newIndices.set(item, j);
			}

			for (i = start; i <= end; i += 1) {
				item = items[i] as T;
				j = newIndices.get(item) as number;
				if (j !== undefined && j !== -1) {
					temp[j] = mapped[i] as R;
					tempDisposers[j] = disposers[i];
					if (indexes && tempIndexes) tempIndexes[j] = indexes[i];
					j = newIndicesNext[j] as number;
					newIndices.set(item, j);
				} else {
					disposers[i]?.();
				}
			}

			for (j = start; j < newLen; j += 1) {
				if (j in temp) {
					mapped[j] = temp[j] as R;
					disposers[j] = tempDisposers[j];
					if (indexes && tempIndexes) {
						indexes[j] = tempIndexes[j];
						indexes[j]?.(j);
					}
				} else {
					mapped[j] = createRow(j);
				}
			}

			mapped = mapped.slice(0, newLen);
			len = newLen;
			items = newItems.slice(0) as T[];
			return mapped;

			function createRow(index: number): R {
				let result!: R;
				disposers[index] = root(() => {
					if (indexes) {
						let idx = index;
						indexes[index] = (v: number) => {
							idx = v;
						};
						result = mapFn(newItems[index] as T, () => idx);
					} else {
						result = mapFn(newItems[index] as T, () => index);
					}
				});
				return result;
			}
		});
	};
}

export function Show<T>(props: ShowProps<T>): () => unknown {
	const condition = computed(() => props.when);
	return computed(() => {
		const c = condition();
		if (c) {
			const child = props.children;
			const fn = typeof child === "function" && child.length > 0;
			return fn
				? untrack(() => (child as (item: NonNullable<T>) => unknown)(c as NonNullable<T>))
				: child;
		}
		return props.fallback;
	});
}

export function For<T>(props: ForProps<T>): () => unknown[] {
	const fallback =
		"fallback" in props
			? {
					fallback: () => props.fallback as unknown,
				}
			: undefined;
	return mapArray(
		() => props.each,
		props.children,
		fallback as { fallback?: (() => unknown) | undefined } | undefined,
	) as () => unknown[];
}

/** Sync pass-through for Phase 0; async resource context comes later. */
export function Suspense(props: SuspenseProps): () => unknown {
	return computed(() => props.children ?? props.fallback);
}
