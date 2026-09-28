type Handler = (...args: never[]) => unknown;

export class EventBus {
	readonly #listeners = new Map<string, Set<Handler>>();

	on<T>(event: string, handler: (payload: T) => unknown): () => void {
		let set = this.#listeners.get(event);
		if (!set) {
			set = new Set();
			this.#listeners.set(event, set);
		}
		set.add(handler as Handler);
		return () => {
			set?.delete(handler as Handler);
		};
	}

	once<T>(event: string, handler: (payload: T) => unknown): () => void {
		const off = this.on<T>(event, (payload) => {
			off();
			return handler(payload);
		});
		return off;
	}

	off<T>(event: string, handler: (payload: T) => unknown): void {
		this.#listeners.get(event)?.delete(handler as Handler);
	}

	emit<T>(event: string, payload?: T): void {
		const set = this.#listeners.get(event);
		if (!set) return;
		for (const handler of [...set]) {
			(handler as (p: T | undefined) => unknown)(payload);
		}
	}

	async emitAsync<T>(event: string, payload?: T): Promise<void> {
		const set = this.#listeners.get(event);
		if (!set) return;
		for (const handler of [...set]) {
			await (handler as (p: T | undefined) => unknown)(payload);
		}
	}
}
