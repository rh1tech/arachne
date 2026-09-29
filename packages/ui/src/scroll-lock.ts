let lockCount = 0;
let savedOverflow = "";
let savedPaddingRight = "";

/**
 * Lock document scroll; returns an unlock function (ref-counted for stacked
 * overlays). The scrollbar width is added to the body's existing padding and
 * exposed as `--a-scrollbar-gap` on `<html>` so fixed elements can compensate.
 */
export function lockBodyScroll(): () => void {
	if (typeof document === "undefined") return () => {};

	if (lockCount === 0) {
		const html = document.documentElement;
		const body = document.body;
		// clientWidth is 0 without layout (headless DOMs); don't treat the window as a scrollbar.
		const scrollbar = html.clientWidth > 0 ? window.innerWidth - html.clientWidth : 0;
		savedOverflow = body.style.overflow;
		savedPaddingRight = body.style.paddingRight;
		if (scrollbar > 0) {
			const current = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
			body.style.paddingRight = `${current + scrollbar}px`;
			html.style.setProperty("--a-scrollbar-gap", `${scrollbar}px`);
		}
		body.style.overflow = "hidden";
		html.classList.add("a-scroll-locked");
	}
	lockCount += 1;

	let released = false;
	return () => {
		if (released) return;
		released = true;
		lockCount = Math.max(0, lockCount - 1);
		if (lockCount > 0) return;
		const html = document.documentElement;
		document.body.style.overflow = savedOverflow;
		document.body.style.paddingRight = savedPaddingRight;
		html.style.removeProperty("--a-scrollbar-gap");
		html.classList.remove("a-scroll-locked");
	};
}
