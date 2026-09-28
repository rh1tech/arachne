export interface Token<T> {
	readonly description: string;
	readonly __type?: T;
}

export function createToken<T>(description: string): Token<T> {
	return { description };
}
