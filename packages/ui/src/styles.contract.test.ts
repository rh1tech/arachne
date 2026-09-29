/**
 * CSS contracts for interaction states that mount tests cannot see
 * (e.g. :hover contrast on already-active controls).
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(join(import.meta.dir, "styles.css"), "utf8");

function ruleBody(selector: string): string {
	const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
	expect(match, `missing rule for ${selector}`).toBeTruthy();
	return match?.[1] ?? "";
}

describe("styles contracts", () => {
	test("active pagination page keeps accent-ink on hover", () => {
		const inactiveHover = ruleBody(".a-pagination-page:hover:not(.a-pagination-page-active)");
		expect(inactiveHover).toContain("color: var(--a-accent)");

		const active = ruleBody(".a-pagination-page-active");
		expect(active).toContain("color: var(--a-accent-ink)");
		expect(active).toContain("background: var(--a-accent)");

		const activeHover = ruleBody(".a-pagination-page-active:hover");
		expect(activeHover).toContain("color: var(--a-accent-ink)");
		expect(activeHover).not.toMatch(/color:\s*var\(--a-accent\)\s*;/);
	});

	test("tabs and navbar avoid clipping overflow menus", () => {
		const shell = ruleBody(".a-tabs-shell");
		expect(shell).toContain("min-width: 0");
		expect(shell).toContain("max-width: 100%");

		const track = ruleBody(".a-tabs-track");
		expect(track).toContain("overflow-x: auto");
		expect(track).toContain("scrollbar-width: none");

		const navTrack = ruleBody(".a-navbar-track");
		expect(navTrack).toContain("overflow-x: auto");
		expect(navTrack).toContain("scrollbar-width: none");

		const desktop = ruleBody(".a-navbar-desktop");
		expect(desktop).toContain("overflow: visible");

		const sticky = ruleBody(".a-navbar-sticky");
		expect(sticky).toContain("position: sticky");
		expect(sticky).toContain("top: 0");

		const fixed = ruleBody(".a-navbar-fixed");
		expect(fixed).toContain("position: fixed");
		expect(fixed).toContain("top: 0");
	});

	test("modal footer keeps the panel's rounded bottom corners", () => {
		const footer = ruleBody(".a-modal-footer");
		expect(footer).toMatch(/border-radius:\s*0 0 calc\(var\(--a-radius\) \* 1\.5\)/);
		// `inherit` is invalid inside a shorthand and silently drops the declaration.
		expect(css).not.toMatch(/border-radius:[^;]*\binherit\b[^;]*\binherit\b/);
	});

	test("navbar flyout items fill the menu and focus rings are not clipped", () => {
		expect(css).toMatch(/\.a-nav-flyout-menu \.a-nav-link\s*\{[^}]*width: 100%/);
		const focus = ruleBody(".a-nav-link:focus-visible");
		expect(focus).toContain("outline: 2px solid var(--a-ring)");
		// The track scrolls horizontally (overflow clips), so the ring must be inset.
		expect(focus).toContain("outline-offset: -2px");
	});

	test("doc example preview and code block join into one card", () => {
		expect(ruleBody(".a-doc-example")).toContain("gap: var(--a-doc-example-gap)");
		expect(ruleBody(".a-doc-example-preview + .a-codeblock")).toContain(
			"margin-top: calc(var(--a-doc-example-gap) * -1)",
		);
	});
});
