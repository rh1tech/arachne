import type { Container, Provider } from "./container.ts";
import type { EventBus } from "./events.ts";
import type { Logger } from "./logger.ts";

export interface ModuleContext {
	container: Container;
	bus: EventBus;
	logger: Logger;
}

export interface ModuleDefinition {
	name: string;
	providers?: Provider[];
	imports?: ModuleDefinition[];
	setup?: (ctx: ModuleContext) => void | Promise<void>;
	dispose?: (ctx: ModuleContext) => void | Promise<void>;
}

export type Module = Readonly<ModuleDefinition>;

export function defineModule(definition: ModuleDefinition): Module {
	return Object.freeze({
		name: definition.name,
		providers: definition.providers ? [...definition.providers] : [],
		imports: definition.imports ? [...definition.imports] : [],
		...(definition.setup ? { setup: definition.setup } : {}),
		...(definition.dispose ? { dispose: definition.dispose } : {}),
	});
}
