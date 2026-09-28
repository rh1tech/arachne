import {
	type App,
	type Container,
	createApp,
	createConsoleLogger,
	type EventBus,
	type Logger,
	type Module,
} from "@arachne/core";

export interface TestApp {
	app: App;
	container: Container;
	bus: EventBus;
	logger: Logger;
	dispose: () => Promise<void>;
}

export interface CreateTestAppOptions {
	modules?: Module[];
	logger?: Logger;
}

export async function createTestApp(options: CreateTestAppOptions = {}): Promise<TestApp> {
	const logger =
		options.logger ??
		createConsoleLogger({
			level: "silent",
			name: "test",
		});
	const app = createApp({
		modules: options.modules ?? [],
		logger,
	});
	await app.boot();
	return {
		app,
		container: app.container,
		bus: app.bus,
		logger: app.logger,
		dispose: () => app.dispose(),
	};
}
