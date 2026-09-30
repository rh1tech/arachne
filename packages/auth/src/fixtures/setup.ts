import { createDb } from "@arachne/db";
import { sqlite } from "@arachne/db-sqlite";
import { createMailer, memoryTransport } from "@arachne/mailer";
import { type AuthOptions, createAuth } from "../index.ts";

/** A fresh auth instance over in-memory SQLite, a memory mailbox and a controllable clock. */
export async function setup(overrides: Partial<AuthOptions> = {}) {
	let now = new Date("2026-09-30T12:00:00.000Z");
	const clock = {
		now: () => now,
		advance(ms: number) {
			now = new Date(now.getTime() + ms);
		},
	};
	const inbox = memoryTransport();
	const db = createDb({ dialect: sqlite(), tables: {} });
	const auth = createAuth({
		db,
		mailer: createMailer({ transport: inbox, from: "Arachne <no-reply@arachne.test>" }),
		appName: "Arachne Test",
		baseUrl: "https://app.test",
		now: clock.now,
		password: { minLength: 10 },
		...overrides,
	});
	await auth.setup();
	/** Token from the latest link sent to `email`. */
	const tokenFrom = (email: string) => {
		const link = inbox.links(email).at(-1);
		return link ? (new URL(link).searchParams.get("token") ?? "") : "";
	};
	return { auth, db, inbox, clock, tokenFrom };
}

/** Register and verify a user; returns it. */
export async function verifiedUser(
	ctx: Awaited<ReturnType<typeof setup>>,
	email = "ada@example.com",
	password = "correct horse battery",
) {
	await ctx.auth.register({ email, password, name: "Ada" });
	await ctx.auth.verifyEmail(ctx.tokenFrom(email));
	return (await ctx.auth.admin.findUserByEmail(email)) as NonNullable<
		Awaited<ReturnType<typeof ctx.auth.admin.findUserByEmail>>
	>;
}
