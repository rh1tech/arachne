import { expect, test } from "bun:test";
import { mcpModule } from "./mcp.ts";

test("check_key reports safe and unsafe keys", async () => {
	const tool = mcpModule.tools?.find((t) => t.name === "arachne_storage_check_key");
	const result = await tool?.handler({ keys: ["avatars/a.png", "../x", "a//b"] });
	expect(JSON.parse(result?.content[0]?.type === "text" ? result.content[0].text : "null")).toEqual(
		[
			{ key: "avatars/a.png", valid: true, contentType: "image/png" },
			{ key: "../x", valid: false },
			{ key: "a//b", valid: false },
		],
	);
});
