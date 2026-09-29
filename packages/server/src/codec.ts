/**
 * A body format. The server picks the request codec from `Content-Type` and
 * the response codec from `Accept`; JSON is always available.
 */
export interface Codec {
	/** Media type, e.g. `application/cbor`. */
	readonly type: string;
	/** Serialise a handler result. */
	encode: (value: unknown) => BodyInit;
	/** Parse request bytes. Throw on malformed input (→ 400). */
	decode: (bytes: Uint8Array) => unknown;
}

/** The built-in JSON codec (`application/json`). */
export const jsonCodec: Codec = {
	type: "application/json",
	encode: (value) => JSON.stringify(value),
	decode: (bytes) => JSON.parse(new TextDecoder().decode(bytes)),
};

/** Media type without parameters, lower-cased (`Application/JSON; charset=x` → `application/json`). */
export function mediaType(header: string | null): string {
	return (header ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

/** True for `application/json` and `+json` suffix types (`application/problem+json`). */
export function isJsonType(type: string): boolean {
	return type === "application/json" || type.endsWith("+json");
}

/** Codec for a request `Content-Type`, or `undefined` if unsupported. */
export function codecForContentType(
	codecs: readonly Codec[],
	header: string | null,
): Codec | undefined {
	const type = mediaType(header);
	if (isJsonType(type)) return jsonCodec;
	return codecs.find((codec) => codec.type === type);
}

/**
 * Codec for the response. Picks the highest-`q` `Accept` entry the server
 * supports; falls back to JSON (also for `*\/*` and missing headers).
 */
export function negotiate(codecs: readonly Codec[], accept: string | null): Codec {
	if (!accept) return jsonCodec;
	const entries = accept
		.split(",")
		.map((part) => {
			const [type = "", ...params] = part.trim().split(";");
			const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
			return { type: type.trim().toLowerCase(), q: q ? Number(q.slice(2)) : 1 };
		})
		.filter((entry) => entry.q > 0)
		.sort((a, b) => b.q - a.q);
	for (const entry of entries) {
		if (isJsonType(entry.type) || entry.type === "*/*" || entry.type === "application/*") {
			return jsonCodec;
		}
		const codec = codecs.find((c) => c.type === entry.type);
		if (codec) return codec;
	}
	return jsonCodec;
}
