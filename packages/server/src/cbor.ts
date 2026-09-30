/**
 * CBOR (RFC 8949) codec for `application/cbor` bodies, backed by `cbor-x`.
 * Kept in its own entry point so apps that only speak JSON don't load it.
 *
 * @example
 * ```ts
 * import { cbor } from "@arachnejs/server/cbor";
 * createServer({ routes, codecs: [cbor()] });
 * ```
 *
 * @module
 */
import { Decoder, Encoder } from "cbor-x";
import type { Codec } from "./codec.ts";

/** Create the CBOR {@link Codec}. Byte arrays round-trip as `Uint8Array`. */
export function cbor(): Codec {
	// Plain maps/arrays only: no record structures or shared-structure state
	// between requests, so every message decodes on its own.
	const encoder = new Encoder({ useRecords: false, tagUint8Array: false });
	const decoder = new Decoder({ useRecords: false, mapsAsObjects: true });
	return {
		type: "application/cbor",
		encode: (value) => encoder.encode(value) as Uint8Array<ArrayBuffer>,
		decode: (bytes) => decoder.decode(bytes),
	};
}
