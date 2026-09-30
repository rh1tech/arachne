/**
 * Identifies a client build: changes when the browser code or stylesheets
 * change (their content-hashed URLs), not when only page data does. Page
 * data carries it so an open tab can tell it is running an older build.
 */
export function buildIdOf(client: {
	entry?: string | undefined;
	styles: readonly string[];
}): string {
	return Bun.hash([client.entry ?? "", ...client.styles].join("\n")).toString(36);
}
