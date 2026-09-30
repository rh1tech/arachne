import { computed, renderEffect, root, untrack } from "@arachnejs/signals";
import { insert, NodeRange } from "./dom.ts";

export type ShowProps<T> = {
	when: T | undefined | null | false;
	keyed?: boolean | undefined;
	fallback?: unknown;
	children: unknown | ((item: NonNullable<T>) => unknown);
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

	// Rows live in detached roots so list updates don't purge them; tie those
	// roots to the owner that created the list so unmounting disposes them.
	renderEffect(() => () => {
		disposeAll(disposers);
		disposers = [];
		items = [];
		mapped = [];
		len = 0;
		if (indexes) indexes.length = 0;
	});

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

/**
 * Conditional render into a {@link NodeRange} (no wrapper element).
 * Element children are created once per falsy→truthy flip (per value when
 * `keyed`), so focus and local state survive unrelated updates. Function
 * children `(value) => …` re-run whenever the value changes.
 */
export function Show<T>(props: ShowProps<T>): NodeRange {
	const range = new NodeRange();
	const value = computed(() => props.when);
	const condition = computed(() => (props.keyed ? value() : Boolean(value())));
	insert(
		range.parent,
		() => {
			// Children and fallback are read tracked so dynamic expressions in them
			// (`{a() ? <A /> : null}`) stay live. Components they create are built
			// untracked, so element children are still stable across unrelated updates.
			if (!condition()) return props.fallback;
			const child = props.children;
			if (typeof child !== "function" || child.length === 0) return child;
			const current = value() as NonNullable<T>;
			return untrack(() => (child as (item: NonNullable<T>) => unknown)(current));
		},
		range.end,
	);
	return range;
}

/** Keyed list render into a {@link NodeRange} (valid inside `<ul>`, `<tbody>`, `<select>`). */
export function For<T>(props: ForProps<T>): NodeRange {
	const range = new NodeRange();
	const fallback =
		"fallback" in props
			? {
					fallback: () => props.fallback as unknown,
				}
			: undefined;
	insert(
		range.parent,
		mapArray(
			() => props.each,
			props.children,
			fallback as { fallback?: (() => unknown) | undefined } | undefined,
		),
		range.end,
	);
	return range;
}

/** Sync pass-through for Phase 0; async resource context comes later. */
export function Suspense(props: SuspenseProps): NodeRange {
	const range = new NodeRange();
	insert(range.parent, () => props.children ?? props.fallback, range.end);
	return range;
}
