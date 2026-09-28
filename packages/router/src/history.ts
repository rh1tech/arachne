import { parseLocation } from "./path.ts";

export interface HistoryLocation {
	pathname: string;
	search: string;
	hash: string;
	/** Full path including search + hash. */
	href: string;
}

export interface RouterHistory {
	readonly location: HistoryLocation;
	listen: (listener: (location: HistoryLocation) => void) => () => void;
	push: (to: string) => void;
	replace: (to: string) => void;
	back: () => void;
}

function toLocation(url: string): HistoryLocation {
	const { pathname, search, hash } = parseLocation(url);
	return { pathname, search, hash, href: `${pathname}${search}${hash}` };
}

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
