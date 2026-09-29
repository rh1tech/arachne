/** Documented function. */
export function documented(): void {}

export function missing(): void {}

/** Documented options. */
export interface Options {
	/** Documented member. */
	good: string;
	bad: number;
}

/** Documented constant. */
export const value = 1;

export type Alias = string;

export { reexported } from "./other.ts";

/** Generic interface: type parameters are not members. */
export interface Box<Value> {
	/** The value. */
	value: Value;
}
