import { afterEach, beforeEach, expect, test } from "bun:test";
import { Window } from "happy-dom";
import { browserHistory, createRouter, Link } from "./index.ts";

let win: Window;
beforeEach(() => {
	win = new Window({ url: "https://site.test/docs/" });
	Object.assign(globalThis, { window: win, document: win.document });
});
afterEach(() => win.close());

test("Link renders a real anchor with the base path and navigates on click", async () => {
	const router = createRouter({
		base: "/docs",
		history: browserHistory(win as never),
		routes: [
			{ path: "/", component: () => "home" },
			{ path: "/guide", component: () => "guide" },
		],
		scroll: false,
	});
	const anchor = Link({
		href: "/guide",
		class: "nav",
		children: "Guide",
		"data-testid": "g",
	}) as HTMLAnchorElement;
	win.document.body.appendChild(anchor as unknown as never);
	expect(anchor.getAttribute("href")).toBe("/docs/guide");
	expect(anchor.getAttribute("class")).toBe("nav");
	expect(anchor.getAttribute("data-testid")).toBe("g");
	const event = new win.MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
	anchor.dispatchEvent(event as unknown as Event);
	expect(event.defaultPrevented).toBe(true);
	await Promise.resolve();
	expect(win.location.pathname).toBe("/docs/guide");
	expect(router.location().pathname).toBe("/guide");
	const active = Link({ href: "/guide", children: "Guide" }) as HTMLAnchorElement;
	expect(active.getAttribute("aria-current")).toBe("page");
	expect(active.getAttribute("class")).toBe("active");
	router.dispose();
});

test("modified clicks are left to the browser", () => {
	const router = createRouter({
		history: browserHistory(win as never),
		routes: [{ path: "/guide", component: () => "guide" }],
	});
	const anchor = Link({ href: "/guide", children: "Guide" }) as HTMLAnchorElement;
	win.document.body.appendChild(anchor as unknown as never);
	const event = new win.MouseEvent("click", {
		bubbles: true,
		cancelable: true,
		button: 0,
		metaKey: true,
	});
	anchor.dispatchEvent(event as unknown as Event);
	expect(event.defaultPrevented).toBe(false);
	router.dispose();
});
