/** Attributes for `Set-Cookie`. Defaults: `Path=/`. */
export interface CookieOptions {
	/** Lifetime in seconds; `0` expires immediately. */
	maxAge?: number;
	/** Absolute expiry; prefer `maxAge`. */
	expires?: Date;
	/** Cookie path. Default `/`. */
	path?: string;
	/** Cookie domain; omit for host-only cookies. */
	domain?: string;
	/** Hide from `document.cookie`. */
	httpOnly?: boolean;
	/** HTTPS only. */
	secure?: boolean;
	/** Cross-site policy. */
	sameSite?: "strict" | "lax" | "none";
	/** CHIPS partitioned cookie. */
	partitioned?: boolean;
}

/** Request cookies plus pending `Set-Cookie` headers for the response. */
export interface CookieJar {
	/** Value of a request cookie, or `undefined`. */
	get: (name: string) => string | undefined;
	/** Every request cookie. */
	all: () => Record<string, string>;
	/** Queue a `Set-Cookie` header. The value is URI-encoded. */
	set: (name: string, value: string, options?: CookieOptions) => void;
	/** Queue a cookie deletion (`Max-Age=0`) with matching path/domain. */
	delete: (name: string, options?: Pick<CookieOptions, "path" | "domain">) => void;
	/** `Set-Cookie` header values queued so far. */
	readonly pending: readonly string[];
}

const NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function decode(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

/** Parse a `Cookie` request header. Malformed pairs are skipped. */
export function parseCookies(header: string | null): Record<string, string> {
	const out: Record<string, string> = Object.create(null);
	if (!header) return out;
	for (const part of header.split(";")) {
		const index = part.indexOf("=");
		if (index <= 0) continue;
		const name = part.slice(0, index).trim();
		if (!NAME.test(name) || name in out) continue;
		let value = part.slice(index + 1).trim();
		if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
		out[name] = decode(value);
	}
	return out;
}

/** Serialise one `Set-Cookie` header value. Throws on an invalid name. */
export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
	if (!NAME.test(name)) throw new TypeError(`invalid cookie name "${name}"`);
	const parts = [`${name}=${encodeURIComponent(value)}`];
	if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
	if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
	if (options.domain) parts.push(`Domain=${options.domain}`);
	parts.push(`Path=${options.path ?? "/"}`);
	if (options.httpOnly) parts.push("HttpOnly");
	if (options.secure || options.sameSite === "none") parts.push("Secure");
	if (options.sameSite) {
		parts.push(`SameSite=${options.sameSite[0]?.toUpperCase()}${options.sameSite.slice(1)}`);
	}
	if (options.partitioned) parts.push("Partitioned");
	return parts.join("; ");
}

/** Create the {@link CookieJar} for one request. */
export function createCookieJar(request: Request): CookieJar {
	let parsed: Record<string, string> | undefined;
	const read = () => {
		parsed ??= parseCookies(request.headers.get("cookie"));
		return parsed;
	};
	const pending: string[] = [];
	return {
		get: (name) => read()[name],
		all: () => ({ ...read() }),
		set(name, value, options) {
			pending.push(serializeCookie(name, value, options));
		},
		delete(name, options = {}) {
			pending.push(serializeCookie(name, "", { ...options, maxAge: 0, expires: new Date(0) }));
		},
		pending,
	};
}
