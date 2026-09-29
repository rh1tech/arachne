import { renderEffect } from "@arachne/signals";
import { insert } from "./dom.ts";

export type PortalProps = {
	/** Defaults to `document.body`. */
	mount?: Element | undefined;
	children?: unknown;
};

const BRIDGE_TAG = "a-portal-bridge";

type BridgeEl = HTMLElement & { __aDetach?: (() => void) | undefined };

function ensureBridgeElement(): void {
	if (typeof customElements === "undefined") return;
	if (customElements.get(BRIDGE_TAG)) return;
	class PortalBridge extends HTMLElement {
		disconnectedCallback(): void {
			(this as BridgeEl).__aDetach?.();
			(this as BridgeEl).__aDetach = undefined;
		}
	}
	customElements.define(BRIDGE_TAG, PortalBridge);
}

/**
 * Renders `children` into `mount` (body by default) so `position: fixed`
 * overlays escape transformed/filtered ancestors.
 * Returns an in-tree bridge node; removing it, or disposing the owner the
 * Portal was created in, tears down the portal.
 */
export function Portal(props: PortalProps): HTMLElement {
	ensureBridgeElement();

	const bridge = (
		typeof customElements !== "undefined" && customElements.get(BRIDGE_TAG)
			? document.createElement(BRIDGE_TAG)
			: document.createElement("span")
	) as BridgeEl;
	bridge.style.display = "contents";
	bridge.setAttribute("data-a-portal-bridge", "");

	const node = document.createElement("div");
	node.setAttribute("data-a-portal", "");

	insert(node, () => props.children);

	const target = () => props.mount ?? document.body;
	const attach = () => {
		const mount = target();
		if (node.parentNode !== mount) mount.appendChild(node);
	};
	attach();

	const detach = () => {
		node.remove();
	};
	bridge.__aDetach = detach;
	// Also tear down with the reactive owner: a Portal created in a render pass
	// that is discarded before its bridge is ever connected would otherwise stay
	// in `mount` forever (covering the page).
	renderEffect(() => detach);

	// Fallback when custom elements are unavailable (or not yet connected).
	if (typeof customElements === "undefined" || !customElements.get(BRIDGE_TAG)) {
		const watch = (parent: Node) => {
			const observer = new MutationObserver(() => {
				if (!bridge.isConnected) {
					detach();
					observer.disconnect();
				}
			});
			observer.observe(parent, { childList: true });
		};
		const startWatch = () => {
			if (bridge.parentNode) {
				watch(bridge.parentNode);
				return true;
			}
			return false;
		};
		if (!startWatch()) {
			void Promise.resolve().then(() => {
				if (startWatch()) return;
				const start = performance.now();
				const tick = () => {
					if (startWatch()) return;
					if (performance.now() - start < 2000) requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			});
		}
	}

	return bridge;
}
