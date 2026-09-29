import { renderToString } from "@arachne/render/ssr";
import { usesShow } from "./uses-show.ts";

export const html = renderToString(() => (
	<p class="x">{usesShow({ when: true, children: "ok" }) as string}</p>
));
