import { For, Show } from "@arachne/render";
import { signal } from "@arachne/signals";
import { Icon, type IconName } from "./icons.tsx";
import { type BaseProps, createId, type SlotProps, setup } from "./system.ts";

export type FileButtonSlot = "root" | "input" | "label";

export type FileButtonProps = SlotProps<FileButtonSlot> & {
	accept?: string | undefined;
	multiple?: boolean | undefined;
	disabled?: boolean | undefined;
	onChange: (files: File[]) => void;
	children?: unknown;
};

/** Hidden file input triggered by a button (Mantine FileButton). Slots: `root` `input` `label`. */
export function FileButton(input: FileButtonProps) {
	const [props, rest, slot] = setup(
		"FileButton",
		input,
		{},
		["accept", "multiple", "disabled", "onChange", "children", "id"],
		"root" as FileButtonSlot,
	);
	const inputId = `${createId("filebtn", props.id)}-input`;
	return (
		<span
			{...rest}
			id={props.id}
			class={slot.class("root", "a-file-button")}
			style={slot.style("root")}
			data-disabled={props.disabled ? "" : undefined}
		>
			<input
				id={inputId}
				type="file"
				class={slot.class("input", "a-sr-only")}
				accept={props.accept}
				multiple={props.multiple}
				disabled={props.disabled}
				onChange={(e: Event) => {
					const el = e.target as HTMLInputElement;
					const list = el.files ? Array.from(el.files) : [];
					props.onChange(list);
					el.value = "";
				}}
			/>
			<label
				for={inputId}
				class={slot.class(
					"label",
					"a-btn",
					"a-btn-ghost",
					"a-btn-sm",
					"a-file-button-label",
					props.disabled && "a-file-button-disabled",
				)}
				style={slot.style("label")}
			>
				{props.children ?? "Choose file"}
			</label>
		</span>
	);
}

export type DropzoneSlot = "root" | "input" | "label";

export type DropzoneProps = SlotProps<DropzoneSlot> & {
	accept?: string | undefined;
	multiple?: boolean | undefined;
	disabled?: boolean | undefined;
	onDrop: (files: File[]) => void;
	children?: unknown;
};

/**
 * Does `file` match an `accept` attribute (`image/*`, `.pdf`, `application/json`)?
 * An empty / missing `accept` matches everything.
 */
export function matchesAccept(
	file: { name: string; type: string },
	accept?: string | undefined,
): boolean {
	if (!accept?.trim()) return true;
	const name = file.name.toLowerCase();
	const type = (file.type || "").toLowerCase();
	return accept
		.split(",")
		.map((part) => part.trim().toLowerCase())
		.filter(Boolean)
		.some((rule) => {
			if (rule.startsWith(".")) return name.endsWith(rule);
			if (rule.endsWith("/*")) return type.startsWith(rule.slice(0, -1));
			return type === rule;
		});
}

/**
 * Drag-and-drop file target (also a click-to-browse file input).
 * Slots: `root` `input` `label`. State: `data-active`, `data-disabled`.
 */
export function Dropzone(input: DropzoneProps) {
	const [props, rest, slot] = setup(
		"Dropzone",
		input,
		{},
		["accept", "multiple", "disabled", "onDrop", "children", "id"],
		"root" as DropzoneSlot,
	);
	const active = signal(false);
	const inputId = `${createId("drop", props.id)}-input`;
	// dragenter/dragleave fire for every child; count depth so hovering the
	// label or icon doesn't flicker the active state.
	let depth = 0;

	const take = (list: FileList | File[] | null | undefined) => {
		if (!list?.length || props.disabled) return;
		const files = Array.from(list).filter((f) => matchesAccept(f, props.accept));
		const picked = props.multiple ? files : files.slice(0, 1);
		if (picked.length) props.onDrop(picked);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drag target; keyboard users use the labelled file input inside
		<div
			{...rest}
			id={props.id}
			class={slot.class(
				"root",
				"a-dropzone",
				active() && "a-dropzone-active",
				props.disabled && "a-dropzone-disabled",
			)}
			style={slot.style("root")}
			data-active={active() ? "" : undefined}
			data-disabled={props.disabled ? "" : undefined}
			onDragEnter={(e: DragEvent) => {
				e.preventDefault();
				depth += 1;
				if (!props.disabled) active.set(true);
			}}
			onDragOver={(e: DragEvent) => e.preventDefault()}
			onDragLeave={() => {
				depth = Math.max(0, depth - 1);
				if (depth === 0) active.set(false);
			}}
			onDrop={(e: DragEvent) => {
				e.preventDefault();
				depth = 0;
				active.set(false);
				take(e.dataTransfer?.files);
			}}
		>
			<input
				id={inputId}
				type="file"
				class={slot.class("input", "a-sr-only")}
				accept={props.accept}
				multiple={props.multiple}
				disabled={props.disabled}
				onChange={(e: Event) => {
					const el = e.target as HTMLInputElement;
					take(el.files);
					// Reset so choosing the same file again still fires `change`.
					el.value = "";
				}}
			/>
			<label
				for={inputId}
				class={slot.class("label", "a-dropzone-label")}
				style={slot.style("label")}
			>
				{props.children ?? (
					<>
						<Icon name="upload" size="lg" />
						<span>Drop files here or click to browse</span>
					</>
				)}
			</label>
		</div>
	);
}

