import { defineConfig } from "@arachne/kit";
import { SITE } from "./app/site.ts";

const preload = (file: string) =>
	`<link rel="preload" href="%base%fonts/${file}" as="font" type="font/woff2" crossorigin>`;

export default defineConfig({
	// Every page is pre-rendered from the repository's Markdown at build time.
	mode: "static",
	title: { template: "%s · Arachne", default: "Arachne — static sites, apps and APIs on Bun" },
	styles: [
		"app/styles/tokens.css",
		"app/styles/base.css",
		"app/styles/home.css",
		"app/styles/docs.css",
	],
	head: [
		`<link rel="icon" href="%base%favicon.svg" type="image/svg+xml">`,
		`<meta name="color-scheme" content="light dark">`,
		`<meta property="og:site_name" content="Arachne">`,
		`<meta property="og:type" content="website">`,
		preload("plex-sans-400.woff2"),
		preload("plex-mono-400.woff2"),
	].join(""),
	siteUrl: SITE.url,
});
