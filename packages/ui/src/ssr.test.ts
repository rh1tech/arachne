/**
 * Every component must server-render: compile the kit with `target: "ssr"`,
 * render each contract case to a string, and check the forwarded attributes
 * survive into the HTML (portal-based overlays intentionally render nothing).
 */
import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { bunPlugin } from "@arachne/vite";
import type { SsrResult } from "./fixtures/ssr-harness.tsx";

/**
 * Client-only by design: overlays rendered through Portal, ToTop (appears
 * after the user scrolls) and OfflineNotice (network state is client-only). Their server HTML is empty.
 */
const CLIENT_ONLY = new Set([
	"ToTop",
	"OfflineNotice",
	"Modal",
	"Drawer",
	"ToastHost",
	"BottomSheet",
	"ConfirmDialog",
	"Lightbox",
	"Spotlight",
]);

let results: SsrResult[] = [];

beforeAll(async () => {
	const outdir = join(import.meta.dir, "../.test-out/ssr");
	mkdirSync(outdir, { recursive: true });
	const build = await Bun.build({
		entrypoints: [join(import.meta.dir, "fixtures/ssr-harness.tsx")],
		outdir,
		target: "bun",
		format: "esm",
		// Runtime deps resolve from node_modules; bundling them twice per process trips Bun (EISDIR).
		external: ["@arachne/signals", "alien-signals"],
		plugins: [
			{
				name: "contract-ssr-stub",
				setup(b) {
					b.onResolve({ filter: /test-utils\/contract\.tsx$/ }, () => ({
						path: join(import.meta.dir, "test-utils/contract-ssr-stub.ts"),
					}));
				},
			},
			bunPlugin({ target: "ssr", hydratable: true }),
		],
	});
	if (!build.success) throw new Error(build.logs.map(String).join("\n"));
	const mod = (await import(`${build.outputs[0]?.path}?t=${Date.now()}`)) as {
		renderAll: () => SsrResult[];
	};
	results = mod.renderAll();
});

describe("server rendering", () => {
	test("covers every registered component", () => {
		expect(results.length).toBeGreaterThan(300);
	});

	test("no component throws on the server", () => {
		const failures = results
			.filter((r) => r.error)
			.map((r) => `${r.group}/${r.name}: ${r.error?.split("\n")[0]}`);
		expect(failures).toEqual([]);
	});

	test("forwarded attributes and classes reach the server HTML", () => {
		const missing = results
			.filter((r) => !r.error && !CLIENT_ONLY.has(r.name))
			.filter((r) => !r.html?.includes(`data-probe="${r.name}"`) || !r.html.includes("probe-class"))
			.map((r) => `${r.group}/${r.name}`);
		expect(missing).toEqual([]);
	});

	test("client-only components render nothing server-side", () => {
		const leaked = results.filter((r) => CLIENT_ONLY.has(r.name) && r.html?.includes("data-probe"));
		expect(leaked.map((r) => r.name)).toEqual([]);
	});

	test("no DOM-only artefacts leak into markup", () => {
		const bad = results
			.filter((r) => r.html && /\[object |function |undefined="|NaN/.test(r.html))
			.map(
				(r) =>
					`${r.name}: ${r.html?.match(/.{0,40}(\[object |function |undefined="|NaN).{0,40}/)?.[0]}`,
			);
		expect(bad).toEqual([]);
	});
});
