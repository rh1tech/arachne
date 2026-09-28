import { describe, expect, test } from "bun:test";
import { ConfigError, c, envToObject, loadConfig } from "../src/index.ts";

describe("c schema", () => {
	test("validates object with defaults", async () => {
		const schema = c.object({
			port: c.defaulted(c.number({ int: true }), 3000),
			name: c.string({ min: 1 }),
			debug: c.defaulted(c.boolean(), false),
		});
		const result = await schema["~standard"].validate({ name: "app" });
		expect(result).toEqual({
			value: { port: 3000, name: "app", debug: false },
		});
	});

	test("reports nested issues", async () => {
		const schema = c.object({
			db: c.object({ url: c.string({ min: 1 }) }),
		});
		const result = await schema["~standard"].validate({ db: { url: "" } });
		expect("issues" in result && result.issues?.[0]?.message).toMatch(/length/);
	});
});

describe("envToObject", () => {
	test("maps prefixed nested keys", () => {
		const obj = envToObject(
			{
				ARACHNE_PORT: "8080",
				ARACHNE_DB__HOST: "localhost",
				ARACHNE_DEBUG: "true",
				OTHER: "x",
			},
			"ARACHNE_",
		);
		expect(obj).toEqual({
			port: 8080,
			db: { host: "localhost" },
			debug: true,
		});
	});
});

describe("loadConfig", () => {
	const schema = c.object({
		port: c.defaulted(c.number(), 3000),
		databaseUrl: c.string({ min: 1 }),
		debug: c.defaulted(c.boolean(), false),
	});

	test("merges file < env < overrides", async () => {
		const config = await loadConfig(schema, {
			file: "virtual.config.ts",
			loadFile: async () => ({ databaseUrl: "file://db", port: 1000 }),
			env: { ARACHNE_PORT: "2000", ARACHNE_DEBUG: "true" },
			overrides: { port: 3001 },
		});
		expect(config).toEqual({
			port: 3001,
			databaseUrl: "file://db",
			debug: true,
		});
	});

	test("throws ConfigError on invalid config", async () => {
		await expect(
			loadConfig(schema, {
				file: "virtual.config.ts",
				loadFile: async () => ({}),
				env: {},
			}),
		).rejects.toBeInstanceOf(ConfigError);
	});

	test("applies defaults when nothing else provides values", async () => {
		const config = await loadConfig(schema, {
			defaults: { databaseUrl: "sqlite://:memory:" },
			env: {},
		});
		expect(config.port).toBe(3000);
		expect(config.debug).toBe(false);
		expect(config.databaseUrl).toBe("sqlite://:memory:");
	});
});
