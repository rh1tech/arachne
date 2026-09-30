import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bundle } from "./bundle.ts";
import { build } from "./index.ts";

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

describe("Bun's spurious EISDIR", () => {
	const file = join(import.meta.dir, "index.ts"); // a regular file
	const eisdir = (path: string) =>
		new AggregateError(
			[{ message: `EISDIR reading file: "${path}"`, position: null }],
			"Bundle failed",
		);
	const ok = { success: true, outputs: [], logs: [] } as unknown as Awaited<
		ReturnType<typeof Bun.build>
	>;

	test("is retried when the path is a regular file", async () => {
		let calls = 0;
		const result = await bundle("client", { entrypoints: [] }, async () => {
			calls += 1;
			if (calls < 3) throw eisdir(file);
			return ok;
		});
		expect(result).toBe(ok);
		expect(calls).toBe(3);
	});

	test("gives up after two retries, and never retries other errors", async () => {
		let calls = 0;
		await expect(
			bundle("client", { entrypoints: [] }, async () => {
				calls += 1;
				throw eisdir(file);
			}),
		).rejects.toThrow("EISDIR");
		expect(calls).toBe(3);
		calls = 0;
		await expect(
			bundle("client", { entrypoints: [] }, async () => {
				calls += 1;
				throw eisdir(import.meta.dir); // really a directory: a real error
			}),
		).rejects.toThrow("EISDIR");
		expect(calls).toBe(1);
	});
});
