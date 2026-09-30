import { existsSync, type FSWatcher, watch } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { bunPlugin } from "@arachne/vite";
import type { ServerWebSocket } from "bun";
import { type AppServer, createAppServer } from "./app.ts";
import { ROUTES_FILES, resolveConfig, SERVER_FILES } from "./config.ts";

/** Exit code the dev server uses to ask the supervisor for a restart. */
export const RESTART_CODE = 75;

const IGNORED = /(^|[\\/])(node_modules|\.arachne|\.git|dist[^\\/]*)([\\/]|$)/;

/** The browser side of hot reload: reload on change, swap CSS, show build errors, reconnect after restarts. */
export function devClientScript(base: string): string {
	return `(() => {
const url = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + ${JSON.stringify(`${base}__arachne/hmr`)};
let state = "new";
const overlay = (message) => {
	let el = document.getElementById("__arachne_overlay");
	if (!message) { el?.remove(); return; }
	if (!el) { el = document.createElement("pre"); el.id = "__arachne_overlay"; el.setAttribute("role", "alert"); el.style.cssText = "position:fixed;inset:0;z-index:2147483647;margin:0;padding:24px;overflow:auto;background:#1b1b1f;color:#ffb4ab;font:13px/1.5 ui-monospace,monospace;white-space:pre-wrap"; document.body.appendChild(el); }
	el.textContent = "Build failed\\n\\n" + message;
};
const connect = () => {
	const ws = new WebSocket(url);
	ws.onopen = () => { if (state === "lost") location.reload(); state = "open"; };
	ws.onmessage = (event) => {
		const msg = JSON.parse(event.data);
		if (msg.type === "reload") location.reload();
		else if (msg.type === "error") overlay(msg.message);
		else if (msg.type === "css") {
			overlay(null);
			for (const link of document.querySelectorAll('link[rel="stylesheet"][href*="/assets/"]')) link.remove();
			for (const href of msg.styles) { const link = document.createElement("link"); link.rel = "stylesheet"; link.href = href; document.head.appendChild(link); }
		}
	};
	ws.onclose = () => { if (state === "open") state = "lost"; setTimeout(connect, 250); };
};
connect();
})();`;
}

/** Local files imported by `app/server.ts` (changes there need a restart). */
async function serverGraph(serverFile: string | undefined, root: string): Promise<Set<string>> {
	if (!serverFile) return new Set();
	const result = await Bun.build({
		entrypoints: [serverFile],
		root,
		target: "bun",
		metafile: true,
		plugins: [
			bunPlugin({ target: "ssr" }),
			{
				name: "arachne-local-only",
				setup(build) {
					build.onResolve({ filter: /^[^./]/ }, (args) => ({ path: args.path, external: true }));
				},
			},
		],
	} as Parameters<typeof Bun.build>[0]);
	const inputs =
		(result as { metafile?: { inputs?: Record<string, unknown> } }).metafile?.inputs ?? {};
	return new Set(Object.keys(inputs).map((path) => resolve(root, path)));
}

/** Options for {@link startDevServer}. */
export interface DevServerOptions {
	/** Project root. */
	root: string;
	/** Port. Default from config (3000). */
	port?: number;
	/** Called on watcher events (tests). */
	onEvent?: (event: { type: "reload" | "css" | "error" | "restart"; files: string[] }) => void;
}

/** A running dev server (the child process managed by {@link runDev}). */
export interface DevServer {
	/** URL it listens on. */
	url: string;
	/** Stop watching and serving. */
	stop: () => Promise<void>;
}

/**
 * Serve the app from source with hot reload. UI and CSS edits rebuild the
 * bundles in place and notify browsers over a WebSocket; edits to the
 * server's import graph (or the config) exit with {@link RESTART_CODE} so
 * the supervisor starts a fresh process.
 */
