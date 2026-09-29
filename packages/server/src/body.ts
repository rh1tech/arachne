import { type Codec, codecForContentType, mediaType } from "./codec.ts";
import { HttpError } from "./errors.ts";

/** Default request body limit: 1 MiB. */
export const DEFAULT_BODY_LIMIT = 1024 * 1024;

const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/** `items[0][qty]` / `address.zip` / `roles[]` → path segments (`""` = append). */
function keySegments(key: string): string[] {
	const segments: string[] = [];
	for (const part of key.split(".")) {
		const match = /^([^[\]]*)((?:\[[^[\]]*\])*)$/.exec(part);
		if (!match) {
			segments.push(part);
			continue;
		}
		if (match[1]) segments.push(match[1]);
		for (const bracket of match[2]?.match(/\[([^[\]]*)\]/g) ?? [])
			segments.push(bracket.slice(1, -1));
	}
	return segments;
}

type Container = Record<string, unknown> | unknown[];

function assign(target: Container, segments: string[], value: unknown): void {
	let node: Container = target;
	for (let i = 0; i < segments.length; i += 1) {
		const key = segments[i] as string;
		const last = i === segments.length - 1;
		if (last) {
			if (key === "" && Array.isArray(node)) node.push(value);
			else {
				const existing = (node as Record<string, unknown>)[key];
				if (existing === undefined) (node as Record<string, unknown>)[key] = value;
				else if (Array.isArray(existing)) existing.push(value);
				else (node as Record<string, unknown>)[key] = [existing, value];
			}
			return;
		}
		const nextIsIndex = /^\d*$/.test(segments[i + 1] as string);
		const slot = key === "" && Array.isArray(node) ? node.length : key;
		let child = (node as Record<string | number, unknown>)[slot];
		if (typeof child !== "object" || child === null || child instanceof Blob) {
			child = nextIsIndex ? [] : {};
			(node as Record<string | number, unknown>)[slot] = child;
		}
		node = child as Container;
	}
}

/**
 * Convert form fields into a nested object. Supports bracket (`a[b][0]`),
 * dot (`a.b`) and append (`tags[]`) keys; repeated keys become arrays.
 * `__proto__`/`constructor`/`prototype` segments are dropped. Values stay
 * strings or `File`s: use `s.coerce.*` to type them.
 */
export function formToObject(form: FormData | URLSearchParams): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of form.entries()) {
		const segments = keySegments(key);
		if (segments.length === 0 || segments.some((segment) => BLOCKED_KEYS.has(segment))) continue;
		assign(out, segments, value);
	}
	return out;
}

/** URL search params as an object; repeated keys become arrays. */
export function queryToObject(params: URLSearchParams): Record<string, unknown> {
	return formToObject(params);
}

async function readLimited(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
	const declared = Number(request.headers.get("content-length") ?? Number.NaN);
	const tooLarge = () =>
		new HttpError(413, `Request body exceeds ${limit} bytes`, { code: "payload_too_large" });
	if (declared > limit) throw tooLarge();
	if (!request.body) return new Uint8Array();
	const chunks: Uint8Array[] = [];
	let size = 0;
	for await (const chunk of request.body as unknown as AsyncIterable<Uint8Array>) {
		size += chunk.byteLength;
		if (size > limit) throw tooLarge();
		chunks.push(chunk);
	}
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) {
		bytes.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return bytes;
}

/** Options for {@link parseBody}. */
export interface ParseBodyOptions {
	/** Extra codecs besides JSON. */
	codecs: readonly Codec[];
	/** Maximum body size in bytes. */
	limit: number;
}

/**
 * Read and decode a request body by `Content-Type`: JSON (and `+json`),
 * registered codecs, `multipart/form-data` and urlencoded forms. Empty
 * bodies yield `undefined`.
 *
 * @throws HttpError 400 (malformed), 413 (too large), 415 (unsupported type)
 */
export async function parseBody(request: Request, options: ParseBodyOptions): Promise<unknown> {
	const header = request.headers.get("content-type");
	const bytes = await readLimited(request, options.limit);
	if (bytes.byteLength === 0) return undefined;
	const type = mediaType(header);
	try {
		if (type === "multipart/form-data" || type === "application/x-www-form-urlencoded") {
			const form = await new Response(bytes, {
				headers: { "content-type": header ?? "" },
			}).formData();
			return formToObject(form);
		}
		const codec = codecForContentType(options.codecs, header);
		if (!codec) {
			throw new HttpError(415, `Unsupported content type ${type || "(none)"}`, {
				code: "unsupported_media_type",
			});
		}
		return codec.decode(bytes);
	} catch (error) {
		if (error instanceof HttpError) throw error;
		throw new HttpError(400, "Malformed request body", { code: "invalid_body", cause: error });
	}
}
