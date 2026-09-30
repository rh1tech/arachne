/** Portals are torn down with their owner: closed or unmounted overlays leave nothing behind. */
import { afterEach, beforeEach, expect, test } from "bun:test";
import type { Signal } from "@arachnejs/signals";
import { type Dom, type Mounted, mountHarness, setupDom } from "./test-utils/dom.ts";

type Api = {
	mounted: Signal<boolean>;
	page: Signal<boolean>;
	lightbox: Signal<number | null>;
	rerender: Signal<number>;
	fragment: Signal<boolean>;
};
let dom: Dom;
let h: Mounted<Api>;

beforeEach(async () => {
	dom = setupDom();
	h = await mountHarness<Api>("portal");
});

afterEach(() => {
	h.dispose();
	dom.teardown();
});

const settle = () => new Promise((r) => setTimeout(r, 0));

test("portal content mounted conditionally is removed when the condition flips", async () => {
	h.api.mounted.set(true);
	await settle();
	// One from the component, one from the direct call.
	expect(document.querySelectorAll(".leak-overlay").length).toBe(2);
	h.api.mounted.set(false);
	await settle();
	expect(document.querySelectorAll(".leak-overlay").length).toBe(0);
});

test("an open Lightbox closes on onClose and when its page unmounts", async () => {
	h.api.lightbox.set(0);
	await settle();
	expect(document.querySelectorAll(".a-lightbox").length).toBe(1);
	h.api.lightbox.set(null);
	await settle();
	expect(document.querySelectorAll(".a-lightbox").length).toBe(0);

	h.api.lightbox.set(0);
	await settle();
	h.api.page.set(false);
	await settle();
	expect(document.querySelectorAll(".a-lightbox").length).toBe(0);
});

test("a Portal from a discarded render pass does not stay in the document", async () => {
	h.api.mounted.set(true);
	await settle();
	h.api.rerender.set(1);
	h.api.rerender.set(2);
	await settle();
	expect(document.querySelectorAll(".leak-overlay").length).toBe(2);
	h.api.mounted.set(false);
	await settle();
	expect(document.querySelectorAll("[data-a-portal]").length).toBe(0);
});

test("a Portal created inside a fragment-root ternary opens and closes", async () => {
	h.api.fragment.set(true);
	await settle();
	expect(document.querySelectorAll(".leak-overlay").length).toBe(1);
	h.api.fragment.set(false);
	await settle();
	expect(document.querySelectorAll(".leak-overlay").length).toBe(0);
});