export async function startDevServer(options: DevServerOptions): Promise<DevServer> {
	const config = await resolveConfig(options.root);
	const base = config.base;
	const hmrPath = `${base}__arachne/hmr`;
	const sockets = new Set<ServerWebSocket<unknown>>();
	const broadcast = (message: unknown) => {
		const text = JSON.stringify(message);
		for (const socket of sockets) socket.send(text);
	};

	let app: AppServer | undefined;
	let bootError: string | undefined;
	try {
		app = await createAppServer({
			root: options.root,
			dev: true,
			inlineScript: devClientScript(base),
		});
	} catch (error) {
		bootError = (error as Error).stack ?? String(error);
		console.error(bootError);
	}
	const serverFiles = await serverGraph(config.serverFile, config.root).catch(
		() => new Set<string>(),
	);
	const configFiles = new Set(
		["arachne.config.ts", "arachne.config.js", "package.json"].map((f) => join(config.root, f)),
	);
	// Entry files decide the mode: creating or deleting one needs a fresh process.
	const entryFiles = [...ROUTES_FILES, ...SERVER_FILES].map((f) => join(config.appDir, f));
	const inUse = new Set([config.routesFile, config.serverFile]);
	const entryChanged = (file: string) =>
		entryFiles.includes(file) && existsSync(file) !== inUse.has(file);

	const server = Bun.serve({
		port: options.port ?? config.port,
		fetch(request, bun) {
			if (new URL(request.url).pathname === hmrPath && bun.upgrade(request, { data: undefined }))
				return undefined;
			if (!app) {
				const body = `<!doctype html><title>Build failed</title><pre>${(bootError ?? "").replace(/</g, "&lt;")}</pre><script>${devClientScript(base)}</script>`;
				return new Response(body, {
					status: 500,
					headers: { "content-type": "text/html;charset=utf-8" },
				});
			}
			return app.fetch(request);
		},
		websocket: {
			open: (socket) => {
				sockets.add(socket);
			},
			close: (socket) => {
				sockets.delete(socket);
			},
			message: () => {},
		},
	});

	let pending = new Set<string>();
	let timer: ReturnType<typeof setTimeout> | undefined;
	let building = Promise.resolve();
	const restart = (files: string[]) => {
		options.onEvent?.({ type: "restart", files });
		console.info(
			`[arachne] ${files.map((f) => relative(config.root, f)).join(", ")} changed, restarting…`,
		);
		process.exit(RESTART_CODE);
	};
	const flush = () => {
		const files = [...pending];
		pending = new Set();
		const needsRestart = (file: string) =>
			serverFiles.has(file) || configFiles.has(file) || entryChanged(file);
		if (files.some(needsRestart) || !app) return restart(files);
		const current = app;
		building = building.then(async () => {
			try {
				await current.rebuild();
				const cssOnly = files.every((file) => file.endsWith(".css"));
				if (cssOnly) {
					const html = await (await current.fetch(new Request(`http://localhost${base}`))).text();
					const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(
						(m) => m[1],
					);
					broadcast({ type: "css", styles });
					options.onEvent?.({ type: "css", files });
				} else {
					broadcast({ type: "reload" });
					options.onEvent?.({ type: "reload", files });
				}
			} catch (error) {
				const message = (error as Error).message;
				console.error(`[arachne] ${message}`);
				broadcast({ type: "error", message });
				options.onEvent?.({ type: "error", files });
			}
		});
	};
	const watcher: FSWatcher = watch(config.root, { recursive: true }, (_event, filename) => {
		if (!filename || IGNORED.test(filename)) return;
		pending.add(join(config.root, filename.split(sep).join("/")));
		if (timer) clearTimeout(timer);
		timer = setTimeout(flush, 40);
	});

	const url = `http://localhost:${server.port}${base}`;
	console.info(`[arachne] dev server on ${url}`);
	return {
		url,
		async stop() {
			watcher.close();
			server.stop(true);
			await app?.close();
		},
	};
}

/** Options for {@link runDev}. */
export interface RunDevOptions {
	/** Project root. */
	root: string;
	/** Port. */
	port?: number;
}

/**
 * The `arachne dev` supervisor: runs {@link startDevServer} in a child
 * process, restarts it when it asks to, and after a crash waits for the next
 * file change before starting again.
 */
export async function runDev(options: RunDevOptions): Promise<never> {
	const script = join(import.meta.dir, "dev-child.ts");
	const root = resolve(options.root);
	const args = [process.execPath, script, root, ...(options.port ? [String(options.port)] : [])];
	let waiting: FSWatcher | undefined;
	const start = () => {
		const child = Bun.spawn(args, { stdio: ["inherit", "inherit", "inherit"], cwd: root });
		const stop = () => child.kill();
		process.once("SIGINT", stop);
		process.once("SIGTERM", stop);
		void child.exited.then((code) => {
			process.off("SIGINT", stop);
			process.off("SIGTERM", stop);
			if (code === RESTART_CODE) return start();
			if (child.signalCode) process.exit(0);
			console.error("[arachne] dev server stopped; fix the error and save to restart");
			waiting = watch(root, { recursive: true }, (_event, filename) => {
				if (!filename || IGNORED.test(filename)) return;
				waiting?.close();
				start();
			});
		});
	};
	start();
	return new Promise<never>(() => {});
}
