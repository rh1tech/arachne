export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "silent";

export type LogBindings = Record<string, string | number | boolean | undefined>;

export interface Logger {
	readonly level: LogLevel;
	readonly bindings: LogBindings;
	trace(msg: string, extra?: LogBindings): void;
	debug(msg: string, extra?: LogBindings): void;
	info(msg: string, extra?: LogBindings): void;
	warn(msg: string, extra?: LogBindings): void;
	error(msg: string, extra?: LogBindings): void;
	child(bindings: LogBindings): Logger;
}

const LEVEL_ORDER: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	silent: 100,
};

export interface ConsoleLoggerOptions {
	level?: LogLevel;
	name?: string;
	bindings?: LogBindings;
	write?: (line: string) => void;
}

export function createConsoleLogger(options: ConsoleLoggerOptions = {}): Logger {
	const level = options.level ?? "info";
	const bindings: LogBindings = {
		...(options.name !== undefined ? { name: options.name } : {}),
		...options.bindings,
	};
	const write = options.write ?? ((line: string) => console.log(line));

	const log = (at: LogLevel, msg: string, extra?: LogBindings): void => {
		if (LEVEL_ORDER[at] < LEVEL_ORDER[level]) return;
		const payload = { level: at, msg, ...bindings, ...extra, time: Date.now() };
		write(JSON.stringify(payload));
	};

	const logger: Logger = {
		level,
		bindings,
		trace: (msg, extra) => log("trace", msg, extra),
		debug: (msg, extra) => log("debug", msg, extra),
		info: (msg, extra) => log("info", msg, extra),
		warn: (msg, extra) => log("warn", msg, extra),
		error: (msg, extra) => log("error", msg, extra),
		child: (childBindings) =>
			createConsoleLogger({
				level,
				bindings: { ...bindings, ...childBindings },
				write,
			}),
	};
	return logger;
}
