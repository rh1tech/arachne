import { render } from "@arachne/render";
import { signal } from "@arachne/signals";
import { addMonths, calendarKeyTarget } from "../data-widgets.tsx";
import { Calendar, DatePicker, TransferList, Tree } from "../index.ts";

export function run(root: HTMLElement) {
	const tree = signal<string | undefined>(undefined);
	const day = signal("2026-09-29");
	const guarded = signal<string | undefined>(undefined);
	const picked = signal("2026-09-29");
	const left = signal(["alpha", "beta", "gamma"]);
	const right = signal<string[]>([]);
	const query = signal("");
	const rich = signal<string | undefined>(undefined);
	const toggles: string[] = [];

	const dispose = render(
		() => (
			<div>
				<Tree
					data-test="tree"
					label="Files"
					value={tree()}
					onChange={(id) => tree.set(id)}
					data={[
						{
							id: "src",
							label: "src",
							children: [
								{ id: "app", label: "app.ts" },
								{ id: "lib", label: "lib", children: [{ id: "util", label: "util.ts" }] },
							],
						},
						{ id: "readme", label: "README.md" },
					]}
				/>
				<Tree
					data-test="rich"
					label="Rich"
					icons="auto"
					filter={query()}
					value={rich()}
					onChange={(id) => rich.set(id)}
					onToggle={(id, open) => toggles.push(`${id}:${open}`)}
					data={[
						{
							id: "pkgs",
							label: "packages",
							badge: 2,
							children: [
								{ id: "ui", label: "ui.tsx" },
								{ id: "forms", label: "forms.tsx", disabled: true },
							],
						},
						{
							id: "docs",
							label: "docs",
							children: [{ id: "guide", label: "guide.md", icon: "info" }],
						},
					]}
				/>
				<Calendar data-test="cal" locale="en-GB" value={day()} onChange={(iso) => day.set(iso)} />
				<Calendar
					data-test="guarded"
					locale="en-GB"
					weekStartsOn={1}
					value={guarded()}
					min="2026-09-10"
					max="2026-09-25"
					isDateDisabled={(iso) => iso === "2026-09-15"}
					onChange={(iso) => guarded.set(iso)}
				/>
				<Calendar data-test="today" />
				<DatePicker data-test="picker" value={picked()} onChange={(iso) => picked.set(iso)} />
				<TransferList
					data-test="transfer"
					left={left()}
					right={right()}
					onChange={(next) => {
						left.set(next.left);
						right.set(next.right);
					}}
				/>
			</div>
		),
		root,
	);

	return {
		query,
		rich,
		toggles,
		dispose,
		tree,
		day,
		guarded,
		picked,
		left,
		right,
		addMonths,
		calendarKeyTarget,
	};
}
