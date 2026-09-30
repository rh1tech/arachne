import { s } from "@arachne/schema";
import { HttpError, route } from "@arachne/server";
import { defineServer } from "../../../index.ts";

const notes = [
	{ id: "1", title: "First <note>", body: "Hello from the server." },
	{ id: "2", title: "Second note", body: "Another one." },
];

export default defineServer(() => ({
	routes: [
		route({
			method: "GET",
			path: "/api/notes",
			query: s.object({ limit: s.defaulted(s.coerce.integer({ min: 1 }), 10) }),
			handler: (ctx) => ({ notes: notes.slice(0, ctx.query.limit) }),
		}),
	],
	loaders: {
		"/notes/:id": ({ params }) => {
			const note = notes.find((n) => n.id === params["id"]);
			if (!note) throw new HttpError(404, "Note not found");
			return note;
		},
	},
	paths: {
		"/notes/:id": () => notes.map((n) => ({ id: n.id })),
	},
}));
