/** SSR build stand-in for contract.tsx (which imports the DOM-only `render`). */
export const THEME_CLASS = "theme-probe";
export function runContract(): never {
	throw new Error("runContract is DOM-only");
}
