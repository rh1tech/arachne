import type { AnySchema } from "./helpers.ts";
import { s } from "./schema.ts";

/** JSON-friendly schema descriptor for MCP / tooling. */
export type SchemaSpec =
	| { kind: "string"; min?: number | undefined; max?: number | undefined }
	| {
			kind: "number";
			min?: number | undefined;
			max?: number | undefined;
			int?: boolean | undefined;
	  }
	| { kind: "boolean" }
	| { kind: "literal"; value: string | number | boolean }
	| { kind: "enum"; values: [string, ...string[]] }
	| { kind: "optional"; of: SchemaSpec }
	| { kind: "nullable"; of: SchemaSpec }
	| { kind: "defaulted"; of: SchemaSpec; value: unknown }
	| { kind: "array"; of: SchemaSpec }
	| { kind: "object"; fields: Record<string, SchemaSpec> }
	| { kind: "union"; options: [SchemaSpec, SchemaSpec, ...SchemaSpec[]] };

export function schemaFromSpec(spec: SchemaSpec): AnySchema {
	switch (spec.kind) {
		case "string": {
			const options: { min?: number; max?: number } = {};
			if (spec.min !== undefined) options.min = spec.min;
			if (spec.max !== undefined) options.max = spec.max;
			return s.string(options);
		}
		case "number": {
			const options: { min?: number; max?: number; int?: boolean } = {};
			if (spec.min !== undefined) options.min = spec.min;
			if (spec.max !== undefined) options.max = spec.max;
			if (spec.int !== undefined) options.int = spec.int;
			return s.number(options);
		}
		case "boolean":
			return s.boolean();
		case "literal":
			return s.literal(spec.value);
		case "enum":
			return s.enum(spec.values);
		case "optional":
			return s.optional(schemaFromSpec(spec.of));
		case "nullable":
			return s.nullable(schemaFromSpec(spec.of));
		case "defaulted":
			return s.defaulted(schemaFromSpec(spec.of), spec.value);
		case "array":
			return s.array(schemaFromSpec(spec.of));
		case "object": {
			const shape: Record<string, AnySchema> = {};
			for (const [key, field] of Object.entries(spec.fields)) {
				shape[key] = schemaFromSpec(field);
			}
			return s.object(shape);
		}
		case "union":
			return s.union(spec.options.map(schemaFromSpec) as [AnySchema, AnySchema, ...AnySchema[]]);
	}
}
