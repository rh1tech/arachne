import { render } from "@arachne/render";
import { signal } from "@arachne/signals";
import { createNavbarController, Navbar } from "../index.ts";

export function run(root: HTMLElement) {
	const ctrl = createNavbarController();
	const picked = signal("");
	const dispose = render(
		() => (
			<Navbar
				ctrl={ctrl}
				trigger="click"
				brand={<span>Brand</span>}
				items={[
					{ id: "docs", label: "Docs", onSelect: () => picked.set("docs") },
					{
						id: "product",
						label: "Product",
						children: [
							{ id: "signals", label: "Signals", onSelect: () => picked.set("signals") },
							{
								id: "jsx",
								label: "JSX",
								children: [{ id: "deep", label: "Deep", onSelect: () => picked.set("deep") }],
							},
						],
					},
					{ id: "blog", label: "Blog", onSelect: () => picked.set("blog") },
				]}
			/>
		),
		root,
	);
	return {
		dispose: () => {
			dispose();
			ctrl.dispose();
		},
		ctrl,
		picked,
	};
}
