/** Child process for `arachne dev`: `bun dev-child.ts <root> [port]`. */
import { startDevServer } from "./dev.ts";

const [root = process.cwd(), port] = process.argv.slice(2);
await startDevServer({ root, ...(port ? { port: Number(port) } : {}) });
