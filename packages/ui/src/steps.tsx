import { For, Show } from "@arachne/render";
import { type SlotProps, setup } from "./system.ts";

export type StepItem = {
	id: string;
	label: string;
	description?: string | undefined;
};

export type StepsSlot = "root" | "step" | "button" | "index" | "copy" | "label" | "description";

export type StepsProps = SlotProps<StepsSlot> & {
	items: StepItem[];
	/** Current step id (active). Prior steps are complete. */
	value: string;
	onChange?: ((id: string) => void) | undefined;
	/** Accessible name (default "Progress"). */
	label?: string | undefined;
};

/**
 * Step indicator. Slots: `root` `step` `button` `index` `copy` `label`
 * `description`. Steps expose `data-state` (`complete` | `current` | `upcoming`).
 */
export function Steps(input: StepsProps) {
	const [props, rest, slot] = setup(
		"Steps",
		input,
		{},
		["items", "value", "onChange", "label"],
		"root" as StepsSlot,
	);
	const activeIndex = () => {
		const i = props.items.findIndex((s) => s.id === props.value);
		return i < 0 ? 0 : i;
	};

	return (
		<ol
			aria-label={props.label ?? "Progress"}
			{...rest}
			class={slot.class("root", "a-steps")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item, index) => {
					const state = () => {
						const active = activeIndex();
						if (index() < active) return "complete";
						if (index() === active) return "current";
						return "upcoming";
					};
					const clickable = () => Boolean(props.onChange);
					const copy = () => (
						<>
							<span class={slot.class("index", "a-step-index")} aria-hidden="true">
								{state() === "complete" ? "✓" : index() + 1}
							</span>
							<span class={slot.class("copy", "a-step-copy")}>
								<span class={slot.class("label", "a-step-label")}>{item.label}</span>
								<Show when={item.description}>
									<span class={slot.class("description", "a-step-desc")}>{item.description}</span>
								</Show>
							</span>
						</>
					);
					return (
						<li
							class={slot.class(
								"step",
								"a-step",
								`a-step-${state()}`,
								clickable() && "a-step-clickable",
							)}
							style={slot.style("step")}
							aria-current={state() === "current" ? "step" : undefined}
							data-state={state()}
						>
							{clickable() ? (
								<button
									type="button"
									class={slot.class("button", "a-step-btn")}
									style={slot.style("button")}
									onClick={() => props.onChange?.(item.id)}
								>
									{copy()}
								</button>
							) : (
								<div class={slot.class("button", "a-step-btn")} style={slot.style("button")}>
									{copy()}
								</div>
							)}
						</li>
					);
				}}
			</For>
		</ol>
	);
}
