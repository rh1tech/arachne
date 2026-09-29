import type { Middleware } from "./context.ts";

/** Options for {@link requestId}. */
export interface RequestIdOptions {
	/** Header to read and echo. Default `x-request-id`. */
	header?: string;
	/** Trust incoming ids that look safe (≤ 128 chars of `[A-Za-z0-9._-]`). Default `true`. */
	trustIncoming?: boolean;
}

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

/** Assign `ctx.requestId` (incoming or a new UUID) and echo it in the response. */
export function requestId(options: RequestIdOptions = {}): Middleware {
	const header = options.header ?? "x-request-id";
	return (ctx, next) => {
		const incoming = ctx.request.headers.get(header);
		ctx.requestId =
			options.trustIncoming !== false && incoming && SAFE_ID.test(incoming)
				? incoming
				: crypto.randomUUID();
		ctx.header(header, ctx.requestId);
		return next();
	};
}
