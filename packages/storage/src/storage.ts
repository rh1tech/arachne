/** Data accepted by {@link Storage.put}. */
export type StorageData = Blob | Uint8Array | ArrayBuffer | string | ReadableStream<Uint8Array>;

/** Options for {@link Storage.put}. */
export interface PutOptions {
	/** MIME type; defaults to the Blob's type or a guess from the key's extension. */
	contentType?: string;
}

/** Metadata of a stored object. */
export interface StoredObject {
	/** Object key (`avatars/3f0e….png`). */
	key: string;
	/** Size in bytes. */
	size: number;
	/** MIME type. */
	contentType: string;
	/** Entity tag, when the driver provides one. */
	etag?: string | undefined;
	/** Last modification time, when known. */
	lastModified?: Date | undefined;
}

/** A stored object with readable contents. */
export interface StoredFile extends StoredObject {
	/** Stream the contents. */
	stream: () => ReadableStream<Uint8Array>;
	/** Read all bytes. */
	arrayBuffer: () => Promise<ArrayBuffer>;
	/** Read as UTF-8 text. */
	text: () => Promise<string>;
}

/** Options for {@link Storage.url}. */
export interface UrlOptions {
	/** Lifetime of signed URLs in seconds. Default 3600. */
	expiresIn?: number;
	/** HTTP method the URL is for (S3 presigned uploads use `PUT`). Default `GET`. */
	method?: "GET" | "PUT";
}

/** A storage backend. All keys pass {@link assertKey}. */
export interface Storage {
	/** Driver name. */
	readonly driver: string;
	/** Write an object (replacing any existing one). */
	put: (key: string, data: StorageData, options?: PutOptions) => Promise<StoredObject>;
	/** Read an object, or `undefined` if missing. */
	get: (key: string) => Promise<StoredFile | undefined>;
	/** Metadata only, or `undefined` if missing. */
	head: (key: string) => Promise<StoredObject | undefined>;
	/** Whether the object exists. */
	exists: (key: string) => Promise<boolean>;
	/** Remove an object (no error if missing). */
	delete: (key: string) => Promise<void>;
	/** Keys starting with `prefix`, sorted. */
	list: (prefix?: string) => Promise<string[]>;
	/** A URL for the object: signed (S3) or public (`baseUrl`). */
	url: (key: string, options?: UrlOptions) => Promise<string>;
}

/**
 * Throw unless `key` is a safe relative key: non-empty `/`-separated segments,
 * no `.`/`..`, no leading slash, backslashes or control characters.
 */
export function assertKey(key: string): void {
	const bad =
		!key ||
		key.length > 1024 ||
		key.startsWith("/") ||
		key.includes("\\") ||
		// biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
		/[\u0000-\u001f\u007f]/.test(key) ||
		key.split("/").some((segment) => segment === "" || segment === "." || segment === "..");
	if (bad) throw new Error(`invalid storage key "${key.replace(/[^\x20-\x7e]/g, "?")}"`);
}

const TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	avif: "image/avif",
	svg: "image/svg+xml",
	pdf: "application/pdf",
	json: "application/json",
	txt: "text/plain;charset=utf-8",
	csv: "text/csv",
	html: "text/html;charset=utf-8",
	mp4: "video/mp4",
	mp3: "audio/mpeg",
	zip: "application/zip",
};

/** MIME type guessed from a key's extension (`application/octet-stream` when unknown). */
export function guessType(key: string): string {
	const ext = key.split(".").pop()?.toLowerCase() ?? "";
	return TYPES[ext] ?? "application/octet-stream";
}

/** Content type for `put`: explicit option, then Blob type, then a guess. */
export function contentTypeFor(key: string, data: StorageData, options?: PutOptions): string {
	if (options?.contentType) return options.contentType;
	if (data instanceof Blob && data.type) return data.type;
	if (typeof data === "string" && !key.includes(".")) return "text/plain;charset=utf-8";
	return guessType(key);
}

/** Collect any {@link StorageData} into bytes. */
export async function toBytes(data: StorageData): Promise<Uint8Array> {
	if (data instanceof Uint8Array) return data;
	if (typeof data === "string") return new TextEncoder().encode(data);
	if (data instanceof ArrayBuffer) return new Uint8Array(data);
	return new Uint8Array(await new Response(data).arrayBuffer());
}

/** Options for {@link saveUpload}. */
export interface SaveUploadOptions {
	/** Key prefix (`avatars`, `users/42/docs`). */
	prefix?: string;
	/** Maximum size in bytes. */
	maxSize?: number;
	/** Allowed MIME types (`image/*` wildcards). */
	types?: readonly string[];
}

/** Result of {@link saveUpload}. */
export interface SavedUpload extends StoredObject {
	/** The client's file name, without any path. Display it; never use it as a path. */
	originalName: string;
}

/**
 * Store an uploaded `File` under a generated key (`<prefix>/<uuid>.<ext>`),
 * checking size and type. The client's file name is kept only as metadata.
 */
export async function saveUpload(
	storage: Storage,
	file: File,
	options: SaveUploadOptions = {},
): Promise<SavedUpload> {
	if (options.maxSize !== undefined && file.size > options.maxSize) {
		throw new Error(`file too large (${file.size} > ${options.maxSize} bytes)`);
	}
	const type = file.type || "application/octet-stream";
	if (
		options.types &&
		!options.types.some((pattern) =>
			pattern.endsWith("/*") ? type.startsWith(pattern.slice(0, -1)) : pattern === type,
		)
	) {
		throw new Error(`file type ${type} is not allowed`);
	}
	const originalName = (file.name.split(/[\\/]/).pop() ?? "").slice(0, 255);
	const ext = /\.([A-Za-z0-9]{1,10})$/.exec(originalName)?.[1]?.toLowerCase();
	const prefix = options.prefix?.replace(/^\/+|\/+$/g, "");
	const key = `${prefix ? `${prefix}/` : ""}${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
	const stored = await storage.put(key, file, { contentType: type });
	return { ...stored, originalName };
}

/** Options for {@link toResponse}. */
export interface ToResponseOptions {
	/** Serve as a download with this file name. */
	download?: string;
	/** `Cache-Control` header. Default `private, max-age=0`. */
	cacheControl?: string;
}

function disposition(name: string): string {
	// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters
	const ascii = name.replace(/["\\\u0000-\u001f\u007f]/g, "").replace(/[^\x20-\x7e]/g, "_");
	return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

/** Stream a stored file as an HTTP response (type, length, ETag, nosniff). */
export function toResponse(file: StoredFile, options: ToResponseOptions = {}): Response {
	const headers = new Headers({
		"content-type": file.contentType,
		"content-length": String(file.size),
		"cache-control": options.cacheControl ?? "private, max-age=0",
		"x-content-type-options": "nosniff",
	});
	if (file.etag) headers.set("etag", file.etag);
	if (options.download !== undefined)
		headers.set("content-disposition", disposition(options.download));
	return new Response(file.stream(), { headers });
}
