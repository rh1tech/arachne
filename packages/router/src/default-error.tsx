/** @jsxImportSource @arachnejs/render */
// The pragma keeps this file on Arachne JSX when imported outside the package tsconfig (the MCP check).
import type { ErrorProps } from "./router.ts";

/**
 * The error page used when an app sets none: a failed load must never render
 * the page itself with no data. The error's own message is not shown, since
 * it can carry server detail; apps that want more pass `error`.
 */
export function DefaultErrorPage(props: ErrorProps) {
	const status = (props.error as { status?: unknown } | undefined)?.status;
	return (
		<div role="alert" data-arachne-error="">
			<p>{status === 404 ? "Not found" : "Something went wrong"}</p>
		</div>
	);
}
