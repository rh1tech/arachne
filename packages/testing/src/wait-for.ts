export class WaitForTimeoutError extends Error {
	override name = "WaitForTimeoutError";
}

export interface WaitForOptions {
	timeoutMs?: number;
	intervalMs?: number;
	message?: string;
}

export async function waitFor(
	predicate: () => boolean | Promise<boolean>,
	options: WaitForOptions = {},
): Promise<void> {
	const timeoutMs = options.timeoutMs ?? 1000;
	const intervalMs = options.intervalMs ?? 10;
	const start = Date.now();

	while (Date.now() - start < timeoutMs) {
		if (await predicate()) return;
		await Bun.sleep(intervalMs);
	}

	throw new WaitForTimeoutError(options.message ?? `waitFor timed out after ${timeoutMs}ms`);
}
