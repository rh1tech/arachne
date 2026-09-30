import { effect, signal, untrack } from "@arachnejs/signals";

export type PresenceState = "open" | "closed";

export type Presence = {
	/** Keep the node in the tree (true while the exit animation plays). */
	mounted: () => boolean;
	/** Mirror onto `data-state` so CSS can run enter / exit keyframes. */
	state: () => PresenceState;
	/** Attach to the animated element; exit waits for its animation to finish. */
	ref: (el: HTMLElement) => void;
};

function parseTimes(list: string): number {
	return Math.max(
		0,
		...list.split(",").map((part) => {
			const v = part.trim();
			if (v.endsWith("ms")) return Number.parseFloat(v);
			if (v.endsWith("s")) return Number.parseFloat(v) * 1000;
			return 0;
		}),
	);
}

/** Longest animation/transition (duration + delay) currently applied, in ms. */
export function motionDuration(el: Element): number {
	if (typeof getComputedStyle === "undefined") return 0;
	const cs = getComputedStyle(el);
	const animated =
		cs.animationName && cs.animationName !== "none"
			? parseTimes(cs.animationDuration || "0s") + parseTimes(cs.animationDelay || "0s")
			: 0;
	const transitioned =
		parseTimes(cs.transitionDuration || "0s") + parseTimes(cs.transitionDelay || "0s");
	return Math.max(animated, transitioned);
}

/**
 * Mount/unmount with exit animations. While `open()` is true the node is
 * mounted with `data-state="open"`; on close it flips to `"closed"` and stays
 * mounted until its CSS animation or transition ends (or immediately when
 * there is none, e.g. `prefers-reduced-motion`).
 */
export function createPresence(open: () => boolean): Presence {
	const initial = untrack(open);
	const mounted = signal(initial);
	const state = signal<PresenceState>(initial ? "open" : "closed");
	let el: HTMLElement | undefined;

	effect(() => {
		const isOpen = open();
		return untrack(() => {
			if (isOpen) {
				mounted.set(true);
				state.set("open");
				return;
			}
			if (!mounted()) return;
			state.set("closed");
			const node = el;
			const ms = node ? motionDuration(node) : 0;
			if (!node || ms <= 0) {
				mounted.set(false);
				return;
			}
			let done = false;
			const finish = (e?: Event) => {
				if (done || (e && e.target !== node)) return;
				done = true;
				cleanup();
				if (!untrack(open)) mounted.set(false);
			};
			const timer = setTimeout(finish, ms + 50);
			node.addEventListener("animationend", finish);
			node.addEventListener("transitionend", finish);
			const cleanup = () => {
				clearTimeout(timer);
				node.removeEventListener("animationend", finish);
				node.removeEventListener("transitionend", finish);
			};
			return cleanup;
		});
	});

	return {
		mounted: () => mounted(),
		state: () => state(),
		ref: (node) => {
			el = node;
		},
	};
}

export function prefersReducedMotion(): boolean {
	return (
		typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}
