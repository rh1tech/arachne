/**
 * Typed spacing / color / visibility utility class builders.
 * Prefer these over scattering magic strings; CSS lives in styles.css.
 */

export type SpaceScale = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const SPACE: Record<SpaceScale, string> = {
	0: "0",
	1: "0.25rem",
	2: "0.5rem",
	3: "0.75rem",
	4: "1rem",
	5: "1.5rem",
	6: "2rem",
	7: "3rem",
	8: "4rem",
};

export type ColorToken =
	| "ink"
	| "muted"
	| "accent"
	| "danger"
	| "success"
	| "warning"
	| "paper"
	| "canvas"
	| "surface";

export function m(n: SpaceScale): string {
	return `a-m-${n}`;
}
export function mt(n: SpaceScale): string {
	return `a-mt-${n}`;
}
export function mb(n: SpaceScale): string {
	return `a-mb-${n}`;
}
export function ml(n: SpaceScale): string {
	return `a-ml-${n}`;
}
export function mr(n: SpaceScale): string {
	return `a-mr-${n}`;
}
export function mx(n: SpaceScale): string {
	return `a-mx-${n}`;
}
export function my(n: SpaceScale): string {
	return `a-my-${n}`;
}
export function p(n: SpaceScale): string {
	return `a-p-${n}`;
}
export function pt(n: SpaceScale): string {
	return `a-pt-${n}`;
}
export function pb(n: SpaceScale): string {
	return `a-pb-${n}`;
}
export function pl(n: SpaceScale): string {
	return `a-pl-${n}`;
}
export function pr(n: SpaceScale): string {
	return `a-pr-${n}`;
}
export function px(n: SpaceScale): string {
	return `a-px-${n}`;
}
export function py(n: SpaceScale): string {
	return `a-py-${n}`;
}
export function gap(n: SpaceScale): string {
	return `a-gap-${n}`;
}

export function textColor(token: ColorToken): string {
	return `a-c-${token}`;
}
export function bgColor(token: ColorToken): string {
	return `a-bg-${token}`;
}

export const hidden = "a-hidden";
export const srOnly = "a-sr-only";
export const invisible = "a-invisible";
export const truncate = "a-truncate";
export const wFull = "a-w-full";
export const hFull = "a-h-full";

export function spaceValue(n: SpaceScale): string {
	return SPACE[n];
}

/** Join utility class helpers. */
export function util(...parts: Array<string | false | null | undefined>): string {
	return parts.filter(Boolean).join(" ");
}
