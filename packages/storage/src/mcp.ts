import { defineMcpModule, jsonResult, textResult, toolName } from "@arachnejs/mcp";
import { z } from "zod";
import { assertKey, guessType } from "./storage.ts";

/** MCP tools for `@arachnejs/storage`. */
export const mcpModule = defineMcpModule({
	name: "storage",
	version: "0.0.1",
	tools: [
		{
			name: toolName("storage", "check_key"),
			description:
				"Check storage keys against the key rules (no traversal, empty segments, control chars) and show the guessed content type.",
			inputSchema: { keys: z.array(z.string()) },
			handler: (args) =>
				jsonResult(
					(args["keys"] as string[]).map((key) => {
						try {
							assertKey(key);
							return { key, valid: true, contentType: guessType(key) };
						} catch {
							return { key, valid: false };
						}
					}),
				),
		},
		{
			name: toolName("storage", "api_summary"),
			description: "Summarize @arachnejs/storage public API.",
			handler: () =>
				textResult(
					[
						"Storage: put(key, data, { contentType }) · get · head · exists · delete · list(prefix) · url(key, { expiresIn, method })",
						"Drivers: memoryStorage() · diskStorage({ root, baseUrl }) · s3Storage({ bucket, endpoint, … } | { client }) (Bun.S3Client: S3, R2, MinIO)",
						"saveUpload(storage, file, { prefix, maxSize, types }) → generated key, originalName kept as metadata",
						"toResponse(file, { download }) → streaming Response with safe Content-Disposition",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-storage-readme",
			uri: "arachne://storage/readme",
			mimeType: "text/markdown",
			read: async () => ({ text: await Bun.file(new URL("../README.md", import.meta.url)).text() }),
		},
	],
});

export default mcpModule;
