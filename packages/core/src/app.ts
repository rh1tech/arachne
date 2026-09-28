import { Container } from "./container.ts";
import { ModuleError } from "./errors.ts";
import { EventBus } from "./events.ts";
import { createConsoleLogger, type Logger } from "./logger.ts";
import type { Module } from "./module.ts";
import { createToken } from "./token.ts";

export const LoggerToken = createToken<Logger>("arachne.Logger");
export const EventBusToken = createToken<EventBus>("arachne.EventBus");

export interface AppOptions {
	modules: Module[];
	logger?: Logger;
}

export interface App {
	readonly container: Container;
	readonly bus: EventBus;
	readonly logger: Logger;
	boot(): Promise<void>;
	dispose(): Promise<void>;
}

function flattenModules(roots: Module[]): Module[] {
	const seen = new Set<Module>();
	const visiting = new Set<Module>();
	const ordered: Module[] = [];

	const visit = (mod: Module): void => {
		if (seen.has(mod)) return;
		if (visiting.has(mod)) {
			throw new ModuleError(`Module import cycle detected at "${mod.name}"`);
		}
		visiting.add(mod);
		for (const dep of mod.imports ?? []) {
			visit(dep);
		}
		visiting.delete(mod);
		seen.add(mod);
		ordered.push(mod);
	};

	for (const root of roots) {
		visit(root);
	}
	return ordered;
}

export function createApp(options: AppOptions): App {
	const ordered = flattenModules(options.modules);
	const logger = options.logger ?? createConsoleLogger({ name: "arachne" });
	const bus = new EventBus();
	const container = new Container();

	container.register({ token: LoggerToken, useValue: logger });
	container.register({ token: EventBusToken, useValue: bus });

	for (const mod of ordered) {
		for (const provider of mod.providers ?? []) {
			container.register(provider);
		}
	}

	let booted = false;
	const ctx = { container, bus, logger };

	return {
		container,
		bus,
		logger,
		async boot() {
			if (booted) return;
			for (const mod of ordered) {
				await mod.setup?.(ctx);
			}
			booted = true;
			bus.emit("app:booted");
		},
		async dispose() {
			if (!booted) return;
			for (const mod of [...ordered].reverse()) {
				await mod.dispose?.(ctx);
			}
			booted = false;
			bus.emit("app:disposed");
		},
	};
}
