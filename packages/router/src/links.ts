/**
 * Should a click on `anchor` become a client-side navigation? Only plain
 * left clicks without modifier keys on same-origin http(s) links to a known
 * route; `target`, `download` and `rel="external"` opt out.
 *
 * @param isKnown - whether the router has a route for a pathname
 * @param origin - the page origin (`location.origin`)
 */
export function shouldIntercept(
	event: MouseEvent,
	anchor: HTMLAnchorElement,
	isKnown: (pathname: string) => boolean,
	origin: string,
): boolean {
	if (event.defaultPrevented || event.button !== 0) return false;
	if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
	const target = anchor.getAttribute("target");
	if (target && target !== "_self") return false;
	if (anchor.hasAttribute("download")) return false;
	if ((anchor.getAttribute("rel") ?? "").split(/\s+/).includes("external")) return false;
	const raw = anchor.getAttribute("href");
	if (raw === null || raw.startsWith("#")) return false;
	let url: URL;
	try {
		url = new URL(raw, anchor.baseURI || origin);
	} catch {
		return false;
	}
	if (url.protocol !== "http:" && url.protocol !== "https:") return false;
	if (url.origin !== origin) return false;
	return isKnown(url.pathname);
}
