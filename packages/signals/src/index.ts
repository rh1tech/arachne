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

/**
 * Owner captured by {@link untrack}. Tracking and ownership share alien-signals'
 * `activeSub`, so untracked code would otherwise create orphan effects that
 * outlive the component that made them.
 */
let untrackedOwner: ReturnType<typeof getActiveSub>;

let serverDepth = 0;

/**
 * Run `fn` with effects disabled — used by server rendering, where effects
 * (DOM listeners, timers, rAF) must not run. Computeds and signals still work.
 */
export function withoutEffects<T>(fn: () => T): T {
	serverDepth += 1;
	try {
		return fn();
	} finally {
		serverDepth -= 1;
	}
}

/** True while rendering on the server (inside {@link withoutEffects}). */
export function isServerRender(): boolean {
	return serverDepth > 0;
}

const noop = () => {};

type Owner = ReturnType<typeof getActiveSub>;

/** Create an alien effect under `owner` (the enclosing or untrack-captured one). */
function startEffect(fn: () => void | (() => void), owner: Owner): () => void {
	if (owner === undefined || getActiveSub() === owner) return alienEffect(fn);
	const prev = setActiveSub(owner);
	try {
		return alienEffect(fn);
	} finally {
		setActiveSub(prev);
	}
}

const currentOwner = (): Owner => getActiveSub() ?? untrackedOwner;

let deferred: Array<() => void> | undefined;

/**
 * Run `fn`, queueing {@link effect}s created inside until it returns — used by
 * hydration so the render phase (which claims server DOM in order) matches the
 * server, where effects never run. {@link renderEffect}s still run inline.
 */
export function deferEffects<T>(fn: () => T): T {
	if (deferred) return fn();
	const queue: Array<() => void> = [];
	deferred = queue;
	let result: T;
	try {
		result = fn();
	} finally {
		deferred = undefined;
	}
	for (const start of queue) start();
	return result;
}

/**
 * Side-effect for components (listeners, timers, DOM measurement). Owned by
 * the enclosing effect, skipped on the server, deferred while hydrating.
 */
export function effect(fn: () => void | (() => void)): () => void {
	if (serverDepth > 0) return noop;
	const owner = currentOwner();
	if (!deferred) return startEffect(fn, owner);
	let stop: (() => void) | undefined;
	let cancelled = false;
	deferred.push(() => {
		if (!cancelled) stop = startEffect(fn, owner);
	});
	return () => {
		cancelled = true;
		stop?.();
	};
}

/**
 * Effect for renderer bindings: runs immediately even while hydrating, so DOM
 * bindings attach during the render phase. Not for application code.
 */
export function renderEffect(fn: () => void | (() => void)): () => void {
	return startEffect(fn, currentOwner());
}

export function batch<T>(fn: () => T): T {
	startBatch();
	try {
		return fn();
	} finally {
		endBatch();
	}
}

/** Read without subscribing; effects created inside stay owned by the enclosing effect. */
export function untrack<T>(fn: () => T): T {
	const prev = getActiveSub();
	const prevOwner = untrackedOwner;
	if (prev !== undefined) untrackedOwner = prev;
	setActiveSub(undefined);
	try {
		return fn();
	} finally {
		setActiveSub(prev);
		untrackedOwner = prevOwner;
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
