import type { Context, Middleware } from "./context.ts";
import { HttpError } from "./errors.ts";

/** Counter state for one key in the current window. */
export interface RateLimitHit {
	/** Requests counted in the window, including this one. */
	count: number;
	/** Epoch ms when the window resets. */
	resetAt: number;
	/** Milliseconds until the window resets, by the store's clock. */
	remainingMs: number;
}

/**
 * Where counters live. The memory store suits one process; implement this
 * interface over Redis/Valkey for several instances.
 */
export interface RateLimitStore {
	/** Count one request for `key` in a window of `windowMs`. */
	hit: (key: string, windowMs: number) => RateLimitHit | Promise<RateLimitHit>;
	/** Forget `key` (e.g. after a successful login). */
	reset: (key: string) => void | Promise<void>;
}

/** Options for {@link memoryRateLimitStore}. */
export interface MemoryRateLimitStoreOptions {
	/** Clock, injectable for tests. Default `Date.now`. */
	now?: () => number;
	/** Stop tracking keys past this many (oldest dropped). Default 100 000. */
	maxKeys?: number;
}

/** Fixed-window counters in a `Map`. */
export function memoryRateLimitStore(options: MemoryRateLimitStoreOptions = {}): RateLimitStore {
	const now = options.now ?? Date.now;
	const maxKeys = options.maxKeys ?? 100_000;
	const hits = new Map<string, RateLimitHit>();
	return {
		hit(key, windowMs) {
			const time = now();
			const current = hits.get(key);
			if (current && current.resetAt > time) {
				current.count += 1;
				return { ...current, remainingMs: current.resetAt - time };
			}
			if (hits.size >= maxKeys) {
				const oldest = hits.keys().next().value;
				if (oldest !== undefined) hits.delete(oldest);
			}
			const fresh = { count: 1, resetAt: time + windowMs, remainingMs: windowMs };
			hits.delete(key);
			hits.set(key, fresh);
			return { ...fresh };
		},
		reset(key) {
			hits.delete(key);
		},
	};
}

/** Options for {@link rateLimit}. */
export interface RateLimitOptions {
	/** Window length in ms. */
	windowMs: number;
	/** Requests allowed per key per window. */
	max: number;
	/** Bucket key. Default: client IP (falls back to `"unknown"`). */
	key?: (ctx: Context) => string;
	/** Counter store. Default: a new memory store. */
	store?: RateLimitStore;
	/** Skip counting for some requests (health checks, admins). */
	skip?: (ctx: Context) => boolean;
	/** Key prefix so several limiters can share a store. */
	prefix?: string;
}

/**
 * Fixed-window rate limiting. Sends `RateLimit-Limit/Remaining/Reset`
 * headers and answers `429` with `Retry-After` when the limit is exceeded.
 */
export function rateLimit(options: RateLimitOptions): Middleware {
	const store = options.store ?? memoryRateLimitStore();
	const keyOf = options.key ?? ((ctx: Context) => ctx.ip ?? "unknown");
	return async (ctx, next) => {
		if (options.skip?.(ctx)) return next();
		const key = `${options.prefix ?? "rl"}:${keyOf(ctx)}`;
		const hit = await store.hit(key, options.windowMs);
		const resetSeconds = Math.max(0, Math.ceil(hit.remainingMs / 1000));
		ctx.header("ratelimit-limit", String(options.max));
		ctx.header("ratelimit-remaining", String(Math.max(0, options.max - hit.count)));
		ctx.header("ratelimit-reset", String(resetSeconds));
		if (hit.count > options.max) {
			throw new HttpError(429, "Too many requests, try again later", {
				headers: { "retry-after": String(resetSeconds) },
			});
		}
		return next();
	};
}
