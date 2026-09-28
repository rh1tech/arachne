import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface TempDir {
	path: string;
	[Symbol.asyncDispose](): Promise<void>;
}

export async function tempDir(prefix = "arachne-"): Promise<TempDir> {
	const path = await mkdtemp(join(tmpdir(), prefix));
	return {
		path,
		async [Symbol.asyncDispose]() {
			await rm(path, { recursive: true, force: true });
		},
	};
}
