/**
 * Anchored positioning for tooltips, popovers and menus: flip to the opposite
 * side when the preferred one overflows, shift along the edge to stay in the
 * viewport, and point the arrow at the anchor centre. Uses `position: fixed`
 * (no portal), so DOM order, tab order and click-outside keep working while
 * `overflow` ancestors no longer clip the floating element.
 */

export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "end";
export type Placement = Side | `${Side}-${Align}`;

export type Rect = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};
export type Size = { width: number; height: number };

export type PositionOptions = {
	viewport: Size;
	/** Gap between anchor and floating element, px (default 8). */
	offset?: number | undefined;
	/** Minimum distance from the viewport edge, px (default 8). */
	padding?: number | undefined;
	/** Keep the arrow this far from the floating element's corners, px (default 12). */
	arrowPadding?: number | undefined;
};

export type Position = {
	x: number;
	y: number;
	placement: Placement;
	/** Arrow offset along the cross axis, relative to the floating element. */
	arrow: number;
};

const OPPOSITE: Record<Side, Side> = { top: "bottom", bottom: "top", left: "right", right: "left" };

function split(placement: Placement): [Side, Align | undefined] {
	const [side, align] = placement.split("-") as [Side, Align | undefined];
	return [side, align];
}

function join(side: Side, align: Align | undefined): Placement {
	return (align ? `${side}-${align}` : side) as Placement;
}

const clamp = (value: number, min: number, max: number) =>
	Math.min(Math.max(value, min), Math.max(min, max));

/** Free space on `side` of the anchor. */
function space(side: Side, anchor: Rect, viewport: Size): number {
	if (side === "top") return anchor.top;
	if (side === "bottom") return viewport.height - anchor.bottom;
	if (side === "left") return anchor.left;
	return viewport.width - anchor.right;
}

function mainAxis(side: Side, anchor: Rect, floating: Size, offset: number): number {
	if (side === "top") return anchor.top - offset - floating.height;
	if (side === "bottom") return anchor.bottom + offset;
	if (side === "left") return anchor.left - offset - floating.width;
	return anchor.right + offset;
}

function crossAxis(side: Side, align: Align | undefined, anchor: Rect, floating: Size): number {
	const vertical = side === "top" || side === "bottom";
	const start = vertical ? anchor.left : anchor.top;
	const anchorSize = vertical ? anchor.width : anchor.height;
	const size = vertical ? floating.width : floating.height;
	if (align === "start") return start;
	if (align === "end") return start + anchorSize - size;
	return start + anchorSize / 2 - size / 2;
}

/** Pure placement math — see module docs. */
export function computePosition(
	anchor: Rect,
	floating: Size,
	placement: Placement,
	options: PositionOptions,
): Position {
	const offset = options.offset ?? 8;
	const padding = options.padding ?? 8;
	const arrowPadding = options.arrowPadding ?? 12;
	const [preferred, align] = split(placement);
	const vertical = preferred === "top" || preferred === "bottom";
	const need = (vertical ? floating.height : floating.width) + offset + padding;

	let side = preferred;
	const opposite = OPPOSITE[preferred];
	if (
		space(preferred, anchor, options.viewport) < need &&
		space(opposite, anchor, options.viewport) >= need
	) {
		side = opposite;
	}

	const main = mainAxis(side, anchor, floating, offset);
	const limit = vertical
		? options.viewport.width - floating.width
		: options.viewport.height - floating.height;
	const cross = clamp(crossAxis(side, align, anchor, floating), padding, limit - padding);

	const anchorCentre = vertical ? anchor.left + anchor.width / 2 : anchor.top + anchor.height / 2;
	const size = vertical ? floating.width : floating.height;
	const arrow = clamp(anchorCentre - cross, arrowPadding, size - arrowPadding);

	return {
		x: vertical ? cross : main,
		y: vertical ? main : cross,
		placement: join(side, align),
		arrow,
	};
}

/** Properties that make an ancestor the containing block of `position: fixed`. */
function trapsFixed(cs: CSSStyleDeclaration): boolean {
	return (
		cs.transform !== "none" ||
		cs.perspective !== "none" ||
		(cs.filter !== "" && cs.filter !== "none") ||
		(cs.backdropFilter !== undefined && cs.backdropFilter !== "" && cs.backdropFilter !== "none") ||
		/paint|layout|strict|content/.test(cs.contain) ||
		/transform|perspective|filter/.test(cs.willChange)
	);
}

/**
 * Viewport offset of the element `position: fixed` resolves against: normally
 * the viewport (0,0), but a transformed/filtered ancestor captures it.
 */
function containingBlockOrigin(el: HTMLElement): { left: number; top: number } {
	for (
		let node = el.parentElement;
		node && node !== document.documentElement;
		node = node.parentElement
	) {
		if (trapsFixed(getComputedStyle(node))) {
			const rect = node.getBoundingClientRect();
			return { left: rect.left + node.clientLeft, top: rect.top + node.clientTop };
		}
	}
	return { left: 0, top: 0 };
}

/**
 * Keep `floating` positioned next to `anchor` while both are mounted. Writes
 * `left`/`top`, `data-placement` (after flipping) and `--a-arrow` on the
 * floating element, and re-runs on scroll, resize and size changes.
 */
export function autoPosition(
	anchor: Element,
	floating: HTMLElement,
	placement: () => Placement,
	options: Omit<PositionOptions, "viewport"> = {},
): () => void {
	floating.setAttribute("data-floating", "");
	let frame = 0;

	const update = () => {
		frame = 0;
		if (!anchor.isConnected || !floating.isConnected) return;
		const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
		// Layout size: unaffected by the enter animation's transform.
		const size = { width: floating.offsetWidth, height: floating.offsetHeight };
		const pos = computePosition(anchor.getBoundingClientRect(), size, placement(), {
			...options,
			viewport,
		});
		const origin = containingBlockOrigin(floating);
		floating.style.left = `${pos.x - origin.left}px`;
		floating.style.top = `${pos.y - origin.top}px`;
		floating.setAttribute("data-placement", pos.placement);
		floating.style.setProperty("--a-arrow", `${pos.arrow}px`);
	};
	const schedule = () => {
		if (!frame) frame = requestAnimationFrame(update);
	};

	update();
	window.addEventListener("scroll", schedule, { capture: true, passive: true });
	window.addEventListener("resize", schedule);
	const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : undefined;
	ro?.observe(anchor);
	ro?.observe(floating);

	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener("scroll", schedule, { capture: true });
		window.removeEventListener("resize", schedule);
		ro?.disconnect();
		floating.removeAttribute("data-floating");
	};
}
