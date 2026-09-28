export type FactoryFn<T> = (overrides?: Partial<T>) => T;

export interface FactoryOptions<T> {
	build: (ctx: FactoryContext) => T;
}

export interface FactoryContext {
	seq: (name?: string) => number;
}

export function factory<T extends object>(options: FactoryOptions<T>): FactoryFn<T> {
	const counters = new Map<string, number>();
	const ctx: FactoryContext = {
		seq: (name = "default") => {
			const next = (counters.get(name) ?? 0) + 1;
			counters.set(name, next);
			return next;
		},
	};

	return (overrides = {}) => {
		const base = options.build(ctx);
		return { ...base, ...overrides };
	};
}
