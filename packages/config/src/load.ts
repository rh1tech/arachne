import { ConfigError, type ConfigIssue } from "./errors.ts";
import { deepMerge, envToObject, pathToString } from "./merge.ts";
import type { AnySchema } from "./schema.ts";
import type { Infer, StandardSchemaV1 } from "./standard-schema.ts";

export interface LoadConfigOptions {
	/** Absolute or relative path to a config module exporting `default` or `config`. */
	file?: string;
	/** Environment map (defaults to `process.env` when available). */
	env?: Record<string, string | undefined>;
	/** Prefix for env keys. Default `ARACHNE_`. */
	envPrefix?: string;
	/** Highest-precedence explicit overrides (CLI flags, etc.). */
	overrides?: Record<string, unknown>;
	/** Defaults applied before file/env. */
	defaults?: Record<string, unknown>;
	/** Injected file loader for tests / non-Bun runtimes. */
	loadFile?: (path: string) => Promise<Record<string, unknown>>;
}

async function defaultLoadFile(path: string): Promise<Record<string, unknown>> {
	const mod = (await import(path)) as {
		default?: unknown;
		config?: unknown;
	};
	const value = mod.default ?? mod.config ?? {};
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new ConfigError([{ path: path, message: "config file must export an object" }]);
	}
	return value as Record<string, unknown>;
}

function getProcessEnv(): Record<string, string | undefined> {
	if (typeof process !== "undefined" && process.env) return process.env;
	return {};
}

export async function loadConfig<S extends AnySchema | StandardSchemaV1>(
	schema: S,
	options: LoadConfigOptions = {},
): Promise<Infer<S & StandardSchemaV1>> {
	const prefix = options.envPrefix ?? "ARACHNE_";
	const loadFile = options.loadFile ?? defaultLoadFile;

	let merged: Record<string, unknown> = { ...(options.defaults ?? {}) };

	if (options.file) {
		const fromFile = await loadFile(options.file);
		merged = deepMerge(merged, fromFile);
	}

	const fromEnv = envToObject(options.env ?? getProcessEnv(), prefix);
	merged = deepMerge(merged, fromEnv);

	if (options.overrides) {
		merged = deepMerge(merged, options.overrides);
	}

	const result = await schema["~standard"].validate(merged);
	if ("issues" in result && result.issues) {
		const issues: ConfigIssue[] = result.issues.map((issue) => ({
			path: pathToString(issue.path),
			message: issue.message,
		}));
		throw new ConfigError(issues);
	}
	return result.value as Infer<S & StandardSchemaV1>;
}
