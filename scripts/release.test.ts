import { expect, test } from "bun:test";
import { type Manifest, releasePlan } from "./release.ts";

const pkg = (name: string, deps: string[] = [], extra: Partial<Manifest> = {}): Manifest => ({
	name,
	version: "0.1.0",
	dir: `packages/${name.split("/")[1]}`,
	dependencies: Object.fromEntries(deps.map((d) => [d, "workspace:*"])),
	...extra,
});

test("publishes dependencies before dependents and skips private packages", () => {
	const plan = releasePlan(
		[
			pkg("@arachnejs/kit", ["@arachnejs/router", "@arachnejs/signals"]),
			pkg("@arachnejs/router", ["@arachnejs/signals"]),
			pkg("@arachnejs/signals"),
			pkg("@arachnejs/site", ["@arachnejs/kit"], { private: true }),
		],
		() => false,
	);
	expect(plan.map((p) => p.name)).toEqual([
		"@arachnejs/signals",
		"@arachnejs/router",
		"@arachnejs/kit",
	]);
});

test("leaves out versions that are already on the registry", () => {
	const plan = releasePlan(
		[pkg("@arachnejs/signals"), pkg("@arachnejs/router", ["@arachnejs/signals"])],
		(name) => name === "@arachnejs/signals",
	);
	expect(plan.map((p) => p.name)).toEqual(["@arachnejs/router"]);
});

test("rejects dependency cycles", () => {
	expect(() =>
		releasePlan(
			[pkg("@arachnejs/a", ["@arachnejs/b"]), pkg("@arachnejs/b", ["@arachnejs/a"])],
			() => false,
		),
	).toThrow("cycle");
});
