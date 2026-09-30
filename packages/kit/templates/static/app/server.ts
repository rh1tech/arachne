import { defineServer } from "@arachnejs/kit";
import { HttpError } from "@arachnejs/server";
import { findPost, posts } from "./content.ts";

/**
 * For static sites this runs at build time only: loaders provide page data
 * (saved as JSON for client navigations) and `paths` lists which dynamic
 * pages to pre-render.
 */
export default defineServer({
	loaders: {
		"/": () => ({ latest: posts.slice(0, 2) }),
		"/blog": () => ({ posts }),
		"/blog/:slug": ({ params }) => {
			const post = findPost(params["slug"] ?? "");
			if (!post) throw new HttpError(404, "Post not found");
			return post;
		},
	},
	paths: {
		"/blog/:slug": () => posts.map((post) => ({ slug: post.slug })),
	},
});
