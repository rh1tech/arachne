import { renderToString, type SSRPayload } from "@arachnejs/render/ssr";
import { App } from "./hydrate-app.tsx";

export const html = (): string => renderToString(() => (<App />) as SSRPayload);
