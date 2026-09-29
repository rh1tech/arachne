import { For, Show } from "@arachne/render";
import { effect, signal } from "@arachne/signals";
import { Button } from "./button.tsx";
import { type SlotProps, setup } from "./system.ts";

export type DescriptionItem = {
	label: string;
	value: unknown;
};

export type DescriptionListSlot = "root" | "row" | "label" | "value";

export type DescriptionListProps = SlotProps<DescriptionListSlot> & {
	items: DescriptionItem[];
};

/**
 * Label / value pairs (`<dl>`).
 * Slots: `root` `row` `label` `value`.
 */
export function DescriptionList(input: DescriptionListProps) {
	const [props, rest, slot] = setup(
		"DescriptionList",
		input,
		{},
		["items"],
		"root" as DescriptionListSlot,
	);
	return (
		<dl {...rest} class={slot.class("root", "a-dl")} style={slot.style("root")}>
			<For each={props.items}>
				{(item) => (
					<div class={slot.class("row", "a-dl-row")} style={slot.style("row")}>
						<dt class={slot.class("label", "a-dl-label")} style={slot.style("label")}>
							{item.label}
						</dt>
						<dd class={slot.class("value", "a-dl-value")} style={slot.style("value")}>
							{item.value}
						</dd>
					</div>
				)}
			</For>
		</dl>
	);
}

export type StatSlot = "root" | "label" | "value" | "hint";

export type StatProps = SlotProps<StatSlot> & {
	label: string;
	value: unknown;
	hint?: string | undefined;
};

/**
 * Statistic with label, value and hint.
 * Slots: `root` `label` `value` `hint`.
 */
export function Stat(input: StatProps) {
	const [props, rest, slot] = setup(
		"Stat",
		input,
		{},
		["label", "value", "hint"],
		"root" as StatSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-stat")} style={slot.style("root")}>
			<p class={slot.class("label", "a-stat-label")} style={slot.style("label")}>
				{props.label}
			</p>
			<p class={slot.class("value", "a-stat-value")} style={slot.style("value")}>
				{props.value}
			</p>
			<Show when={props.hint}>
				<p class={slot.class("hint", "a-stat-hint")} style={slot.style("hint")}>
					{props.hint}
				</p>
			</Show>
		</div>
	);
}

export type CopyButtonProps = SlotProps<"root"> & {
	value: string;
	label?: string | undefined;
	copiedLabel?: string | undefined;
	variant?: "ghost" | "default" | "soft" | "outline" | "solid" | undefined;
	size?: "xs" | "sm" | "md" | "lg" | undefined;
};

const COPIED_MS = 1500;

/** Copies `value` to the clipboard. Renders a {@link Button}; `data-copied` while confirming. Slots: `root`. */
export function CopyButton(input: CopyButtonProps) {
	const [props, rest, slot] = setup("CopyButton", input, { variant: "ghost", size: "sm" }, [
		"value",
		"label",
		"copiedLabel",
		"variant",
		"size",
	]);
	const copied = signal(false);
	let timer: ReturnType<typeof setTimeout> | undefined;
	effect(() => () => clearTimeout(timer));

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(props.value);
			copied.set(true);
			clearTimeout(timer);
			timer = setTimeout(() => copied.set(false), COPIED_MS);
		} catch {
			copied.set(false);
		}
	};

	return (
		<Button
			{...rest}
			variant={props.variant}
			size={props.size}
			unstyled={props.unstyled}
			class={slot.class("root", "a-copy-button")}
			style={slot.style("root")}
			data-copied={copied() ? "" : undefined}
			onClick={() => {
				void copy();
			}}
		>
			{copied() ? (props.copiedLabel ?? "Copied") : (props.label ?? "Copy")}
		</Button>
	);
}
