import { describe, expect, test } from "bun:test";
import { computePosition } from "./floating.ts";

const viewport = { width: 1000, height: 800 };
const size = { width: 200, height: 100 };
const rect = (x: number, y: number, width = 80, height = 30) => ({
	left: x,
	top: y,
	right: x + width,
	bottom: y + height,
	width,
	height,
});

describe("computePosition", () => {
	test("places below-start with offset", () => {
		const p = computePosition(rect(100, 100), size, "bottom-start", { viewport, offset: 8 });
		expect(p).toMatchObject({ x: 100, y: 138, placement: "bottom-start" });
	});

	test("centers on the cross axis and aligns end", () => {
		expect(computePosition(rect(400, 100), size, "bottom", { viewport, offset: 0 }).x).toBe(340);
		expect(computePosition(rect(400, 100), size, "bottom-end", { viewport, offset: 0 }).x).toBe(
			280,
		);
		const right = computePosition(rect(100, 300), size, "right", { viewport, offset: 4 });
		expect(right).toMatchObject({ x: 184, y: 265 });
	});

	test("flips to the opposite side when the preferred side overflows", () => {
		const nearBottom = computePosition(rect(100, 740), size, "bottom-start", {
			viewport,
			offset: 8,
		});
		expect(nearBottom.placement).toBe("top-start");
		expect(nearBottom.y).toBe(740 - 8 - 100);

		const nearTop = computePosition(rect(400, 10), size, "top", { viewport, offset: 8 });
		expect(nearTop.placement).toBe("bottom");
	});

	test("keeps the preferred side when neither side fits better", () => {
		const tall = { width: 200, height: 790 };
		expect(computePosition(rect(100, 400), tall, "bottom", { viewport, offset: 0 }).placement).toBe(
			"bottom",
		);
	});

	test("shifts along the cross axis to stay inside the viewport padding", () => {
		const nearRight = computePosition(rect(950, 100, 40), size, "bottom", {
			viewport,
			offset: 0,
			padding: 8,
		});
		expect(nearRight.x).toBe(1000 - 8 - 200);
		const nearLeft = computePosition(rect(0, 100, 40), size, "bottom-end", {
			viewport,
			offset: 0,
			padding: 8,
		});
		expect(nearLeft.x).toBe(8);
	});

	test("arrow points at the anchor centre even after shifting", () => {
		const p = computePosition(rect(950, 100, 40), size, "bottom", {
			viewport,
			offset: 0,
			padding: 8,
		});
		// anchor centre 970 − floating x 792 = 178, clamped away from the rounded corners
		expect(p.arrow).toBe(178);
		const clamped = computePosition(rect(990, 100, 10), size, "bottom", {
			viewport,
			offset: 0,
			padding: 8,
			arrowPadding: 12,
		});
		expect(clamped.arrow).toBe(200 - 12);
	});
});
