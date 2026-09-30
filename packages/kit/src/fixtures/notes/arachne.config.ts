import { defineConfig } from "../../index.ts";

export default defineConfig({
	title: { template: "%s · Notes", default: "Notes" },
	styles: ["app/styles.css"],
	siteUrl: "https://notes.test",
});
