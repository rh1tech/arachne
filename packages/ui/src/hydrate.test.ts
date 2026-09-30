/**
 * SSR → hydrate round trip: the client must adopt server markup (no duplicate
 * DOM), agree on generated ids, and become interactive.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { clearDelegatedEvents, delegateEvents } from "@arachnejs/render";
import type { Signal } from "@arachnejs/signals";
import { bunPlugin } from "@arachnejs/vite";
import { type Dom, setupDom } from "./test-utils/dom.ts";

const outdir = join(import.meta.dir, "../.test-out/hydrate");
let serverHtml = "";
let clientPath = "";

async function build(entry: string, target: "ssr" | "dom"): Promise<string> {
	const result = await Bun.build({
		entrypoints: [join(import.meta.dir, `fixtures/${entry}`)],
		outdir: join(outdir, target),
		target: target === "ssr" ? "bun" : "browser",
		format: "esm",
		plugins: [bunPlugin({ target, hydratable: true })],
		// Runtime deps resolve from node_modules (bundling them twice per process trips Bun).
		external:
			target === "dom"
				? ["@arachnejs/render", "@arachnejs/signals"]
				: ["@arachnejs/signals", "alien-signals"],
	});
	if (!result.success) throw new Error(result.logs.map(String).join("\n"));
	return result.outputs[0]?.path ?? "";
}

beforeAll(async () => {
	mkdirSync(outdir, { recursive: true });
	const server = (await import(await build("hydrate-server.tsx", "ssr"))) as { html: () => string };
	serverHtml = server.html();
	clientPath = await build("hydrate-client.tsx", "dom");
});

type Api = { dispose: () => void; tab: Signal<string>; clicks: Signal<number> };
let dom: Dom;
let api: Api;
let root: HTMLElement;

beforeEach(async () => {
	dom = setupDom();
	clearDelegatedEvents();
	root = document.createElement("div");
	root.innerHTML = serverHtml;
	document.body.appendChild(root);
	const mod = (await import(`${clientPath}?t=${Date.now()}`)) as { run: (r: HTMLElement) => Api };
	delegateEvents(["click", "keydown"]);
	api = mod.run(root);
});

afterEach(() => {
	api.dispose();
	dom.teardown();
});

describe("hydration", () => {
	test("server markup is complete and escaped", () => {
		expect(serverHtml).toContain("Panel A");
		expect(serverHtml).toContain('role="tablist"');
		expect(serverHtml).not.toContain("[object");
	});

	test("adopts server DOM without duplicating it", () => {
		expect(root.querySelectorAll("#app").length).toBe(1);
		expect(root.querySelectorAll('[role="tab"]').length).toBe(2);
		expect(root.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(root.querySelectorAll("input#email").length).toBe(1);
	});

	test("ids generated on the server match the client wiring", () => {
		const tabEl = root.querySelector<HTMLElement>('[role="tab"]');
		const panel = root.querySelector<HTMLElement>('[role="tabpanel"]');
		expect(tabEl?.getAttribute("aria-controls")).toBe(panel?.id ?? "missing");
		expect(panel?.getAttribute("aria-labelledby")).toBe(tabEl?.id ?? "missing");
		const input = root.querySelector("#email");
		const help = root.querySelector(".a-help");
		expect(input?.getAttribute("aria-describedby")).toBe(help?.id ?? "missing");
	});

	test("becomes interactive after hydration", () => {
		const beta = [...root.querySelectorAll<HTMLElement>('[role="tab"]')].find(
			(t) => t.textContent === "Beta",
		);
		beta?.click();
		expect(api.tab()).toBe("b");
		expect(root.querySelector('[role="tabpanel"]')?.textContent).toBe("Panel B");
		expect(root.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		root.querySelector<HTMLElement>(".a-btn")?.click();
		expect(api.clicks()).toBe(1);
	});
});
