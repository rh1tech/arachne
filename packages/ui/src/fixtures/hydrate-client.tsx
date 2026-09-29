import { hydrate } from "@arachne/render";
import { App, clicks, tab } from "./hydrate-app.tsx";

export function run(root: HTMLElement) {
	const dispose = hydrate(() => <App />, root);
	return { dispose, tab, clicks };
}
