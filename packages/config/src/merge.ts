export function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function deepMerge(
	base: Record<string, unknown>,
	override: Record<string, unknown>,
): Record<string, unknown> {
	const result: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(override)) {
		const existing = result[key];
		if (isPlainObject(existing) && isPlainObject(value)) {
			result[key] = deepMerge(existing, value);
		} else {
			result[key] = value;
		}
	}
	return result;
}

export function setPath(target: Record<string, unknown>, path: string[], value: unknown): void {
	let cursor: Record<string, unknown> = target;
	for (let i = 0; i < path.length - 1; i += 1) {
		const key = path[i];
		if (key === undefined) return;
		const next = cursor[key];
		if (!isPlainObject(next)) {
			const created: Record<string, unknown> = {};
			cursor[key] = created;
			cursor = created;
		} else {
			cursor = next;
		}
	}
	const last = path[path.length - 1];
	if (last !== undefined) cursor[last] = value;
}

export function parseEnvValue(raw: string): string | number | boolean {
	if (raw === "true") return true;
	if (raw === "false") return false;
	if (raw !== "" && !Number.isNaN(Number(raw)) && /^-?\d+(\.\d+)?$/.test(raw)) {
		return Number(raw);
	}
	return raw;
}

export function envToObject(
	env: Record<string, string | undefined>,
	prefix: string,
): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const [key, raw] of Object.entries(env)) {
		if (raw === undefined) continue;
		if (!key.startsWith(prefix)) continue;
		const rest = key.slice(prefix.length);
		if (!rest) continue;
		const path = rest.split("__").map((p) => p.toLowerCase());
		setPath(result, path, parseEnvValue(raw));
	}
	return result;
}

export function pathToString(
	path: ReadonlyArray<PropertyKey | { key: PropertyKey }> | undefined,
): string {
	if (!path || path.length === 0) return "";
	return path
		.map((segment) => {
			if (typeof segment === "object" && segment !== null && "key" in segment) {
				return String(segment.key);
			}
			return String(segment);
		})
		.join(".");
}
