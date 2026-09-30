/**
 * DOM walkers the JSX compiler emits in dev mode (`dev: true`). They behave
 * like `firstChild` / `nextSibling` but check the node against the tag the
 * template expects, so hydration mismatches show up as warnings instead of
 * obscure errors later.
 */

function check(node: Node | null, expected: string | undefined, where: string): void {
	if (!expected) return;
	const found = node?.nodeName.toLowerCase();
	if (found === expected) return;
	console.warn(
		`[arachne] ${where}: expected <${expected}> but found ${found ? `<${found}>` : "nothing"}. ` +
			"Server and client probably rendered different markup (hydration mismatch).",
	);
}

/** `node.firstChild`, warning when it is not a `<expected>` element (dev builds). */
export function getFirstChild(node: Node, expected?: string): Node | null {
	const child = node.firstChild;
	check(child, expected, "first child");
	return child;
}

/** `node.nextSibling`, warning when it is not a `<expected>` element (dev builds). */
export function getNextSibling(node: Node, expected?: string): Node | null {
	const sibling = node.nextSibling;
	check(sibling, expected, "next sibling");
	return sibling;
}
