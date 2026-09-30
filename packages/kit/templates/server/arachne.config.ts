import { defineConfig } from "@arachne/kit";

export default defineConfig({
	// SSR pages + API + accounts on a Bun server.
	mode: "server",
	title: { template: "%s · Notebook", default: "Notebook" },
	styles: ["app/styles.css"],
	head: `<link rel="icon" href="%base%favicon.svg" type="image/svg+xml">`,
	// Expose API routes marked `mcp: true` as MCP tools on /mcp (Bearer API tokens apply).
	mcp: { name: "notebook", version: "1.0.0" },
});
