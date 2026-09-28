import { ResolutionError } from "./errors.ts";
import type { Token } from "./token.ts";

export type Scope = "singleton" | "transient";

export type Factory<T> = (container: Container) => T | Promise<T>;

export interface ValueProvider<T> {
	token: Token<T>;
	useValue: T;
	scope?: Scope;
}

export interface FactoryProvider<T> {
	token: Token<T>;
	useFactory: Factory<T>;
	scope?: Scope;
}

export type Provider<T = unknown> = ValueProvider<T> | FactoryProvider<T>;

function isValueProvider<T>(p: Provider<T>): p is ValueProvider<T> {
	return "useValue" in p;
}

export class Container {
	readonly #parent: Container | undefined;
	readonly #providers = new Map<Token<unknown>, Provider<unknown>>();
	readonly #singletons = new Map<Token<unknown>, unknown>();
	readonly #resolving = new Set<Token<unknown>>();

	constructor(parent?: Container) {
		this.#parent = parent;
	}

	register<T>(provider: Provider<T>): this {
		this.#providers.set(provider.token as Token<unknown>, provider as Provider<unknown>);
		this.#singletons.delete(provider.token as Token<unknown>);
		return this;
	}

	has(token: Token<unknown>): boolean {
		if (this.#providers.has(token)) return true;
		return this.#parent?.has(token) ?? false;
	}

	createChild(): Container {
		return new Container(this);
	}

	resolve<T>(token: Token<T>): T {
		const value = this.#resolve(token, false);
		if (value instanceof Promise) {
			throw new ResolutionError(
				`Token "${token.description}" resolved to a Promise; use resolveAsync()`,
			);
		}
		return value;
	}

	resolveAsync<T>(token: Token<T>): Promise<T> {
		return Promise.resolve(this.#resolve(token, true));
	}

	#owner(token: Token<unknown>): Container | undefined {
		if (this.#providers.has(token)) return this;
		if (!this.#parent) return undefined;
		return this.#parent.#owner(token);
	}

	#resolve<T>(token: Token<T>, allowAsync: boolean): T | Promise<T> {
		const owner = this.#owner(token as Token<unknown>);
		if (!owner) {
			throw new ResolutionError(`No provider registered for token "${token.description}"`);
		}

		if (owner.#singletons.has(token as Token<unknown>)) {
			return owner.#singletons.get(token as Token<unknown>) as T;
		}

		const provider = owner.#providers.get(token as Token<unknown>);
		if (!provider) {
			throw new ResolutionError(`No provider registered for token "${token.description}"`);
		}

		if (this.#resolving.has(token as Token<unknown>)) {
			throw new ResolutionError(
				`Circular dependency detected while resolving "${token.description}"`,
			);
		}

		this.#resolving.add(token as Token<unknown>);
		try {
			const scope = provider.scope ?? "singleton";
			let value: unknown;
			if (isValueProvider(provider)) {
				value = provider.useValue;
			} else {
				value = provider.useFactory(this);
			}

			if (value instanceof Promise && !allowAsync) {
				throw new ResolutionError(
					`Token "${token.description}" resolved to a Promise; use resolveAsync()`,
				);
			}

			if (scope === "singleton") {
				if (value instanceof Promise) {
					return value.then((resolved) => {
						owner.#singletons.set(token as Token<unknown>, resolved);
						return resolved as T;
					}) as Promise<T>;
				}
				owner.#singletons.set(token as Token<unknown>, value);
			}

			return value as T | Promise<T>;
		} finally {
			this.#resolving.delete(token as Token<unknown>);
		}
	}
}
