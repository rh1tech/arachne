import type { Middleware } from "./context.ts";

/** CSP directives: name → sources. `{nonce}` is replaced with `'nonce-…'`. */
export type CspDirectives = Record<string, readonly string[]>;

/** Options for {@link securityHeaders}. Pass `false` to omit a header. */
export interface SecurityHeadersOptions {
	/** Content-Security-Policy directives, or `false`. Default: strict, nonce-based. */
	contentSecurityPolicy?: CspDirectives | false;
	/** Send CSP as `Content-Security-Policy-Report-Only`. */
	reportOnly?: boolean;
	/** HSTS max-age in seconds, or `false`. Default one year. */
	hsts?: number | false;
	/** `X-Frame-Options`. Default `DENY`. */
	frameOptions?: "DENY" | "SAMEORIGIN" | false;
	/** `Referrer-Policy`. Default `strict-origin-when-cross-origin`. */
	referrerPolicy?: string | false;
	/** `Permissions-Policy`. Default disables camera, microphone, geolocation. */
	permissionsPolicy?: string | false;
	/** `Cross-Origin-Opener-Policy`. Default `same-origin`. */
	crossOriginOpenerPolicy?: string | false;
}

/** The default CSP: self-hosted assets, nonce'd scripts, no plugins or framing. */
export const DEFAULT_CSP: CspDirectives = {
	"default-src": ["'self'"],
	"script-src": ["'self'", "{nonce}"],
	"style-src": ["'self'", "'unsafe-inline'"],
	"img-src": ["'self'", "data:", "blob:"],
	"font-src": ["'self'"],
	"connect-src": ["'self'"],
	"object-src": ["'none'"],
	"base-uri": ["'self'"],
	"form-action": ["'self'"],
	"frame-ancestors": ["'none'"],
};

function nonce(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(16));
	return btoa(String.fromCharCode(...bytes));
}

/** Serialise CSP directives, substituting `{nonce}`. */
export function buildCsp(directives: CspDirectives, value: string): string {
	return Object.entries(directives)
		.map(([name, sources]) =>
			[name, ...sources.map((source) => (source === "{nonce}" ? `'nonce-${value}'` : source))].join(
				" ",
			),
		)
		.join("; ");
}

/**
 * Hardening headers plus a per-request CSP nonce on `ctx.nonce`. Render
 * inline scripts as `<script nonce={ctx.nonce}>`.
 */
export function securityHeaders(options: SecurityHeadersOptions = {}): Middleware {
	return (ctx, next) => {
		const csp = options.contentSecurityPolicy ?? DEFAULT_CSP;
		if (csp) {
			ctx.nonce = nonce();
			ctx.header(
				options.reportOnly ? "content-security-policy-report-only" : "content-security-policy",
				buildCsp(csp, ctx.nonce),
			);
		}
		const hsts = options.hsts ?? 31536000;
		if (hsts !== false)
			ctx.header("strict-transport-security", `max-age=${hsts}; includeSubDomains`);
		ctx.header("x-content-type-options", "nosniff");
		const frame = options.frameOptions ?? "DENY";
		if (frame) ctx.header("x-frame-options", frame);
		const referrer = options.referrerPolicy ?? "strict-origin-when-cross-origin";
		if (referrer) ctx.header("referrer-policy", referrer);
		const permissions = options.permissionsPolicy ?? "camera=(), microphone=(), geolocation=()";
		if (permissions) ctx.header("permissions-policy", permissions);
		const coop = options.crossOriginOpenerPolicy ?? "same-origin";
		if (coop) ctx.header("cross-origin-opener-policy", coop);
		return next();
	};
}
