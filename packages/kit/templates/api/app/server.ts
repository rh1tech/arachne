import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { createAuth } from "@arachne/auth";
import { createDb } from "@arachne/db";
import { sqlite } from "@arachne/db-sqlite";
import { defineServer } from "@arachne/kit";
import { consoleTransport, createMailer } from "@arachne/mailer";
import { s } from "@arachne/schema";
import { cors, group, HttpError, rateLimit, route } from "@arachne/server";
import { diskStorage, saveUpload, toResponse } from "@arachne/storage";
import { attachments, projects } from "./tables.ts";

const Project = s.describe(
	s.object({
		id: s.uuid(),
		name: s.string(),
		status: s.enum(["planned", "active", "done"]),
		budget: s.nullable(s.number()),
		tags: s.array(s.string()),
		dueDate: s.nullable(s.date()),
		createdAt: s.date(),
	}),
	{ title: "Project" },
);

/** Create/update body: cross-field rule (done projects need no due date in the future). */
const ProjectInput = s.refine(
	s.object({
		name: s.string({ min: 1, max: 120, trim: true }),
		status: s.defaulted(s.enum(["planned", "active", "done"]), "planned"),
		budget: s.defaulted(s.nullable(s.number({ min: 0 })), null),
		tags: s.defaulted(s.array(s.string({ min: 1, max: 30, lowercase: true })), []),
		dueDate: s.defaulted(s.nullable(s.coerce.date()), null),
	}),
	(value) => !(value.status === "done" && value.dueDate && value.dueDate.getTime() > Date.now()),
	{ message: "a done project can't have a due date in the future", path: ["dueDate"] },
);

