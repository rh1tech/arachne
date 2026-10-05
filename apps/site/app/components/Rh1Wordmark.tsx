import { RH1_WORDMARK } from "../rh1-wordmark.ts";

/**
 * Vectorized “rh1.tech” in IBM Plex Sans SemiBold.
 * Paths only — no font file required at runtime.
 */
export function Rh1Wordmark() {
	return (
		<svg
			class="rh1-wordmark"
			xmlns="http://www.w3.org/2000/svg"
			viewBox={RH1_WORDMARK.viewBox}
			fill="currentColor"
			aria-hidden="true"
			focusable="false"
		>
			<path d={RH1_WORDMARK.d} />
		</svg>
	);
}
