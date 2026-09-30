import { describe, expect, test } from "bun:test";
import { compile } from "../src/index.ts";

const counterSrc = `
export function Counter(props: { start?: number }) {
  const count = () => props.start ?? 0;
  return (
    <button class="btn" disabled={count() > 10}>
      Count: {count()}
    </button>
  );
}
`;

describe("compile dom", () => {
	test("emits template + runtime imports from @arachnejs/render", () => {
		const { code, isIsland } = compile(counterSrc, {
			filename: "Counter.tsx",
			target: "dom",
		});
		expect(isIsland).toBe(false);
		expect(code).toContain('from "@arachnejs/render"');
		expect(code).toContain("template");
		expect(code).toContain("getNextElement");
		expect(code).toContain("setAttribute");
	});
});

describe("compile ssr", () => {
	test("emits ssr helpers from @arachnejs/render/ssr", () => {
		const { code } = compile(counterSrc, {
			filename: "Counter.tsx",
			target: "ssr",
		});
		expect(code).toContain('from "@arachnejs/render/ssr"');
		expect(code).toContain("ssr(");
		expect(code).toContain("escape");
	});
});

describe("use island", () => {
	test("strips directive and records strategy", () => {
		const src = `"use island"; /* hydrate: idle */
export function Comments() {
  return <div class="comments">hi</div>;
}
`;
		const { code, isIsland, hydrateStrategy } = compile(src, {
			filename: "Comments.tsx",
			target: "dom",
		});
		expect(isIsland).toBe(true);
		expect(hydrateStrategy).toBe("idle");
		expect(code).toContain("@arachne-island hydrate:idle");
		expect(code).not.toContain("use island");
	});
});
