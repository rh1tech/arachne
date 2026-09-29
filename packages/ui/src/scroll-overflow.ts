import { effect, type Signal, signal } from "@arachne/signals";
import { prefersReducedMotion } from "./motion.ts";

/** Element, or an element id to look up. */
export type TrackTarget = HTMLElement | string | null | undefined;

export type ScrollOverflowState = {
	overflowing: Signal<boolean>;
	canLeft: Signal<boolean>;
	canRight: Signal<boolean>;
	scrollBy: (delta: number) => void;
	/** Call inside a component `effect` so cleanup runs on dispose. */
	attach: (getTrack: () => TrackTarget, deps?: () => void) => () => void;
};

/** Frames to wait for the track to mount before giving up (~1s at 60fps). */
const MAX_ATTACH_FRAMES = 60;

function resolve(target: TrackTarget): HTMLElement | null {
	if (!target) return null;
	if (typeof target !== "string") return target;
	const el = document.getElementById(target);
	return el instanceof HTMLElement ? el : null;
}

/** Shared overflow tracking for tabs / navbar scroll tracks. */
export function createScrollOverflow(): ScrollOverflowState {
	const overflowing = signal(false);
	const canLeft = signal(false);
	const canRight = signal(false);
	let current: HTMLElement | null = null;

	const sync = () => {
		const track = current;
		if (!track) return;
		const max = track.scrollWidth - track.clientWidth;
		const hasOverflow = max > 2;
		overflowing.set(hasOverflow);
		canLeft.set(hasOverflow && track.scrollLeft > 1);
		canRight.set(hasOverflow && track.scrollLeft < max - 1);
	};

	return {
		overflowing,
		canLeft,
		canRight,
		scrollBy(delta) {
			current?.scrollBy({ left: delta, behavior: prefersReducedMotion() ? "auto" : "smooth" });
		},
		attach(getTrack, deps) {
			let track: HTMLElement | null = null;
			let ro: ResizeObserver | undefined;
			let raf = 0;
			let frames = 0;
			deps?.();
			const attach = () => {
				track = resolve(getTrack());
				if (!track) {
					if (++frames < MAX_ATTACH_FRAMES) raf = requestAnimationFrame(attach);
					return;
				}
				current = track;
				sync();
				track.addEventListener("scroll", sync, { passive: true });
				if (typeof ResizeObserver !== "undefined") {
					ro = new ResizeObserver(() => sync());
					ro.observe(track);
					if (track.parentElement) ro.observe(track.parentElement);
				}
				window.addEventListener("resize", sync);
			};
			raf = requestAnimationFrame(attach);
			return () => {
				cancelAnimationFrame(raf);
				track?.removeEventListener("scroll", sync);
				ro?.disconnect();
				window.removeEventListener("resize", sync);
			};
		},
	};
}

/** Convenience: wire attach into an effect with reactive deps. */
export function watchScrollOverflow(
	state: ScrollOverflowState,
	getTrack: () => TrackTarget,
	deps: () => void,
): void {
	effect(() => state.attach(getTrack, deps));
}
