import { For, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { Badge, Button, Tabs, TextInput } from "../index.ts";

/** Mount N rows of kit components, then update every row once. */
export function bench(root: HTMLElement, n: number) {
	const rows = signal(Array.from({ length: n }, (_, i) => ({ id: i, label: `Row ${i}` })));
	const tick = signal(0);
	const t0 = performance.now();
	const dispose = render(
		() => (
			<ul>
				<For each={rows()}>
					{(row) => (
						<li>
							<Button size="sm" data-id={row.id}>
								{row.label} {tick()}
							</Button>
							<Badge>{row.id}</Badge>
							<TextInput value={row.label} />
						</li>
					)}
				</For>
			</ul>
		),
		root,
	);
	const mount = performance.now() - t0;
	const t1 = performance.now();
	tick.set(1);
	const update = performance.now() - t1;
	const t2 = performance.now();
	const tabs = render(
		() => (
			<div>
				<For each={Array.from({ length: n / 10 }, (_, i) => i)}>
					{(i) => (
						<Tabs
							value="a"
							onChange={() => {}}
							items={[
								{ id: "a", label: `A${i}` },
								{ id: "b", label: "B" },
							]}
						/>
					)}
				</For>
			</div>
		),
		document.createElement("div"),
	);
	const tabsMount = performance.now() - t2;
	const t3 = performance.now();
	dispose();
	tabs();
	const unmount = performance.now() - t3;
	return { mount, update, tabsMount, unmount, nodes: root.querySelectorAll("*").length };
}
