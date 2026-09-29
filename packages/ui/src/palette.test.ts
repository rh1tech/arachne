import { describe, expect, test } from "bun:test";
import { Window } from "happy-dom";
import {
	applyPalette,
	applyRadius,
	contrastRatio,
	defaultPalette,
	paletteStyle,
	palettes,
	paletteVars,
	radii,
	readableInk,
	resolvePalette,
	resolveRadius,
} from "./palette.ts";

describe("palette", () => {
	test("resolvePalette merges partials onto default", () => {
		const p = resolvePalette({ accent: "#ff0000" });
		expect(p.accent).toBe("#ff0000");
		expect(p.ink).toBe(defaultPalette.ink);
	});

	test("named presets resolve", () => {
		expect(resolvePalette("lagoon").accent).toBe(palettes.lagoon.accent);
		expect(paletteVars("meadow")["--a-accent"]).toBe(palettes.meadow.accent);
		expect(resolvePalette().accent).toBe(palettes.graphite.accent);
		expect(Object.keys(palettes).length).toBeGreaterThanOrEqual(30);
	});

	test("radius scale resolves to CSS lengths", () => {
		expect(resolveRadius("none")).toBe(radii.none);
		expect(resolveRadius("sm")).toBe(radii.sm);
		expect(resolveRadius("lg")).toBe(radii.lg);
		expect(resolveRadius()).toBe(radii.sm);
		expect(resolveRadius("12px")).toBe("12px");
		expect(paletteVars("graphite")["--a-radius"]).toBe(radii.sm);
		expect(paletteVars({ radius: "lg" })["--a-radius"]).toBe(radii.lg);
	});

	test("paletteStyle emits css custom properties", () => {
		const css = paletteStyle({ accent: "#112233" });
		expect(css).toContain("--a-accent:#112233");
		expect(css).toContain("--a-ink:");
		expect(css).toContain(`--a-radius:${radii.sm}`);
	});

	test("applyPalette writes and restores :root", () => {
		const window = new Window({ url: "https://localhost/" });
		const g = globalThis as unknown as Record<string, unknown>;
		g["window"] = window;
		g["document"] = window.document;
		g["HTMLElement"] = window.HTMLElement;

		const root = document.documentElement;
		root.style.setProperty("--a-accent", "#000000");
		const restore = applyPalette("harbor", root);
		expect(root.style.getPropertyValue("--a-accent")).toBe(palettes.harbor.accent);
		restore();
		expect(root.style.getPropertyValue("--a-accent")).toBe("#000000");
		window.close();
	});

	test("applyRadius writes scale and restores", () => {
		const window = new Window({ url: "https://localhost/" });
		const g = globalThis as unknown as Record<string, unknown>;
		g["window"] = window;
		g["document"] = window.document;
		g["HTMLElement"] = window.HTMLElement;

		const root = document.documentElement;
		const restore = applyRadius("lg", root);
		expect(root.style.getPropertyValue("--a-radius")).toBe(radii.lg);
		expect(root.classList.contains("a-radius-lg")).toBe(true);
		restore();
		expect(root.classList.contains("a-radius-lg")).toBe(false);
		window.close();
	});

	test("contrastRatio follows WCAG (3/6/8-digit hex)", () => {
		expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 1);
		expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
		expect(contrastRatio("#777777ff", "#ffffff")).toBeCloseTo(4.48, 1);
		expect(Number.isNaN(contrastRatio("nope", "#fff"))).toBe(true);
	});

	test("readableInk picks a text colour that passes AA on any accent", () => {
		for (const bg of ["#fca311", "#8fa28a", "#2196f3", "#ffff00", "#000000", "#777777"]) {
			expect(contrastRatio(bg, readableInk(bg))).toBeGreaterThanOrEqual(4.5);
		}
	});

	test("every preset resolves accent/accentInk to WCAG AA contrast", () => {
		const failing = Object.keys(palettes).filter((name) => {
			const p = resolvePalette(name as keyof typeof palettes);
			return contrastRatio(p.accent, p.accentInk) < 4.5;
		});
		expect(failing).toEqual([]);
	});

	test("explicit accentInk is respected; omitted ink is derived", () => {
		expect(resolvePalette({ accent: "#fcd34d", accentInk: "#ffffff" }).accentInk).toBe("#ffffff");
		const derived = resolvePalette({ accent: "#fcd34d" });
		expect(contrastRatio(derived.accent, derived.accentInk)).toBeGreaterThanOrEqual(4.5);
	});

	test("every preset emits readable on-tone inks for solid tone surfaces", () => {
		const failures: string[] = [];
		for (const name of Object.keys(palettes) as Array<keyof typeof palettes>) {
			const vars = paletteVars(name);
			for (const tone of ["danger", "success", "warning", "info"] as const) {
				const bg = vars[`--a-${tone}`] as string;
				const ink = vars[`--a-${tone}-ink`];
				if (!ink) failures.push(`${name}.${tone}: no ink`);
				else if (contrastRatio(bg, ink) < 4.5)
					failures.push(`${name}.${tone}: ${contrastRatio(bg, ink).toFixed(2)}`);
			}
		}
		expect(failures).toEqual([]);
	});
});
