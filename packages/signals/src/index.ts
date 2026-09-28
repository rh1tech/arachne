import {
	computed as alienComputed,
	effect as alienEffect,
	signal as alienSignal,
	effectScope,
	endBatch,
	getActiveSub,
	setActiveSub,
	startBatch,
} from "alien-signals";

export type Signal<T> = {
	(): T;
	(value: T): void;
	get(): T;
	set(value: T): void;
	peek(): T;
};

export type ReadonlySignal<T> = {
	(): T;
	get(): T;
	peek(): T;
};

function wrapSignal<T>(inner: { (): T; (value: T): void }): Signal<T> {
	function api(value?: T): T | undefined {
		if (arguments.length === 0) return inner();
		inner(value as T);
		return undefined;
	}
	const signalApi = api as Signal<T>;
	signalApi.get = () => inner();
	signalApi.set = (value: T) => {
		inner(value);
	};
	signalApi.peek = () => untrack(() => inner());
	return signalApi;
}

export function signal<T>(): Signal<T | undefined>;
export function signal<T>(initialValue: T): Signal<T>;
export function signal<T>(initialValue?: T): Signal<T | undefined> {
	const inner = alienSignal(initialValue as T);
	return wrapSignal(inner as { (): T; (value: T): void }) as Signal<T | undefined>;
}

export function computed<T>(fn: (previous?: T) => T): ReadonlySignal<T> {
	const inner = alienComputed(fn);
	const api = (() => inner()) as ReadonlySignal<T>;
	api.get = () => inner();
	api.peek = () => untrack(() => inner());
	return api;
}

export function effect(fn: () => void | (() => void)): () => void {
	return alienEffect(fn);
}

export function batch<T>(fn: () => T): T {
	startBatch();
	try {
		return fn();
	} finally {
		endBatch();
	}
}

export function untrack<T>(fn: () => T): T {
	const prev = getActiveSub();
	setActiveSub(undefined);
	try {
		return fn();
	} finally {
		setActiveSub(prev);
	}
}

export function root(fn: () => void | (() => void)): () => void {
	return effectScope(fn);
}

export type ResourceState<T> =
	| { status: "pending"; loading: true; error: undefined; value: undefined }
	| { status: "ready"; loading: false; error: undefined; value: T }
	| { status: "errored"; loading: false; error: unknown; value: undefined };

export interface Resource<T> extends ReadonlySignal<T | undefined> {
	state: ReadonlySignal<ResourceState<T>>;
	loading: ReadonlySignal<boolean>;
	error: ReadonlySignal<unknown>;
	refetch: () => void;
}

export function resource<T>(fetcher: () => Promise<T>): Resource<T> {
	const state = signal<ResourceState<T>>({
		status: "pending",
		loading: true,
		error: undefined,
		value: undefined,
	});
	let version = 0;

	const run = (): void => {
		version += 1;
		const current = version;
		state.set({
			status: "pending",
			loading: true,
			error: undefined,
			value: undefined,
		});
		fetcher().then(
			(value) => {
				if (current !== version) return;
				state.set({
					status: "ready",
					loading: false,
					error: undefined,
					value,
				});
			},
			(error: unknown) => {
				if (current !== version) return;
				state.set({
					status: "errored",
					loading: false,
					error,
					value: undefined,
				});
			},
		);
	};

	run();

	const value = computed(() => {
		const s = state();
		return s.status === "ready" ? s.value : undefined;
	});

	const api = (() => value()) as Resource<T>;
	api.get = () => value();
	api.peek = () => value.peek();
	api.state = computed(() => state());
	api.loading = computed(() => state().loading);
	api.error = computed(() => state().error);
	api.refetch = run;
	return api;
}

export type Store<T extends object> = T;

export function store<T extends object>(initial: T): Store<T> {
	const signals = new Map<PropertyKey, Signal<unknown>>();

	const ensure = (key: PropertyKey, value: unknown): Signal<unknown> => {
		let s = signals.get(key);
		if (!s) {
			s = signal(value);
			signals.set(key, s);
		}
		return s;
	};

	return new Proxy(initial, {
		get(target, prop) {
			if (typeof prop === "symbol") return Reflect.get(target, prop);
			const current = Reflect.get(target, prop);
			return ensure(prop, current)();
		},
		set(target, prop, value) {
			if (typeof prop === "symbol") return Reflect.set(target, prop, value);
			Reflect.set(target, prop, value);
			ensure(prop, value).set(value);
			return true;
		},
	}) as Store<T>;
}

export { effectScope, endBatch, getActiveSub, setActiveSub, startBatch };
