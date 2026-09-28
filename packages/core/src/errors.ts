export class ArachneError extends Error {
	override name = "ArachneError";

	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
	}
}

export class ResolutionError extends ArachneError {
	override name = "ResolutionError";
}

export class ModuleError extends ArachneError {
	override name = "ModuleError";
}
