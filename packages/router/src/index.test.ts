import { describe, expect, test } from "bun:test";
import { memoryHistory } from "../src/history.ts";
import { compilePath, parseLocation } from "../src/path.ts";
import { createRouter } from "../src/router.ts";

describe("compilePath", () => {
	test("build encodes params, joins splats and rejects missing params", () => {
		expect(compilePath("/users/:id").build({ id: "a b/c" })).toBe("/users/a%20b%2Fc");
		expect(compilePath("/files/*path").build({ path: "/docs/readme.md" })).toBe(
			"/files/docs/readme.md",
		);
		expect(compilePath("/files/*").build({ rest: "x/y" })).toBe("/files/x/y");
		expect(compilePath("/").build()).toBe("/");
		expect(() => compilePath("/users/:id").build({})).toThrow('missing path param "id"');
		expect(() => compilePath("/files/*path").build({})).toThrow('missing path param "path"');
	});

	test("matches static and params", () => {
		const users = compilePath("/users/:id");
		expect(users.match("/users/42")).toEqual({
			params: { id: "42" },
			pathname: "/users/42",
		});
		expect(users.match("/users")).toBeNull();
		expect(users.build({ id: "7" })).toBe("/users/7");
	});

	test("catch-all rest", () => {
		const all = compilePath("/files/*path");
		expect(all.match("/files/a/b")).toEqual({
			params: { path: "a/b" },
			pathname: "/files/a/b",
		});
	});

	test("root", () => {
		expect(compilePath("/").match("/")).toEqual({ params: {}, pathname: "/" });
	});
});

describe("parseLocation", () => {
	test("splits search and hash", () => {
		expect(parseLocation("/a?x=1#h")).toEqual({
			pathname: "/a",
			search: "?x=1",
			hash: "#h",
		});
	});
});

describe("createRouter", () => {
	test("navigates and resolves outlet", () => {
		const history = memoryHistory("/");
		const router = createRouter({
			history,
			routes: [
				{ path: "/", component: () => "home" },
				{
					path: "/users/:id",
					component: (p) => `user:${p.params["id"]}`,
				},
			],
			fallback: () => "missing",
		});

		expect(router.Outlet()).toBe("home");
		router.navigate("/users/9");
		expect(router.location().pathname).toBe("/users/9");
		expect(router.params()).toEqual({ id: "9" });
		expect(router.Outlet()).toBe("user:9");
		router.navigate("/nope");
		expect(router.Outlet()).toBe("missing");
		router.back();
		expect(router.Outlet()).toBe("user:9");
		router.dispose();
	});

	test("nested route paths flatten", () => {
		const router = createRouter({
			history: memoryHistory("/app/settings"),
			routes: [
				{
					path: "/app",
					children: [{ path: "settings", component: () => "settings" }],
				},
			],
		});
		expect(router.Outlet()).toBe("settings");
		router.dispose();
	});
});
