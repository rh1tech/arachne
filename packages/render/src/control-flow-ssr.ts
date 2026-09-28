/** SSR control-flow builtins — sync evaluation (no reactive wrappers). */

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

export function Show<T>(props: ShowProps<T>): unknown {
	const cond = props.when;
	if (cond) {
		const child = props.children;
		const fn = typeof child === "function" && child.length > 0;
		return fn ? (child as (item: NonNullable<T>) => unknown)(cond as NonNullable<T>) : child;
	}
	return props.fallback;
}

export function For<T>(props: ForProps<T>): unknown {
	const list = props.each;
	if (!list || list.length === 0) {
		return "fallback" in props ? props.fallback : [];
	}
	return list.map((item, i) => props.children(item, () => i));
}

export function Suspense(props: SuspenseProps): unknown {
	return props.children ?? props.fallback;
}
