import { type JsonSchema, toJSONSchema } from "@arachnejs/schema";
import { html, json } from "./context.ts";
import { type AnyRoute, route } from "./route.ts";

/** OpenAPI `info` object. */
export interface OpenApiInfo {
	/** API name. */
	title: string;
	/** API version (your version, not OpenAPI's). */
	version: string;
	/** Markdown description. */
	description?: string;
}

/** Options for {@link openapi}. */
export interface OpenApiOptions {
	/** Document `info`. */
	info: OpenApiInfo;
	/** Routes to describe (routes with `openapi: false` are skipped). */
	routes: readonly AnyRoute[];
	/** `servers` entries, e.g. `[{ url: "https://api.example.com" }]`. */
	servers?: ReadonlyArray<{ url: string; description?: string }>;
	/** `components.securitySchemes`, e.g. bearer tokens or session cookies. */
	securitySchemes?: Record<string, JsonSchema>;
	/** Default `security` requirement for every operation. */
	security?: ReadonlyArray<Record<string, readonly string[]>>;
}

/** An OpenAPI 3.1 document (loosely typed; serialise it as JSON). */
export type OpenApiDocument = JsonSchema;

const ERROR_SCHEMA: JsonSchema = {
	type: "object",
	properties: {
		error: {
			type: "object",
			properties: {
				status: { type: "integer" },
				code: { type: "string" },
				message: { type: "string" },
				details: {},
				issues: {
					type: "array",
					items: {
						type: "object",
						properties: {
							location: {
								type: "string",
								enum: ["params", "query", "headers", "body", "response"],
							},
							path: { type: "string" },
							message: { type: "string" },
						},
						required: ["location", "path", "message"],
					},
				},
			},
			required: ["status", "code", "message"],
		},
	},
	required: ["error"],
};

/** `/users/:id/*rest` → `/users/{id}/{rest}`. */
export function toOpenApiPath(path: string): string {
	return path
		.replace(/:([A-Za-z0-9_]+)/g, "{$1}")
		.replace(/\*([A-Za-z0-9_]*)/g, (_, name) => `{${name || "rest"}}`);
}

function defaultOperationId(r: AnyRoute): string {
	const slug = r.path
		.split("/")
		.filter(Boolean)
		.map((segment) => segment.replace(/^[:*]/, "").replace(/[^A-Za-z0-9]+/g, "_"))
		.join("_");
	return `${r.method === "*" ? "any" : r.method.toLowerCase()}_${slug || "root"}`;
}

function hasBinary(schema: unknown): boolean {
	if (!schema || typeof schema !== "object") return false;
	if ((schema as JsonSchema)["format"] === "binary") return true;
	return Object.values(schema as JsonSchema).some(hasBinary);
}

class Components {
	readonly schemas: Record<string, JsonSchema> = {};

	/** Hoist titled schemas into `components.schemas` and return a `$ref`. */
	ref(schema: JsonSchema): JsonSchema {
		const title = schema["title"];
		if (typeof title !== "string" || !/^[A-Za-z0-9._-]+$/.test(title)) return schema;
		this.schemas[title] ??= schema;
		return { $ref: `#/components/schemas/${title}` };
	}
}

function parameters(r: AnyRoute): JsonSchema[] {
	const out: JsonSchema[] = [];
	const params = r.schemas.params ? toJSONSchema(r.schemas.params) : undefined;
	const paramProps = (params?.["properties"] ?? {}) as Record<string, JsonSchema>;
	for (const match of r.path.matchAll(/[:*]([A-Za-z0-9_]*)/g)) {
		const name = match[1] || "rest";
		out.push({ name, in: "path", required: true, schema: paramProps[name] ?? { type: "string" } });
	}
	const query = r.schemas.query ? toJSONSchema(r.schemas.query) : undefined;
	const required = new Set((query?.["required"] as string[] | undefined) ?? []);
	for (const [name, schema] of Object.entries(
		(query?.["properties"] ?? {}) as Record<string, JsonSchema>,
	)) {
		out.push({ name, in: "query", required: required.has(name), schema });
	}
	return out;
}

