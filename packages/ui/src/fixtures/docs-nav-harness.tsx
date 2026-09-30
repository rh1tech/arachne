import { clearDelegatedEvents, delegateEvents, render, Show } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { DocMenu } from "../index.ts";

const page = signal("overview");

function renderPage(id: string) {
	if (id === "overview") return <p data-page="overview">OVERVIEW</p>;
	if (id === "button") return <p data-page="button">BUTTON</p>;
	return <p data-page="other">OTHER</p>;
}

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click"]);
	render(
		() => (
			<div>
				<DocMenu
					value={page()}
					onChange={(id) => page.set(id)}
					defaultOpen={["elements"]}
					sections={[
						{ id: "overview", label: "Overview" },
						{
							id: "elements",
							label: "Elements",
							items: [
								{ id: "button", label: "Button" },
								{ id: "box", label: "Box" },
							],
						},
					]}
				/>
				<Show when={page()} fallback={null}>
					{(id: string) => renderPage(id)}
				</Show>
			</div>
		),
		root,
	);
	return {
		clickLabel: (label: string) => {
			const btn = [...root.querySelectorAll("button")].find((b) => b.textContent?.trim() === label);
			(btn as HTMLElement | undefined)?.click();
		},
		page: () => root.querySelector("[data-page]")?.getAttribute("data-page"),
	};
}
