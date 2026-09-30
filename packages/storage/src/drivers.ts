import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import {
	assertKey,
	contentTypeFor,
	type Storage,
	type StoredFile,
	type StoredObject,
	toBytes,
} from "./storage.ts";

function fileFrom(meta: StoredObject, bytes: () => Promise<Uint8Array>): StoredFile {
	return {
		...meta,
		stream: () =>
			new ReadableStream<Uint8Array>({
				async start(controller) {
					controller.enqueue(await bytes());
					controller.close();
				},
			}),
		arrayBuffer: async () => {
			const data = await bytes();
			return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
		},
		text: async () => new TextDecoder().decode(await bytes()),
	};
}

/** Keep objects in a `Map` (tests, previews). */
export function memoryStorage(options: { baseUrl?: string } = {}): Storage {
	const objects = new Map<string, { meta: StoredObject; bytes: Uint8Array }>();
	const storage: Storage = {
		driver: "memory",
		async put(key, data, putOptions) {
			assertKey(key);
			const bytes = await toBytes(data);
			const meta: StoredObject = {
				key,
				size: bytes.byteLength,
				contentType: contentTypeFor(key, data, putOptions),
				lastModified: new Date(),
			};
			objects.set(key, { meta, bytes });
			return { ...meta };
		},
		async get(key) {
			assertKey(key);
			const entry = objects.get(key);
			return entry ? fileFrom(entry.meta, async () => entry.bytes) : undefined;
		},
		async head(key) {
			assertKey(key);
			const entry = objects.get(key);
			return entry ? { ...entry.meta } : undefined;
		},
		exists: async (key) => (await storage.head(key)) !== undefined,
		async delete(key) {
			assertKey(key);
			objects.delete(key);
		},
		list: async (prefix = "") => [...objects.keys()].filter((key) => key.startsWith(prefix)).sort(),
		async url(key) {
			assertKey(key);
			return `${options.baseUrl ?? "memory:"}/${key}`;
		},
	};
	return storage;
}

/** Options for {@link diskStorage}. */
export interface DiskStorageOptions {
	/** Directory that holds the objects (created on first write). */
	root: string;
	/** Public URL prefix served for `root` (e.g. by `serveStatic`), used by `url()`. */
	baseUrl?: string;
}

const META_DIR = ".arachne-meta";

/** Store objects as files under `root`; metadata lives in `root/.arachne-meta`. */
export function diskStorage(options: DiskStorageOptions): Storage {
	const root = resolve(options.root);
	const pathOf = (key: string) => {
		assertKey(key);
		const path = resolve(root, key);
		if (!path.startsWith(root + sep)) throw new Error(`invalid storage key "${key}"`);
		return path;
	};
	const metaOf = (key: string) => join(root, META_DIR, `${key}.json`);

	const head = async (key: string): Promise<StoredObject | undefined> => {
		const path = pathOf(key);
		try {
			const info = await stat(path);
			if (!info.isFile()) return undefined;
			const saved = JSON.parse(await readFile(metaOf(key), "utf8").catch(() => "{}")) as {
				contentType?: string;
			};
			return {
				key,
				size: info.size,
				contentType: saved.contentType ?? contentTypeFor(key, ""),
				etag: `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`,
				lastModified: info.mtime,
			};
		} catch {
			return undefined;
		}
	};

	const walk = async (dir: string): Promise<string[]> => {
		const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
		const out: string[] = [];
		for (const entry of entries) {
			if (entry.name === META_DIR && dir === root) continue;
			const full = join(dir, entry.name);
			if (entry.isDirectory()) out.push(...(await walk(full)));
			else if (entry.isFile()) out.push(relative(root, full).split(sep).join("/"));
		}
		return out;
	};

	const storage: Storage = {
		driver: "disk",
		async put(key, data, putOptions) {
			const path = pathOf(key);
			const contentType = contentTypeFor(key, data, putOptions);
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, await toBytes(data));
			await mkdir(dirname(metaOf(key)), { recursive: true });
			await writeFile(metaOf(key), JSON.stringify({ contentType }));
			return (await head(key)) as StoredObject;
		},
		async get(key) {
			const meta = await head(key);
			if (!meta) return undefined;
			const path = pathOf(key);
			return {
				...fileFrom(meta, async () => new Uint8Array(await readFile(path))),
				stream: () => Bun.file(path).stream(),
			};
		},
		head,
		exists: async (key) => (await head(key)) !== undefined,
		async delete(key) {
			await rm(pathOf(key), { force: true });
			await rm(metaOf(key), { force: true });
		},
		list: async (prefix = "") => (await walk(root)).filter((key) => key.startsWith(prefix)).sort(),
		async url(key) {
			pathOf(key);
			return `${(options.baseUrl ?? "").replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
		},
	};
	return storage;
}