function operation(r: AnyRoute, components: Components): JsonSchema {
	const op: JsonSchema = { operationId: r.operationId ?? defaultOperationId(r) };
	if (r.summary) op["summary"] = r.summary;
	if (r.description) op["description"] = r.description;
	if (r.tags.length > 0) op["tags"] = [...r.tags];
	if (r.deprecated) op["deprecated"] = true;
	const params = parameters(r);
	if (params.length > 0) op["parameters"] = params;
	if (r.schemas.body) {
		const schema = toJSONSchema(r.schemas.body);
		const type = hasBinary(schema) ? "multipart/form-data" : "application/json";
		op["requestBody"] = { required: true, content: { [type]: { schema: components.ref(schema) } } };
	}
	const responses: JsonSchema = {};
	for (const [status, schema] of Object.entries(r.schemas.response ?? {})) {
		responses[status] = schema
			? {
					description: "Success",
					content: { "application/json": { schema: components.ref(toJSONSchema(schema)) } },
				}
			: { description: "No content" };
	}
	if (Object.keys(responses).length === 0) responses["200"] = { description: "Success" };
	const validated = r.schemas.params || r.schemas.query || r.schemas.body || r.schemas.headers;
	if (validated) {
		responses["422"] = {
			description: "Validation failed",
			content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } },
		};
	}
	op["responses"] = responses;
	return typeof r.openapi === "object" ? { ...op, ...r.openapi } : op;
}

/**
 * Build an OpenAPI 3.1 document from routes. Params, query, bodies and
 * responses come from the route schemas; schemas with a `title`
 * (`s.describe(schema, { title })`) become reusable components.
 */
export function openapi(options: OpenApiOptions): OpenApiDocument {
	const components = new Components();
	components.schemas["Error"] = ERROR_SCHEMA;
	const paths: Record<string, JsonSchema> = {};
	for (const r of options.routes) {
		if (r.openapi === false || r.method === "*") continue;
		const path = toOpenApiPath(r.path);
		paths[path] ??= {};
		(paths[path] as JsonSchema)[r.method.toLowerCase()] = operation(r, components);
	}
	const doc: JsonSchema = { openapi: "3.1.0", info: { ...options.info } };
	if (options.servers) doc["servers"] = [...options.servers];
	doc["paths"] = paths;
	const componentsObject: JsonSchema = { schemas: components.schemas };
	if (options.securitySchemes) componentsObject["securitySchemes"] = options.securitySchemes;
	doc["components"] = componentsObject;
	if (options.security) doc["security"] = [...options.security];
	return doc;
}

/** Options for {@link apiDocs}. */
export interface ApiDocsOptions extends OpenApiOptions {
	/** Where the JSON document is served. Default `/openapi.json`. */
	specPath?: string;
	/** Where the explorer page is served, or `false`. Default `/docs`. */
	docsPath?: string | false;
	/** Explorer script URL (self-host it to avoid the CDN). Default: Scalar on jsDelivr. */
	explorerScript?: string;
}

const SCALAR = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1";

function escapeAttr(value: string): string {
	return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Routes that serve the OpenAPI document and an API explorer (Scalar). The
 * document is built once, from the routes passed in.
 */
export function apiDocs(options: ApiDocsOptions) {
	const specPath = options.specPath ?? "/openapi.json";
	const document = openapi(options);
	const routes = [
		route({ method: "GET", path: specPath, openapi: false, handler: () => json(document) }),
	];
	if (options.docsPath === false) return routes;
	const script = options.explorerScript ?? SCALAR;
	const origin = new URL(script, "http://self").origin;
	const external = origin === "http://self" ? "" : ` ${origin}`;
	const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeAttr(options.info.title)} · API</title></head>
<body><script id="api-reference" data-url="${escapeAttr(specPath)}"></script>
<script src="${escapeAttr(script)}"></script></body></html>`;
	const csp = `default-src 'self'; script-src 'self'${external}; style-src 'self' 'unsafe-inline'${external} https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com${external}; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'none'`;
	return [
		...routes,
		route({
			method: "GET",
			path: options.docsPath ?? "/docs",
			openapi: false,
			handler: () => html(page, { headers: { "content-security-policy": csp } }),
		}),
	];
}
