import { describe, expect, test } from "bun:test";
import { access } from "node:fs/promises";
import { defineModule } from "@arachne/core";
import {
	createMockLogger,
	createTestApp,
	factory,
	tempDir,
	WaitForTimeoutError,
	waitFor,
} from "../src/index.ts";

describe("createTestApp", () => {
	test("boots modules and disposes", async () => {
		let setup = false;
		let disposed = false;
		const mod = defineModule({
			name: "probe",
			setup: () => {
				setup = true;
			},
			dispose: () => {
				disposed = true;
			},
		});
		const harness = await createTestApp({ modules: [mod] });
		expect(setup).toBe(true);
		await harness.dispose();
		expect(disposed).toBe(true);
	});
});

describe("factory", () => {
	test("builds with overrides and sequences", () => {
		const user = factory<{ id: number; name: string }>({
			build: ({ seq }) => {
				const id = seq("user");
				return { id, name: `user-${id}` };
			},
		});
		expect(user()).toEqual({ id: 1, name: "user-1" });
		expect(user({ name: "ada" })).toEqual({ id: 2, name: "ada" });
	});
});

describe("tempDir", () => {
	test("creates and cleans up", async () => {
		let path: string;
		{
			await using dir = await tempDir();
			path = dir.path;
			await access(path);
		}
		await expect(access(path)).rejects.toThrow();
	});
});

describe("waitFor", () => {
	test("resolves when predicate passes", async () => {
		let ready = false;
		queueMicrotask(() => {
			ready = true;
		});
		await waitFor(() => ready, { timeoutMs: 500 });
	});

	test("throws on timeout", async () => {
		await expect(waitFor(() => false, { timeoutMs: 30, intervalMs: 5 })).rejects.toBeInstanceOf(
			WaitForTimeoutError,
		);
	});
});

describe("createMockLogger", () => {
	test("captures entries", () => {
		const logger = createMockLogger();
		logger.info("hello", { a: 1 });
		expect(logger.entries).toEqual([{ level: "info", msg: "hello", extra: { a: 1 } }]);
		logger.clear();
		expect(logger.entries).toEqual([]);
	});
});
