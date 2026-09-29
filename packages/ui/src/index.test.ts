import { describe, expect, test } from "bun:test";
import { cx } from "../src/cx.ts";
import { bgColor, gap, m, mt, p, textColor, util } from "../src/utils.ts";

describe("cx", () => {
	test("joins truthy parts", () => {
		expect(cx("a", false, "b", undefined, "c")).toBe("a b c");
	});
});

describe("utils", () => {
	test("builds spacing and color utility classes", () => {
		expect(m(2)).toBe("a-m-2");
		expect(mt(4)).toBe("a-mt-4");
		expect(p(3)).toBe("a-p-3");
		expect(gap(1)).toBe("a-gap-1");
		expect(textColor("accent")).toBe("a-c-accent");
		expect(bgColor("canvas")).toBe("a-bg-canvas");
		expect(util(m(1), false, p(2))).toBe("a-m-1 a-p-2");
	});
});
