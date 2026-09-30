import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { exclusive } from "./bundle.ts";
import { build, resolveConfig, writeEntries } from "./index.ts";

const root = join(import.meta.dir, `fixtures/broken-${Date.now().toString(36)}`);

afterAll(() => rmSync(root, { recursive: true, force: true }));

test("build errors name the problem and the file, not just 'Bundle failed'", async () => {
	mkdirSync(join(root, "app"), { recursive: true });
	writeFileSync(
		join(root, "app/routes.tsx"),
		`import { missing } from "./does-not-exist.ts";\nexport const routes = [{ path: "/", component: () => <p>{missing}</p> }];\n`,
	);
	const error = await build(root).then(
		() => undefined,
		(e: unknown) => e as Error,
	);
	expect(error?.message).toContain("client build failed");
	expect(error?.message).toContain("does-not-exist.ts");
	expect(error?.message).toContain("routes.tsx");
});

test("CSS url()s pointing at public/ files are left as they are", async () => {
	const site = join(root, "public-urls");
	mkdirSync(join(site, "app"), { recursive: true });
	mkdirSync(join(site, "public/fonts"), { recursive: true });
	writeFileSync(join(site, "public/fonts/body.woff2"), "not really a font");
	writeFileSync(
		join(site, "app/routes.tsx"),
		`export const routes = [{ path: "/", component: () => <p>Hi</p> }];\n`,
	);
	writeFileSync(
		join(site, "app/styles.css"),
		`@font-face { font-family: Body; src: url("/fonts/body.woff2") format("woff2"); }\nbody { font-family: Body; }\n`,
	);
	writeFileSync(
		join(site, "arachne.config.ts"),
		`export default { mode: "static", styles: ["app/styles.css"] };\n`,
	);
	await build(site);
	const assets = readdirSync(join(site, "dist/assets"));
	const css = assets.find((file) => file.endsWith(".css"));
	expect(readFileSync(join(site, "dist/assets", css ?? ""), "utf8")).toMatch(
		/url\("?\/fonts\/body\.woff2"?\)/,
	);
	expect(readFileSync(join(site, "dist/fonts/body.woff2"), "utf8")).toBe("not really a font");
});

test("a CSS url() to a missing absolute path is still an error", async () => {
	const site = join(root, "missing-url");
	mkdirSync(join(site, "app"), { recursive: true });
	writeFileSync(
		join(site, "app/routes.tsx"),
		`export const routes = [{ path: "/", component: () => <p>Hi</p> }];\n`,
	);
	writeFileSync(join(site, "app/styles.css"), `body { background: url("/nope.png"); }\n`);
	writeFileSync(
		join(site, "arachne.config.ts"),
		`export default { mode: "static", styles: ["app/styles.css"] };\n`,
	);
	await expect(build(site)).rejects.toThrow("nope.png");
});

describe("build steps", () => {
	test("run one at a time (overlapping builds race on Linux: spurious EISDIR)", async () => {
		const events: string[] = [];
		const step = (name: string) => async () => {
			events.push(`${name} start`);
			await Bun.sleep(20);
			events.push(`${name} end`);
			return name;
		};
		expect(await Promise.all([exclusive(step("client")), exclusive(step("ssr"))])).toEqual([
			"client",
			"ssr",
		]);
		expect(events).toEqual(["client start", "client end", "ssr start", "ssr end"]);
	});

	test("a failed step doesn't block the next one", async () => {
		await expect(exclusive(async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
		expect(await exclusive(async () => "next")).toBe("next");
	});
});

test("writeEntries leaves unchanged entry files alone (no rewrite under a running build)", async () => {
	const site = join(root, "entries");
	mkdirSync(join(site, "app"), { recursive: true });
	writeFileSync(
		join(site, "app/routes.tsx"),
		`export const routes = [{ path: "/", component: () => <p>Hi</p> }];\n`,
	);
	const config = await resolveConfig(site);
	const { client, ssr } = await writeEntries(config);
	const before = [statSync(client).mtimeMs, statSync(ssr).mtimeMs];
	await Bun.sleep(20);
	await writeEntries(config);
	expect([statSync(client).mtimeMs, statSync(ssr).mtimeMs]).toEqual(before);
});
