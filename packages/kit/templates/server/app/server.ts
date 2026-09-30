import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createAuth } from "@arachne/auth";
import { createDb } from "@arachne/db";
import { sqlite } from "@arachne/db-sqlite";
import { defineServer, type LoaderArgs } from "@arachne/kit";
import { consoleTransport, createMailer, smtpTransport } from "@arachne/mailer";
import { HttpError } from "@arachne/server";
import { createApi } from "./api.ts";
import { notes } from "./tables.ts";

export default defineServer(async ({ dev }) => {
	const path = process.env["DATABASE_PATH"] ?? "data/app.db";
	mkdirSync(dirname(path), { recursive: true });
	const db = createDb({ dialect: sqlite({ path }), tables: { notes } });

	const mailer = createMailer({
		transport: process.env["SMTP_HOST"]
			? smtpTransport({
					host: process.env["SMTP_HOST"],
					port: Number(process.env["SMTP_PORT"] ?? 587),
					auth: { user: process.env["SMTP_USER"] ?? "", pass: process.env["SMTP_PASS"] ?? "" },
				})
			: consoleTransport(), // development: links are printed to the terminal
		from: process.env["MAIL_FROM"] ?? "Notebook <no-reply@example.com>",
	});

	if (!dev && !process.env["AUTH_SECRET"])
		console.warn("AUTH_SECRET is not set; CSRF tokens change on every restart");
	const auth = createAuth({
		db,
		mailer,
		appName: "Notebook",
		baseUrl: process.env["BASE_URL"] ?? "http://localhost:3000",
		secret: process.env["AUTH_SECRET"],
		links: {
			verifyEmail: "/verify-email",
			resetPassword: "/reset-password",
			confirmEmail: "/confirm-email",
		},
		acl: {
			permissions: {
				"notes:read": "Read notes",
				"notes:write": "Write notes",
				"notes:delete": "Delete notes",
			},
			conditions: {
				owner: ({ subject, resource }) => (resource as { userId?: string })?.userId === subject.id,
			},
			groups: {
				user: {
					level: 10,
					inherits: ["guest"],
					grants: ["notes:read@owner", "notes:write@owner", "notes:delete@owner"],
				},
			},
		},
	});
	await auth.setup();
	await db.sync(); // use `arachne migrate` once the schema starts changing

	/** Every page gets the signed-in user for the navigation bar. */
	const page =
		<T extends object>(load: (args: LoaderArgs) => T | Promise<T> = () => ({}) as T) =>
		async (args: LoaderArgs) => ({ user: args.ctx?.state.user ?? null, ...(await load(args)) });

	return {
		db,
		tables: { notes, ...auth.tables },
		middleware: [auth.middleware()],
		routes: [...auth.routes(), ...createApi(db, auth)],
		openapi: { title: "Notebook API", version: "1.0.0" },
		loaders: {
			"/": page(),
			"/login": page(),
			"/register": page(),
			"/forgot-password": page(),
			"/reset-password": page(({ url }) => ({ token: url.searchParams.get("token") ?? "" })),
			"/verify-email": page(async ({ url }) => {
				try {
					const user = await auth.verifyEmail(url.searchParams.get("token") ?? "");
					return { verified: true, email: user.email };
				} catch (error) {
					return { verified: false, message: (error as Error).message };
				}
			}),
			"/notes": page(async ({ ctx }) => {
				const user = ctx?.state.user;
				if (!user) throw new HttpError(401, "Sign in to see your notes");
				return {
					notes: await db
						.select(notes)
						.where({ userId: user.id })
						.orderBy("createdAt", "desc")
						.all(),
				};
			}),
		},
		dispose: () => db.close(),
	};
});
