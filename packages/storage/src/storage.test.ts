import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	assertKey,
	diskStorage,
	memoryStorage,
	type S3Like,
	type Storage,
	s3Storage,
	saveUpload,
	toResponse,
} from "./index.ts";

const root = mkdtempSync(join(tmpdir(), "arachne-storage-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

/** In-memory stand-in for Bun.S3Client (same method shapes). */
function fakeS3(): S3Like {
	const objects = new Map<string, { bytes: Uint8Array; type: string }>();
	return {
		async write(key, data, options) {
			const bytes = new Uint8Array(await new Response(data as BodyInit).arrayBuffer());
			objects.set(key, { bytes, type: options?.type ?? "application/octet-stream" });
			return bytes.byteLength;
		},
		file(key) {
			const entry = () => objects.get(key);
			return {
				exists: async () => objects.has(key),
				stat: async () => ({
					size: entry()?.bytes.byteLength ?? 0,
					type: entry()?.type ?? "",
					etag: "e1",
					lastModified: new Date(0),
				}),
				stream: () =>
					new Blob([(entry()?.bytes ?? new Uint8Array()) as Uint8Array<ArrayBuffer>]).stream(),
				arrayBuffer: async () => (entry()?.bytes ?? new Uint8Array()).buffer as ArrayBuffer,
			};
		},
		async delete(key) {
			objects.delete(key);
		},
		async list(input) {
			const keys = [...objects.keys()].filter((key) => key.startsWith(input?.prefix ?? "")).sort();
			return { contents: keys.map((key) => ({ key })) };
		},
		presign: (key, options) =>
			`https://s3.test/${key}?expires=${options?.expiresIn}&method=${options?.method ?? "GET"}`,
	};
}

const drivers: Array<[string, () => Storage]> = [
	["memory", () => memoryStorage()],
	["disk", () => diskStorage({ root: join(root, `disk-${Math.random()}`), baseUrl: "/files" })],
	["s3", () => s3Storage({ client: fakeS3() })],
];

describe.each(drivers)("%s driver", (_name, make) => {
	test("put, head, get, list and delete", async () => {
		const storage = make();
		const stored = await storage.put("avatars/ada.png", new Uint8Array([1, 2, 3]), {
			contentType: "image/png",
		});
		expect(stored).toMatchObject({ key: "avatars/ada.png", size: 3, contentType: "image/png" });
		expect(await storage.head("avatars/ada.png")).toMatchObject({
			size: 3,
			contentType: "image/png",
		});
		const file = await storage.get("avatars/ada.png");
		expect(
			Array.from(new Uint8Array(await (file as NonNullable<typeof file>).arrayBuffer())),
		).toEqual([1, 2, 3]);
		await storage.put("avatars/bob.txt", "hello");
		await storage.put("docs/cv.pdf", new Blob(["%PDF"], { type: "application/pdf" }));
		expect(await storage.list("avatars/")).toEqual(["avatars/ada.png", "avatars/bob.txt"]);
		expect(await storage.exists("docs/cv.pdf")).toBe(true);
		await storage.delete("avatars/ada.png");
		expect(await storage.get("avatars/ada.png")).toBeUndefined();
		expect(await storage.head("avatars/ada.png")).toBeUndefined();
		await storage.delete("never/existed.txt");
	});

	test("rejects unsafe keys", async () => {
		const storage = make();
		for (const key of ["../etc/passwd", "/abs", "a\\b", "a/../../b", "", "a//b", "a\0b"]) {
			await expect(storage.put(key, "x")).rejects.toThrow("invalid storage key");
		}
	});
});

describe("disk driver", () => {
	test("files live under root and url() uses baseUrl", async () => {
		const dir = join(root, "disk-url");
		const storage = diskStorage({ root: dir, baseUrl: "https://cdn.example/files" });
		await storage.put("a/b.txt", "hi", { contentType: "text/plain" });
		expect(existsSync(join(dir, "a/b.txt"))).toBe(true);
		expect(await storage.url("a/b.txt")).toBe("https://cdn.example/files/a/b.txt");
	});
});

describe("s3 driver", () => {
	test("url() presigns", async () => {
		const storage = s3Storage({ client: fakeS3() });
		expect(await storage.url("a.txt", { expiresIn: 60 })).toBe(
			"https://s3.test/a.txt?expires=60&method=GET",
		);
	});

	test("real Bun.S3Client presigns offline", async () => {
		const storage = s3Storage({
			accessKeyId: "AKIAEXAMPLE",
			secretAccessKey: "secret",
			bucket: "uploads",
			endpoint: "https://s3.eu-central-1.amazonaws.com",
			region: "eu-central-1",
		});
		const url = await storage.url("avatars/ada.png", { expiresIn: 300 });
		expect(url).toContain("uploads");
		expect(url).toContain("avatars/ada.png");
		expect(url).toContain("X-Amz-Signature=");
	});
});

describe("saveUpload", () => {
	test("stores an upload under a generated key with a safe extension", async () => {
		const storage = memoryStorage();
		const file = new File([new Uint8Array(10)], "../../My Photo.PNG", { type: "image/png" });
		const stored = await saveUpload(storage, file, { prefix: "avatars" });
		expect(stored.key).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
		expect(stored.originalName).toBe("My Photo.PNG");
		expect(stored.contentType).toBe("image/png");
	});

	test("enforces size and type limits", async () => {
		const storage = memoryStorage();
		const big = new File([new Uint8Array(11)], "a.png", { type: "image/png" });
		await expect(saveUpload(storage, big, { maxSize: 10 })).rejects.toThrow("too large");
		const exe = new File(["MZ"], "a.exe", { type: "application/x-msdownload" });
		await expect(saveUpload(storage, exe, { types: ["image/*"] })).rejects.toThrow("not allowed");
	});
});

describe("toResponse", () => {
	test("streams a stored file with headers; downloads get a safe disposition", async () => {
		const storage = memoryStorage();
		await storage.put("r/report.csv", "a,b\n1,2", { contentType: "text/csv" });
		const file = await storage.get("r/report.csv");
		const response = toResponse(file as NonNullable<typeof file>, { download: 'q3 "final".csv' });
		expect(response.headers.get("content-type")).toBe("text/csv");
		expect(response.headers.get("content-length")).toBe("7");
		expect(response.headers.get("content-disposition")).toBe(
			`attachment; filename="q3 final.csv"; filename*=UTF-8''q3%20%22final%22.csv`,
		);
		expect(response.headers.get("x-content-type-options")).toBe("nosniff");
		expect(await response.text()).toBe("a,b\n1,2");
	});
});

describe("assertKey", () => {
	test("accepts nested relative keys", () => {
		expect(() => assertKey("a/b/c.txt")).not.toThrow();
	});
});