export default defineServer(async () => {
	const dbPath = process.env["DATABASE_PATH"] ?? "data/api.db";
	mkdirSync(dirname(dbPath), { recursive: true });
	const db = createDb({ dialect: sqlite({ path: dbPath }), tables: { projects, attachments } });
	const storage = diskStorage({ root: process.env["UPLOADS_DIR"] ?? "data/uploads" });
	const auth = createAuth({
		db,
		mailer: createMailer({
			transport: consoleTransport(),
			from: "Projects API <no-reply@example.com>",
		}),
		baseUrl: process.env["BASE_URL"] ?? "http://localhost:3000",
		secret: process.env["AUTH_SECRET"],
		appName: "Projects API",
		acl: {
			permissions: {
				"projects:read": "Read projects",
				"projects:write": "Create and edit projects",
			},
			conditions: {
				owner: ({ subject, resource }) =>
					(resource as { ownerId?: string })?.ownerId === subject.id,
			},
			groups: {
				user: {
					level: 10,
					inherits: ["guest"],
					grants: ["projects:read@owner", "projects:write@owner"],
				},
			},
		},
	});
	await auth.setup();
	await db.sync();

	const owned = async (
		id: string,
		ctx: Parameters<typeof auth.authorize>[0],
		permission: string,
	) => {
		const project = await db.select(projects).where({ id }).get();
		if (!project) throw new HttpError(404, "Project not found");
		auth.authorize(ctx, permission, project);
		return project;
	};

	const api = group({ prefix: "/v1", tags: ["projects"], meta: { auth: true } }, [
		route({
			method: "GET",
			path: "/projects",
			summary: "List my projects",
			mcp: true,
			query: s.object({
				status: s.optional(s.enum(["planned", "active", "done"])),
				tag: s.optional(s.string()),
				page: s.defaulted(s.coerce.integer({ min: 1 }), 1),
				perPage: s.defaulted(s.coerce.integer({ min: 1, max: 100 }), 20),
			}),
			response: {
				200: s.object({ projects: s.array(Project), total: s.integer(), page: s.integer() }),
			},
			handler: async (ctx) => {
				const user = auth.user(ctx);
				const { status, tag, page, perPage } = ctx.query;
				const filter = {
					ownerId: user.id,
					...(status ? { status } : {}),
					...(tag ? { tags: { like: `%"${tag}"%` } } : {}),
				};
				const query = () => db.select(projects).where(filter as never);
				const rows = await query()
					.orderBy("createdAt", "desc")
					.orderBy("id") // stable order: pages never repeat or skip rows
					.limit(perPage)
					.offset((page - 1) * perPage)
					.all();
				return { projects: rows, total: await query().count(), page };
			},
		}),
		route({
			method: "POST",
			path: "/projects",
			summary: "Create a project",
			mcp: { name: "create_project" },
			body: ProjectInput,
			response: { 201: Project },
			handler: async (ctx) => {
				const user = auth.authorize(ctx, "projects:write", { ownerId: ctx.state.user?.id });
				ctx.status(201);
				return db.insert(projects).values({ ...ctx.body, ownerId: user.id });
			},
		}),
		route({
			method: "GET",
			path: "/projects/:id",
			summary: "Get a project",
			params: s.object({ id: s.uuid() }),
			response: { 200: Project },
			handler: (ctx) => owned(ctx.params.id, ctx, "projects:read"),
		}),
		route({
			method: "PATCH",
			path: "/projects/:id",
			summary: "Update a project",
			params: s.object({ id: s.uuid() }),
			body: s.partial(
				s.object({
					name: s.string({ min: 1, max: 120, trim: true }),
					status: s.enum(["planned", "active", "done"]),
					budget: s.nullable(s.number({ min: 0 })),
					tags: s.array(s.string({ min: 1, max: 30, lowercase: true })),
					dueDate: s.nullable(s.coerce.date()),
				}),
			),
			handler: async (ctx) => {
				const project = await owned(ctx.params.id, ctx, "projects:write");
				await db.update(projects).set(ctx.body).where({ id: project.id }).run();
				return db.select(projects).where({ id: project.id }).get();
			},
		}),
		route({
			method: "DELETE",
			path: "/projects/:id",
			summary: "Delete a project",
			params: s.object({ id: s.uuid() }),
			handler: async (ctx) => {
				const project = await owned(ctx.params.id, ctx, "projects:write");
				for (const file of await db.select(attachments).where({ projectId: project.id }).all())
					await storage.delete(file.key);
				await db.delete(projects).where({ id: project.id }).run();
				return undefined;
			},
		}),
		route({
			method: "POST",
			path: "/projects/:id/attachments",
			summary: "Upload an attachment (multipart/form-data)",
			params: s.object({ id: s.uuid() }),
			bodyLimit: 20 * 1024 * 1024,
			body: s.object({
				file: s.file({
					maxSize: 10 * 1024 * 1024,
					types: ["image/*", "application/pdf", "text/*"],
				}),
			}),
			handler: async (ctx) => {
				const project = await owned(ctx.params.id, ctx, "projects:write");
				const saved = await saveUpload(storage, ctx.body.file, {
					prefix: `projects/${project.id}`,
				});
				ctx.status(201);
				return db.insert(attachments).values({
					projectId: project.id,
					key: saved.key,
					name: saved.originalName,
					type: saved.contentType,
					size: saved.size,
				});
			},
		}),
		route({
			method: "GET",
			path: "/projects/:id/attachments/:attachmentId",
			summary: "Download an attachment",
			params: s.object({ id: s.uuid(), attachmentId: s.uuid() }),
			handler: async (ctx) => {
				const project = await owned(ctx.params.id, ctx, "projects:read");
				const row = await db
					.select(attachments)
					.where({ id: ctx.params.attachmentId, projectId: project.id })
					.get();
				const file = row && (await storage.get(row.key));
				if (!row || !file) throw new HttpError(404, "Attachment not found");
				return toResponse(file, { download: row.name });
			},
		}),
	]);

	const origins = (process.env["CORS_ORIGINS"] ?? "")
		.split(",")
		.map((o) => o.trim())
		.filter(Boolean);
	return {
		db,
		tables: { projects, attachments, ...auth.tables },
		middleware: [
			...(origins.length ? [cors({ origin: origins, credentials: true })] : []),
			rateLimit({ windowMs: 60_000, max: 300 }),
			auth.middleware(),
		],
		routes: [
			route({
				method: "GET",
				path: "/health",
				summary: "Liveness",
				openapi: false,
				handler: () => ({ ok: true }),
			}),
			...auth.routes(),
			...api,
		],
		openapi: {
			title: "Projects API",
			version: "1.0.0",
			description: "Example Arachne API: validation, uploads, auth, MCP.",
		},
		dispose: () => db.close(),
	};
});
