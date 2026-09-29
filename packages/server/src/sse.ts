/** One server-sent event. Objects in `data` are JSON-encoded. */
export interface SseEvent {
	/** Event name (`event:` field); default `message` on the client. */
	event?: string;
	/** Payload; strings are sent as-is, everything else as JSON. */
	data: unknown;
	/** Event id for `Last-Event-ID` resumption. */
	id?: string;
	/** Client reconnect delay in ms. */
	retry?: number;
}

/** Push events to the client. Returns `false` once the client has gone. */
export type SseSend = (event: SseEvent) => boolean;

/** Format one event in `text/event-stream` framing. */
export function formatSse(event: SseEvent): string {
	let out = "";
	if (event.event) out += `event: ${event.event}\n`;
	if (event.id) out += `id: ${event.id}\n`;
	if (event.retry !== undefined) out += `retry: ${event.retry}\n`;
	const data = typeof event.data === "string" ? event.data : JSON.stringify(event.data);
	for (const line of data.split("\n")) out += `data: ${line}\n`;
	return `${out}\n`;
}

/**
 * Stream server-sent events. The stream closes when `producer` resolves;
 * `signal` aborts when the client disconnects.
 *
 * @example
 * ```ts
 * handler: () => sse(async (send, signal) => {
 *   for await (const job of queue.watch(signal)) send({ event: "job", data: job });
 * })
 * ```
 */
export function sse(
	producer: (send: SseSend, signal: AbortSignal) => void | Promise<void>,
	init: ResponseInit = {},
): Response {
	const abort = new AbortController();
	const encoder = new TextEncoder();
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send: SseSend = (event) => {
				if (abort.signal.aborted) return false;
				controller.enqueue(encoder.encode(formatSse(event)));
				return true;
			};
			try {
				await producer(send, abort.signal);
			} finally {
				if (!abort.signal.aborted) controller.close();
			}
		},
		cancel() {
			abort.abort();
		},
	});
	const headers = new Headers(init.headers);
	headers.set("content-type", "text/event-stream");
	headers.set("cache-control", "no-cache");
	headers.set("connection", "keep-alive");
	return new Response(stream, { ...init, headers });
}
