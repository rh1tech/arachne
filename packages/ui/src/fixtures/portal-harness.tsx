/** Portaled content must leave the DOM when its owner unmounts (overlay leaks). */
import { Portal, render, Show } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { Lightbox } from "../advanced.tsx";

function Overlay(props: { open: boolean }) {
	return (
		<Show when={props.open}>
			<Portal>
				<div class="leak-overlay">overlay</div>
			</Portal>
		</Show>
	);
}

/** A ternary at a fragment root compiles to `memo(() => cond ? createComponent(…) : null)`. */
function FragmentOverlay(props: { show: () => boolean }) {
	return (
		<>
			<span>trigger</span>
			{props.show() ? <Overlay open /> : null}
		</>
	);
}

export function run(root: HTMLElement) {
	const fragment = signal(false);
	const mounted = signal(false);
	const page = signal(true);
	const lightbox = signal<number | null>(null);
	const rerender = signal(0);
	// Called directly inside a tracked JSX expression: every `rerender` bump
	// discards the previous pass, Portal included.
	const direct = () => {
		rerender();
		return Overlay({ open: true });
	};
	const dispose = render(
		() => (
			<div>
				{mounted() ? <Overlay open /> : null}
				<FragmentOverlay show={fragment} />
				<section class="direct">{mounted() ? direct() : null}</section>
				<Show when={page()}>
					{lightbox() !== null ? (
						<Lightbox
							images={[{ src: "a.png", alt: "A" }]}
							index={lightbox() ?? 0}
							onClose={() => lightbox.set(null)}
						/>
					) : null}
				</Show>
			</div>
		),
		root,
	);
	return { mounted, page, lightbox, rerender, fragment, dispose };
}
