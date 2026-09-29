const FOCUSABLE = [
	"a[href]",
	"area[href]",
	"button:not([disabled])",
	"input:not([disabled]):not([type='hidden'])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"iframe",
	"[contenteditable='true']",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

export function focusableIn(root: Element): HTMLElement[] {
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
		(el) => !el.hasAttribute("inert") && el.getAttribute("aria-hidden") !== "true",
	);
}

/**
 * Move focus into `container` (first `[data-autofocus]`, else `preferred`,
 * else first focusable, else the container), keep Tab cycling inside, and restore focus to the
 * previously focused element when the returned function runs.
 */
export function trapFocus(
	container: HTMLElement,
	preferred?: ((container: HTMLElement) => HTMLElement | null | undefined) | undefined,
): () => void {
	const previous = document.activeElement as HTMLElement | null;
	const initial =
		container.querySelector<HTMLElement>("[data-autofocus]") ??
		preferred?.(container) ??
		focusableIn(container)[0] ??
		container;
	if (initial === container && !container.hasAttribute("tabindex")) {
		container.setAttribute("tabindex", "-1");
	}
	initial.focus({ preventScroll: true });

	const onKey = (e: KeyboardEvent) => {
		if (e.key !== "Tab") return;
		const items = focusableIn(container);
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0] as HTMLElement;
		const last = items[items.length - 1] as HTMLElement;
		const active = document.activeElement;
		if (e.shiftKey && (active === first || !container.contains(active))) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !container.contains(active))) {
			e.preventDefault();
			first.focus();
		}
	};
	container.addEventListener("keydown", onKey);

	return () => {
		container.removeEventListener("keydown", onKey);
		if (previous?.isConnected) previous.focus({ preventScroll: true });
	};
}

export type RovingOptions = {
	orientation?: "horizontal" | "vertical" | "both" | undefined;
	/** Wrap from last to first (default true). */
	loop?: boolean | undefined;
};

const PREV_KEYS = {
	horizontal: ["ArrowLeft"],
	vertical: ["ArrowUp"],
	both: ["ArrowUp", "ArrowLeft"],
};
const NEXT_KEYS = {
	horizontal: ["ArrowRight"],
	vertical: ["ArrowDown"],
	both: ["ArrowDown", "ArrowRight"],
};

/** `[start, step]` for a navigation key, or `null` when the key doesn't navigate. */
function navStart(
	key: string,
	current: number,
	count: number,
	options: RovingOptions,
): [number, number] | null {
	const orientation = options.orientation ?? "horizontal";
	if (key === "Home") return [-1, 1];
	if (key === "End") return [count, -1];
	if (NEXT_KEYS[orientation].includes(key)) return [current, 1];
	if (PREV_KEYS[orientation].includes(key)) return [current, -1];
	return null;
}

/**
 * Next index for arrow / Home / End navigation over `count` items, skipping
 * `disabled(i)`. Returns `null` when the key is not a navigation key.
 */
export function rovingIndex(
	key: string,
	current: number,
	count: number,
	disabled: (index: number) => boolean = () => false,
	options: RovingOptions = {},
): number | null {
	const nav = navStart(key, current, count, options);
	if (!nav) return null;
	const [start, step] = nav;
	const wrap = (options.loop ?? true) && key !== "Home" && key !== "End";
	for (let i = 1; i <= count; i++) {
		const raw = start + step * i;
		const inRange = raw >= 0 && raw < count;
		if (!inRange && !wrap) return null;
		const next = (raw + count) % count;
		if (!disabled(next)) return next;
	}
	return null;
}

/**
 * Run `fn(el)` once `get()` returns a connected element — immediately if it
 * already is, otherwise on the next microtask (effects can run before a
 * portal inserts its content). Returns a disposer for `fn`'s cleanup.
 */
export function whenConnected(
	get: () => HTMLElement | undefined,
	fn: (el: HTMLElement) => (() => void) | undefined | void,
): () => void {
	let cancelled = false;
	let cleanup: (() => void) | undefined | void;
	const run = () => {
		const el = get();
		if (cancelled || !el?.isConnected) return;
		cleanup = fn(el);
	};
	if (get()?.isConnected) run();
	else queueMicrotask(run);
	return () => {
		cancelled = true;
		cleanup?.();
	};
}
