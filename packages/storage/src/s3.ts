import { assertKey, contentTypeFor, type Storage, type StoredObject } from "./storage.ts";

/** The subset of `Bun.S3Client` the driver uses (inject a fake in tests). */
export interface S3Like {
	/** Upload an object. */
	write: (
		key: string,
		data: Blob | Uint8Array | string | ArrayBuffer | ReadableStream,
		options?: { type?: string },
	) => Promise<number>;
	/** Handle for one object. */
	file: (key: string) => {
		/** Whether the object exists. */
		exists: () => Promise<boolean>;
		/** Object metadata. */
		stat: () => Promise<{ size: number; type: string; etag: string; lastModified: Date }>;
		/** Stream the contents. */
		stream: () => ReadableStream<Uint8Array>;
		/** Read all bytes. */
		arrayBuffer: () => Promise<ArrayBuffer>;
	};
	/** Delete an object. */
	delete: (key: string) => Promise<void>;
	/** List objects under a prefix. */
	list: (input?: { prefix?: string; continuationToken?: string }) => Promise<{
		contents?: Array<{ key: string }>;
		isTruncated?: boolean;
		nextContinuationToken?: string;
	}>;
	/** Presigned URL for an object. */
	presign: (key: string, options?: { expiresIn?: number; method?: "GET" | "PUT" }) => string;
}

/** Options for {@link s3Storage}: an existing client, or `Bun.S3Client` options. */
export type S3StorageOptions =
	| {
			/** Pre-built client (or a test double). */
			client: S3Like;
			/** Public base URL (CDN) used instead of presigning. */
			publicUrl?: string;
	  }
	| (ConstructorParameters<typeof Bun.S3Client>[0] & {
			/** Public base URL (CDN) used instead of presigning. */
			publicUrl?: string;
	  });

/**
 * Store objects in S3 or any S3-compatible service (R2, MinIO, Backblaze,
 * DigitalOcean Spaces) via Bun's built-in client. Credentials default to the
 * usual `S3_*` / `AWS_*` environment variables.
 */
export function s3Storage(options: S3StorageOptions): Storage {
	const client: S3Like =
		"client" in options && options.client
			? options.client
			: (new Bun.S3Client(
					options as ConstructorParameters<typeof Bun.S3Client>[0],
				) as unknown as S3Like);

	const head = async (key: string): Promise<StoredObject | undefined> => {
		assertKey(key);
		const file = client.file(key);
		if (!(await file.exists())) return undefined;
		const info = await file.stat();
		return {
			key,
			size: info.size,
			contentType: info.type || contentTypeFor(key, ""),
			etag: info.etag,
			lastModified: info.lastModified,
		};
	};

	const storage: Storage = {
		driver: "s3",
		async put(key, data, putOptions) {
			assertKey(key);
			const contentType = contentTypeFor(key, data, putOptions);
			const size = await client.write(key, data, { type: contentType });
			return { key, size, contentType };
		},
		async get(key) {
			const meta = await head(key);
			if (!meta) return undefined;
			const file = client.file(key);
			return {
				...meta,
				stream: () => file.stream(),
				arrayBuffer: () => file.arrayBuffer(),
				text: async () => new TextDecoder().decode(await file.arrayBuffer()),
			};
		},
		head,
		exists: async (key) => (await head(key)) !== undefined,
		async delete(key) {
			assertKey(key);
			await client.delete(key);
		},
		async list(prefix = "") {
			const keys: string[] = [];
			let token: string | undefined;
			do {
				const page = await client.list({ prefix, ...(token ? { continuationToken: token } : {}) });
				keys.push(...(page.contents ?? []).map((item) => item.key));
				token = page.isTruncated ? page.nextContinuationToken : undefined;
			} while (token);
			return keys.sort();
		},
		async url(key, urlOptions = {}) {
			assertKey(key);
			if (options.publicUrl && (urlOptions.method ?? "GET") === "GET") {
				return `${options.publicUrl.replace(/\/$/, "")}/${key}`;
			}
			return client.presign(key, {
				expiresIn: urlOptions.expiresIn ?? 3600,
				method: urlOptions.method ?? "GET",
			});
		},
	};
	return storage;
}
