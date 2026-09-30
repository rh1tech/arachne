import { defineConfig } from "@arachne/kit";

export default defineConfig({
	// No pages: only the HTTP API (with OpenAPI docs at /docs).
	mode: "api",
	// Routes marked `mcp: true` become MCP tools on POST /mcp (use a Bearer API token).
	mcp: { name: "projects-api", version: "1.0.0" },
	server: { bodyLimit: 20 * 1024 * 1024 },
});
