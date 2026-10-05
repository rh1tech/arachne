import { Rh1Mark } from "./Rh1Mark.tsx";
import { Rh1Wordmark } from "./Rh1Wordmark.tsx";

/**
 * RH1 credit lockup: origami mark + vectorized “rh1.tech” wordmark.
 * Spacing and vertical centering are owned by `.footer-rh1` / `.rh1-lockup`.
 */
export function Rh1Lockup(props: { size?: number; pauseMs?: number } = {}) {
	return (
		<span class="rh1-lockup">
			<Rh1Mark size={props.size ?? 18} pauseMs={props.pauseMs ?? 3000} startOpen />
			<Rh1Wordmark />
		</span>
	);
}
