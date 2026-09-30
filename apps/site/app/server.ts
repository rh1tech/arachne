import { defineServer } from "@arachne/kit";
import { HttpError } from "@arachne/server";
import { loadDoc, loadHome } from "./content/docs.ts";
import { ENTRIES } from "./nav.ts";

const doc = async ({ url }: { url: URL }) => {
	const page = await loadDoc(url.pathname);
	if (!page) throw new HttpError(404, `No manual entry for ${url.pathname}`);
	return page;
};

/**
 * Static site: this runs at build time only. Every documentation page is
 * rendered from the repository's Markdown; `paths` lists them for the
 * prerenderer.
 */
export default defineServer({
	loaders: {
		"/": () => loadHome(),
		"/docs": doc,
		"/docs/*slug": doc,
	},
	paths: {
		"/docs/*slug": () =>
			ENTRIES.filter((entry) => entry.path !== "/docs").map((entry) => ({
				slug: entry.path.slice("/docs/".length),
			})),
	},
});
