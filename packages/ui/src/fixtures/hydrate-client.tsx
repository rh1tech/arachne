import { hydrate } from "@arachnejs/render";
import { App, clicks, picked, tab } from "./hydrate-app.tsx";

export function run(root: HTMLElement) {
	const dispose = hydrate(() => <App />, root);
	return { dispose, tab, clicks, picked };
}
