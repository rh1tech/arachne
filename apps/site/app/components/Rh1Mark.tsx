import { mountRh1Mark } from "../rh1-origami.ts";

/** Animated RH1 origami mark: unfold → pause → fold → pause → repeat. */
export function Rh1Mark(
	props: { size?: number; pauseMs?: number; startOpen?: boolean } = {},
) {
	const size = props.size ?? 18;
	const pauseMs = props.pauseMs ?? 3000;
	const startOpen = props.startOpen ?? false;
	return (
		<span
			class="rh1-mark"
			aria-hidden="true"
			ref={(el: HTMLElement) => {
				if (typeof document === "undefined") return;
				if (el.dataset.mounted === "1") return;
				el.dataset.mounted = "1";
				mountRh1Mark(el, { size, pauseMs, id: 1, startOpen });
			}}
		/>
	);
}
