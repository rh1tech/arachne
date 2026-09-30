const encoder = new TextEncoder();

function base64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString("base64url");
}

/** Cryptographically random URL-safe token (`bytes` of entropy; 32 → 43 chars). */
export function randomToken(bytes = 32): string {
	return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** Hex SHA-256; tokens are stored only as hashes. */
export function sha256(value: string): string {
	return new Bun.CryptoHasher("sha256").update(value).digest("hex");
}

/** Base64url HMAC-SHA256 of `value` under `key`. */
export function hmac(key: string, value: string): string {
	return new Bun.CryptoHasher("sha256", key).update(value).digest("base64url");
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
	const left = encoder.encode(a);
	const right = encoder.encode(b);
	if (left.length !== right.length) return false;
	return crypto.timingSafeEqual?.(left, right) ?? left.every((byte, i) => byte === right[i]);
}

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32 (no padding), as used by authenticator apps. */
export function base32Encode(bytes: Uint8Array): string {
	let bits = 0;
	let value = 0;
	let out = "";
	for (const byte of bytes) {
		value = (value << 8) | byte;
		bits += 8;
		while (bits >= 5) {
			out += BASE32[(value >>> (bits - 5)) & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
	return out;
}

/** Decode RFC 4648 base32 (case-insensitive, padding and spaces ignored). */
export function base32Decode(text: string): Uint8Array {
	const clean = text.toUpperCase().replace(/[=\s]/g, "");
	let bits = 0;
	let value = 0;
	const out: number[] = [];
	for (const char of clean) {
		const index = BASE32.indexOf(char);
		if (index === -1) throw new Error("invalid base32");
		value = (value << 5) | index;
		bits += 5;
		if (bits >= 8) {
			out.push((value >>> (bits - 8)) & 255);
			bits -= 8;
		}
	}
	return new Uint8Array(out);
}

/** Options for TOTP. Defaults match authenticator apps: SHA-1, 6 digits, 30 s. */
export interface TotpOptions {
	/** Code length. Default 6. */
	digits?: number;
	/** Step length in seconds. Default 30. */
	period?: number;
}

/** The TOTP time step for `at`. */
export function totpStep(at: Date, period = 30): number {
	return Math.floor(at.getTime() / 1000 / period);
}

async function hotp(secret: Uint8Array, counter: number, digits: number): Promise<string> {
	const message = new ArrayBuffer(8);
	new DataView(message).setBigUint64(0, BigInt(counter));
	const key = await crypto.subtle.importKey(
		"raw",
		secret as Uint8Array<ArrayBuffer>,
		{ name: "HMAC", hash: "SHA-1" },
		false,
		["sign"],
	);
	const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
	const offset = (mac[mac.length - 1] as number) & 0xf;
	const binary =
		(((mac[offset] as number) & 0x7f) << 24) |
		((mac[offset + 1] as number) << 16) |
		((mac[offset + 2] as number) << 8) |
		(mac[offset + 3] as number);
	return String(binary % 10 ** digits).padStart(digits, "0");
}

/** RFC 6238 TOTP code for a base32 secret at time `at`. */
export async function totpCode(
	secret: string,
	at: Date,
	options: TotpOptions = {},
): Promise<string> {
	return hotp(base32Decode(secret), totpStep(at, options.period ?? 30), options.digits ?? 6);
}

/**
 * The time step `code` belongs to (checking one step either side for clock
 * drift), or `undefined` if it matches none.
 */
export async function matchTotp(
	secret: string,
	code: string,
	at: Date,
	options: TotpOptions = {},
): Promise<number | undefined> {
	if (!/^\d{6,8}$/.test(code)) return undefined;
	const key = base32Decode(secret);
	const step = totpStep(at, options.period ?? 30);
	for (const candidate of [step, step - 1, step + 1]) {
		if (safeEqual(await hotp(key, candidate, options.digits ?? 6), code)) return candidate;
	}
	return undefined;
}

/** A new base32 TOTP secret (160 bits, as RFC 4226 recommends). */
export function newTotpSecret(): string {
	return base32Encode(crypto.getRandomValues(new Uint8Array(20)));
}

/** Human-friendly one-time recovery codes (`xxxxx-xxxxx`). */
export function recoveryCodes(count = 10): string[] {
	return Array.from({ length: count }, () => {
		const raw = base32Encode(crypto.getRandomValues(new Uint8Array(7)))
			.toLowerCase()
			.slice(0, 10);
		return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
	});
}

async function aesKey(secret: string): Promise<CryptoKey> {
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`arachne-auth:${secret}`));
	return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** AES-256-GCM encrypt with a key derived from `secret` (`v1.<iv>.<ciphertext>`). */
export async function seal(secret: string, plaintext: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		await aesKey(secret),
		encoder.encode(plaintext),
	);
	return `v1.${base64url(iv)}.${base64url(new Uint8Array(data))}`;
}

/** Reverse {@link seal}. Values without the `v1.` prefix are returned as-is (unencrypted data). */
export async function unseal(secret: string | undefined, value: string): Promise<string> {
	if (!value.startsWith("v1.")) return value;
	if (!secret) throw new Error("auth secret required to decrypt stored MFA secrets");
	const [, iv, data] = value.split(".");
	const plain = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: Buffer.from(iv ?? "", "base64url") },
		await aesKey(secret),
		Buffer.from(data ?? "", "base64url"),
	);
	return new TextDecoder().decode(plain);
}
