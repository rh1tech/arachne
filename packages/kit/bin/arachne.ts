#!/usr/bin/env bun
/** The `arachne` command. */
import { main } from "../src/cli.ts";

try {
	process.exitCode = await main(process.argv.slice(2));
} catch (error) {
	console.error(`arachne: ${(error as Error).message}`);
	process.exitCode = 1;
}
