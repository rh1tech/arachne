/**
 * A runnable example of one component. Examples are the single source of
 * truth for the showcase catalog, the generated reference docs, and the
 * customization / SSR / hydration contract tests.
 */

/** Extra attributes a test or page may pass through to the example's host. */
export type ExampleProps = {
	id?: string;
	class?: string;
	style?: Record<string, string>;
	unstyled?: boolean;
	"data-probe"?: string;
	"aria-label"?: string;
};

export type Example = {
	/** Component name — also its `configureUI` theme key. */
	name: string;
	/** Slot that receives `class` / `style` / forwarded attrs (default `root`). */
	host?: string;
	/** Minimal render with required props; spreads `p` onto the component. */
	render: (p: ExampleProps) => unknown;
	/**
	 * Interactive showcase version, for components that would otherwise cover
	 * the page on render (portaled overlays) or need a trigger to be visible.
	 */
	demo?: () => unknown;
};
