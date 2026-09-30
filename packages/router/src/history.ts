import { parseLocation } from "./path.ts";

/** A location as the router sees it. */
export interface HistoryLocation {
	/** Path without query or hash. */
	pathname: string;
	/** Query string including `?`, or `""`. */
	search: string;
	/** Hash including `#`, or `""`. */
	hash: string;
	/** Full path including search + hash. */
	href: string;
}

/** A source of locations: memory (tests, SSR) or the browser. */
export interface RouterHistory {
	/** Current location. */
	readonly location: HistoryLocation;
	/** Subscribe to changes; returns an unsubscribe. */
	listen: (listener: (location: HistoryLocation) => void) => () => void;
	/** Add an entry. */
	push: (to: string) => void;
	/** Replace the current entry. */
	replace: (to: string) => void;
	/** Go back one entry. */
	back: () => void;
}

function toLocation(url: string): HistoryLocation {
	const { pathname, search, hash } = parseLocation(url);
	return { pathname, search, hash, href: `${pathname}${search}${hash}` };
}

/** In-memory history (tests, SSR, prerendering). */
export function memoryHistory(initial = "/"): RouterHistory {
	let current = toLocation(initial);
	const stack: HistoryLocation[] = [current];
	let index = 0;
	const listeners = new Set<(location: HistoryLocation) => void>();

	const notify = (): void => {
		for (const listener of listeners) listener(current);
	};

	return {
		get location() {
			return current;
		},
		listen(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		push(to) {
			current = toLocation(to);
			stack.splice(index + 1);
			stack.push(current);
			index = stack.length - 1;
			notify();
		},
		replace(to) {
			current = toLocation(to);
			stack[index] = current;
			notify();
		},
		back() {
			if (index === 0) return;
			index -= 1;
			current = stack[index] as HistoryLocation;
			notify();
		},
	};
}

/** Browser history (`pushState` / `popstate`). */
export function browserHistory(win: Window = globalThis.window): RouterHistory {
	const listeners = new Set<(location: HistoryLocation) => void>();

	const read = (): HistoryLocation =>
		toLocation(`${win.location.pathname}${win.location.search}${win.location.hash}`);

	let current = read();

	const onPop = (): void => {
		current = read();
		for (const listener of listeners) listener(current);
	};

	win.addEventListener("popstate", onPop);

	return {
		get location() {
			return current;
		},
		listen(listener) {
			listeners.add(listener);
			return () => {
				listeners.delete(listener);
			};
		},
		push(to) {
			win.history.pushState(null, "", to);
			current = toLocation(to);
			for (const listener of listeners) listener(current);
		},
		replace(to) {
			win.history.replaceState(null, "", to);
			current = toLocation(to);
			for (const listener of listeners) listener(current);
		},
		back() {
			win.history.back();
		},
	};
}