export type SubnavItem = {
	id: string;
	label: unknown;
	disabled?: boolean | undefined;
};

export type SubnavSlot = "root" | "item";

export type SubnavProps = SlotProps<SubnavSlot> & {
	items: SubnavItem[];
	value: string;
	onChange: (id: string) => void;
	/** Accessible name (default "Sub navigation"). */
	label?: string | undefined;
};

/** Compact pill/sub navigation (UIkit subnav). Slots: `root` `item`. */
export function Subnav(input: SubnavProps) {
	const [props, rest, slot] = setup(
		"Subnav",
		input,
		{},
		["items", "value", "onChange", "label"],
		"root" as SubnavSlot,
	);
	return (
		<nav
			aria-label={props.label ?? "Sub navigation"}
			{...rest}
			class={slot.class("root", "a-subnav")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class(
								"item",
								"a-subnav-item",
								active() && "a-subnav-item-active",
								item.disabled && "a-subnav-item-disabled",
							)}
							style={slot.style("item")}
							aria-current={active() ? "page" : undefined}
							data-state={active() ? "active" : "inactive"}
							disabled={item.disabled}
							onClick={() => props.onChange(item.id)}
						>
							{item.label}
						</button>
					);
				}}
			</For>
		</nav>
	);
}

export type IconnavItem = {
	id: string;
	icon: IconName;
	label: string;
};

export type IconnavSlot = "root" | "item";

export type IconnavProps = SlotProps<IconnavSlot> & {
	items: IconnavItem[];
	value?: string | undefined;
	onChange?: ((id: string) => void) | undefined;
	/** Accessible name (default "Icon navigation"). */
	label?: string | undefined;
};

/** Icon-only navigation. Slots: `root` `item`. */
export function Iconnav(input: IconnavProps) {
	const [props, rest, slot] = setup(
		"Iconnav",
		input,
		{},
		["items", "value", "onChange", "label"],
		"root" as IconnavSlot,
	);
	return (
		<nav
			aria-label={props.label ?? "Icon navigation"}
			{...rest}
			class={slot.class("root", "a-iconnav")}
			style={slot.style("root")}
		>
			<For each={props.items}>
				{(item) => {
					const active = () => props.value === item.id;
					return (
						<button
							type="button"
							class={slot.class("item", "a-iconnav-item", active() && "a-iconnav-item-active")}
							style={slot.style("item")}
							aria-label={item.label}
							aria-current={active() ? "page" : undefined}
							data-state={active() ? "active" : "inactive"}
							title={item.label}
							onClick={() => props.onChange?.(item.id)}
						>
							<Icon name={item.icon} />
						</button>
					);
				}}
			</For>
		</nav>
	);
}

export type NavigationProgressSlot = "root" | "bar";

export type NavigationProgressProps = SlotProps<NavigationProgressSlot> & {
	visible: boolean;
	/** 0–100; omit for indeterminate. */
	value?: number | undefined;
	/** Accessible name (default "Loading"). */
	label?: string | undefined;
};

/** Top loading bar (Mantine NavigationProgress / NProgress). Slots: `root` `bar`. */
export function NavigationProgress(input: NavigationProgressProps) {
	const [props, rest, slot] = setup(
		"NavigationProgress",
		input,
		{},
		["visible", "value", "label"],
		"root" as NavigationProgressSlot,
	);
	const indeterminate = () => props.value == null || !Number.isFinite(props.value);
	const width = () => Math.max(0, Math.min(100, props.value ?? 30));
	return (
		<Show when={props.visible}>
			<div
				aria-label={props.label ?? "Loading"}
				{...rest}
				class={slot.class(
					"root",
					"a-nav-progress",
					indeterminate() && "a-nav-progress-indeterminate",
				)}
				style={slot.style("root")}
				data-state={indeterminate() ? "indeterminate" : "determinate"}
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={indeterminate() ? undefined : width()}
			>
				<div
					class={slot.class("bar", "a-nav-progress-bar")}
					style={slot.style(
						"bar",
						indeterminate() ? undefined : { "--a-progress": String(width() / 100) },
					)}
				/>
			</div>
		</Show>
	);
}

export type NumberFormatterProps = BaseProps & {
	value: number;
	prefix?: string | undefined;
	suffix?: string | undefined;
	thousandSeparator?: string | undefined;
	decimalScale?: number | undefined;
};

/**
 * Formats a number with separators, decimals, prefix and suffix.
 * Slots: `root`.
 */
export function NumberFormatter(input: NumberFormatterProps) {
	const [props, rest, slot] = setup("NumberFormatter", input, {}, [
		"value",
		"prefix",
		"suffix",
		"thousandSeparator",
		"decimalScale",
	]);
	const text = () => {
		const scale = Math.max(0, Math.min(20, props.decimalScale ?? 0));
		const sep = props.thousandSeparator ?? ",";
		if (!Number.isFinite(props.value)) return "—";
		const [intPart, dec] = props.value.toFixed(scale).split(".");
		const grouped = (intPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, sep);
		return `${props.prefix ?? ""}${grouped}${dec != null && scale > 0 ? `.${dec}` : ""}${props.suffix ?? ""}`;
	};
	return (
		<span {...rest} class={slot.class("root", "a-number-formatter")} style={slot.style("root")}>
			{text()}
		</span>
	);
}
