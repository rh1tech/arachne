import { renderToString, type SSRPayload } from "@arachne/render/ssr";
import { App } from "./hydrate-app.tsx";

export const html = (): string => renderToString(() => (<App />) as SSRPayload);
