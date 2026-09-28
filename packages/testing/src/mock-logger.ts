import type { LogBindings, Logger, LogLevel } from "@arachne/core";

export interface LogEntry {
	level: Exclude<LogLevel, "silent">;
	msg: string;
	extra?: LogBindings;
}

export interface MockLogger extends Logger {
	readonly entries: LogEntry[];
	clear(): void;
}

export function createMockLogger(level: LogLevel = "trace"): MockLogger {
	const entries: LogEntry[] = [];
	const bindings: LogBindings = {};

	const push =
		(at: Exclude<LogLevel, "silent">) =>
		(msg: string, extra?: LogBindings): void => {
			entries.push(extra === undefined ? { level: at, msg } : { level: at, msg, extra });
		};

	const clear = (): void => {
		entries.length = 0;
	};

	const child = (childBindings: LogBindings): MockLogger => {
		const next = createMockLogger(level);
		Object.assign(next.bindings, bindings, childBindings);
		next.entries.push(...entries);
		return next;
	};

	return {
		level,
		bindings,
		entries,
		trace: push("trace"),
		debug: push("debug"),
		info: push("info"),
		warn: push("warn"),
		error: push("error"),
		child,
		clear,
	};
}
