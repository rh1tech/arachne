import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import { DocMenu, Icon } from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click"]);

	const page = signal("panel");

	render(
		() => (
			<DocMenu
				brand={
					<span>
						<Icon name="code" size="sm" /> CSS Library
					</span>
				}
				value={page()}
				onChange={(id) => page.set(id)}
				sections={[
					{
						id: "elements",
						label: "Elements",
						items: [
							{ id: "block", label: "Block" },
							{ id: "box", label: "Box" },
						],
					},
					{
						id: "components",
						label: "Components",
						items: [
							{ id: "card", label: "Card" },
							{ id: "panel", label: "Panel" },
							{ id: "modal", label: "Modal" },
						],
					},
					{ id: "form", label: "Form" },
				]}
			/>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel) ?? document.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
		text: () => root.textContent ?? "",
	};
}
