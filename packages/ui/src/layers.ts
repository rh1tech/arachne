import { effect } from "@arachnejs/signals";

type Layer = { onEscape: () => void };

const stack: Layer[] = [];
let listening = false;

function onKeydown(e: KeyboardEvent): void {
	if (e.key !== "Escape" || e.defaultPrevented) return;
	const top = stack[stack.length - 1];
	if (!top) return;
	e.preventDefault();
	top.onEscape();
}

/**
 * While `active()` is true, register a dismissable layer. Escape only closes
 * the topmost layer, so a Menu inside a Modal inside a Drawer unwinds one
 * level per keypress.
 */
export function watchEscape(active: () => boolean, onEscape: () => void): void {
	effect(() => {
		if (!active() || typeof document === "undefined") return;
		const layer: Layer = { onEscape };
		stack.push(layer);
		if (!listening) {
			document.addEventListener("keydown", onKeydown);
			listening = true;
		}
		return () => {
			const i = stack.lastIndexOf(layer);
			if (i >= 0) stack.splice(i, 1);
			if (stack.length === 0 && listening) {
				document.removeEventListener("keydown", onKeydown);
				listening = false;
			}
		};
	});
}

/** Number of open layers (for tests / debugging). */
export function layerDepth(): number {
	return stack.length;
}
