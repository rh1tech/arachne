import type { Auth } from "@arachne/auth";
import type { DbQueries } from "@arachne/db";
import { s } from "@arachne/schema";
import { group, HttpError, route } from "@arachne/server";
import { notes } from "./tables.ts";

export const Note = s.describe(
	s.object({ id: s.uuid(), title: s.string(), body: s.string(), createdAt: s.date() }),
	{ title: "Note" },
);

/** The notes API. Pages use `createClient<Api>()` for typed calls. */
export function createApi(db: DbQueries, auth: Auth) {
	const mine = (userId: string) => db.select(notes).where({ userId }).orderBy("createdAt", "desc");
	return group({ prefix: "/api", tags: ["notes"], meta: { auth: true } }, [
		route({
			method: "GET",
			path: "/notes",
			summary: "List my notes",
			mcp: true,
			query: s.object({ limit: s.defaulted(s.coerce.integer({ min: 1, max: 100 }), 50) }),
			handler: async (ctx) => {
				const user = auth.authorize(ctx, "notes:read", { userId: ctx.state.user?.id });
				return { notes: await mine(user.id).limit(ctx.query.limit).all() };
			},
		}),
		route({
			method: "POST",
			path: "/notes",
			summary: "Create a note",
			mcp: { name: "create_note", description: "Create a note for the signed-in user" },
			body: s.object({
				title: s.string({ min: 1, max: 200, trim: true }),
				body: s.defaulted(s.string({ max: 10_000 }), ""),
			}),
			handler: async (ctx) => {
				const user = auth.authorize(ctx, "notes:write", { userId: ctx.state.user?.id });
				ctx.status(201);
				return {
					note: await db
						.insert(notes)
						.values({ userId: user.id, title: ctx.body.title, body: ctx.body.body }),
				};
			},
		}),
		route({
			method: "DELETE",
			path: "/notes/:id",
			summary: "Delete a note",
			params: s.object({ id: s.uuid() }),
			handler: async (ctx) => {
				const note = await db.select(notes).where({ id: ctx.params.id }).get();
				if (!note) throw new HttpError(404, "Note not found");
				auth.authorize(ctx, "notes:delete", note); // owners only (condition `owner`)
				await db.delete(notes).where({ id: note.id }).run();
				return undefined;
			},
		}),
	]);
}

export type Api = ReturnType<typeof createApi>;
