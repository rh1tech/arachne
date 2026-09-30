/**
 * Storybook-style actions for examples: `onRemove={action("onRemove")}` records
 * the call so the showcase can show that the callback fired. The generated
 * docs show these as plain `() => {}` handlers.
 */
import { signal } from "@arachnejs/signals";

export type ActionEntry = { id: number; name: string; args: string };

const MAX_ENTRIES = 5;
let nextId = 0;

/** Most recent calls first. */
export const actionLog = signal<ActionEntry[]>([]);

function formatArg(arg: unknown): string {
	if (typeof Event !== "undefined" && arg instanceof Event) return arg.type;
	if (typeof arg === "function") return "ƒ";
	try {
		const text = JSON.stringify(arg);
		return text === undefined ? String(arg) : text.length > 60 ? `${text.slice(0, 57)}…` : text;
	} catch {
		return String(arg);
	}
}

/** A handler that logs `name(args…)` to {@link actionLog}. */
export function action(name: string): (...args: unknown[]) => void {
	return (...args) => {
		const entry = { id: nextId++, name, args: args.map(formatArg).join(", ") };
		actionLog.set([entry, ...actionLog().slice(0, MAX_ENTRIES - 1)]);
	};
}

export function clearActions(): void {
	actionLog.set([]);
}
