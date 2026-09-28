export type HydrateStrategy = "visible" | "idle" | "load" | "interaction" | `media(${string})`;

export interface IslandOptions {
	hydrate?: HydrateStrategy;
}

/** Runtime marker used by the JSX island transform. */
export function island<P, R>(
	Component: (props: P) => R,
	options: IslandOptions = {},
): (props: P) => R {
	const hydrate = options.hydrate ?? "visible";
	const wrapped = ((props: P) => Component(props)) as (props: P) => R;
	Object.defineProperty(wrapped, "__island", {
		value: { hydrate, component: Component },
	});
	return wrapped;
}

function schedule(strategy: string, run: () => void, el: Element): void {
	if (strategy === "load") {
		run();
		return;
	}
	if (strategy === "idle") {
		const ric = (
			globalThis as unknown as {
				requestIdleCallback?: (cb: () => void) => number;
			}
		).requestIdleCallback;
		if (ric) ric(run);
		else setTimeout(run, 1);
		return;
	}
	if (strategy === "interaction") {
		const once = (): void => {
			el.removeEventListener("pointerdown", once);
			el.removeEventListener("focusin", once);
			el.removeEventListener("keydown", once);
			run();
		};
		el.addEventListener("pointerdown", once, { once: true });
		el.addEventListener("focusin", once, { once: true });
		el.addEventListener("keydown", once, { once: true });
		return;
	}
	if (strategy.startsWith("media(")) {
		const query = strategy.slice(6, -1);
		const mql = matchMedia(query);
		if (mql.matches) run();
		else mql.addEventListener("change", () => run(), { once: true });
		return;
	}
	// visible (default)
	const io = new IntersectionObserver((entries) => {
		if (entries.some((e) => e.isIntersecting)) {
			io.disconnect();
			run();
		}
	});
	io.observe(el);
}

/**
 * Tiny island custom element loader (register once per page).
 * `loader(chunkId)` must return the island module's default/component export.
 */
export function defineIslandElement(
	loader: (chunkId: string) => Promise<(props: unknown) => unknown>,
	hydrateFn: (component: (props: unknown) => unknown, el: Element, props: unknown) => void,
	deserialize: (raw: string) => unknown = (raw) => JSON.parse(raw),
): void {
	if (customElements.get("a-island")) return;

	class AIsland extends HTMLElement {
		#booted = false;

		connectedCallback(): void {
			if (this.#booted) return;
			this.#booted = true;
			const chunkId = this.getAttribute("data-c");
			const propsRaw = this.getAttribute("data-p") ?? "null";
			const strategy = this.getAttribute("data-h") ?? "visible";
			if (!chunkId) return;
			schedule(
				strategy,
				() => {
					void loader(chunkId).then((component) => {
						hydrateFn(component, this, deserialize(propsRaw));
					});
				},
				this,
			);
		}
	}

	customElements.define("a-island", AIsland);
}
