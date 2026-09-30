import { effect } from "@arachnejs/signals";

export type ClickOutsideOptions = {
	/** Defaults to `pointerdown` (captures before focus changes). */
	event?: "pointerdown" | "mousedown" | "click" | undefined;
};

/**
 * While `active()` is true, invoke `onOutside` for events outside `root()`.
 * Listener is deferred one turn so the gesture that opened the UI does not
 * immediately dismiss it.
 */
export function watchClickOutside(
	active: () => boolean,
	root: () => Element | null | undefined,
	onOutside: () => void,
	options: ClickOutsideOptions = {},
): void {
	const type = options.event ?? "pointerdown";
	effect(() => {
		if (!active()) return;
		const onDoc = (e: Event) => {
			const target = e.target;
			if (!(target instanceof Node)) return;
			const el = root();
			if (el?.contains(target)) return;
			onOutside();
		};
		const timer = window.setTimeout(() => {
			document.addEventListener(type, onDoc, true);
		}, 0);
		return () => {
			window.clearTimeout(timer);
			document.removeEventListener(type, onDoc, true);
		};
	});
}
