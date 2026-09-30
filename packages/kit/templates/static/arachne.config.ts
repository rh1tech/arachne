import { defineConfig } from "@arachne/kit";

export default defineConfig({
	// Pre-render every page to HTML; the client hydrates and routes without reloads.
	mode: "static",
	title: { template: "%s · Field Notes", default: "Field Notes" },
	styles: ["app/styles.css"],
	head: `<link rel="icon" href="%base%favicon.svg" type="image/svg+xml">`,
	siteUrl: "https://field-notes.example",
	// Set `base: "/field-notes/"` to deploy under a sub-path (e.g. GitHub Pages).
	// Set `hydrate: false` to ship zero JavaScript.
});
