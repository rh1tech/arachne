import { Show } from "@arachnejs/render";
import { type BaseProps, type SlotProps, setup } from "./system.ts";

export type AvatarSlot = "root" | "image" | "fallback";

export type AvatarProps = SlotProps<AvatarSlot> & {
	/** Image URL; falls back to initials from `name` when missing or broken. */
	src?: string | undefined;
	/** Image alt text (default: `name`). */
	alt?: string | undefined;
	/** Person's name: used for initials and as the accessible name. */
	name?: string | undefined;
	/** Avatar size. */
	size?: "sm" | "md" | "lg" | undefined;
};

function initials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length === 0) return "?";
	if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "?").toUpperCase();
	return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

/** Picture or initials. Slots: `root` `image` `fallback`. State: `data-size`. */
export function Avatar(input: AvatarProps) {
	const [props, rest, slot] = setup(
		"Avatar",
		input,
		{ size: "md" },
		["src", "alt", "name", "size"],
		"root" as AvatarSlot,
	);
	return (
		<span
			aria-label={props.alt ?? props.name ?? "Avatar"}
			{...rest}
			class={slot.class("root", "a-avatar", `a-avatar-${props.size}`)}
			style={slot.style("root")}
			role="img"
			data-size={props.size}
		>
			<Show
				when={props.src}
				fallback={
					<span class={slot.class("fallback", "a-avatar-fallback")} style={slot.style("fallback")}>
						{initials(props.name ?? "?")}
					</span>
				}
			>
				<img
					class={slot.class("image", "a-avatar-img")}
					style={slot.style("image")}
					src={props.src}
					alt=""
				/>
			</Show>
		</span>
	);
}

export type EmptyStateSlot = "root" | "title" | "description" | "action";

export type EmptyStateProps = SlotProps<EmptyStateSlot> & {
	/** Headline, e.g. "No projects yet". */
	title: unknown;
	/** Explanation under the title. */
	description?: unknown;
	/** Call to action, e.g. a `Button`. */
	action?: unknown;
	/** Extra content below the description. */
	children?: unknown;
};

/** Placeholder for empty lists. Slots: `root` `title` `description` `action`. */
export function EmptyState(input: EmptyStateProps) {
	const [props, rest, slot] = setup(
		"EmptyState",
		input,
		{},
		["title", "description", "action", "children"],
		"root" as EmptyStateSlot,
	);
	return (
		<div {...rest} class={slot.class("root", "a-empty")} style={slot.style("root")} role="status">
			<p class={slot.class("title", "a-empty-title")} style={slot.style("title")}>
				{props.title}
			</p>
			<Show when={props.description}>
				<p class={slot.class("description", "a-empty-desc")} style={slot.style("description")}>
					{props.description}
				</p>
			</Show>
			<Show when={props.action}>
				<div class={slot.class("action", "a-empty-action")} style={slot.style("action")}>
					{props.action}
				</div>
			</Show>
			{props.children}
		</div>
	);
}

export type KbdProps = BaseProps & {
	/** Key or key combination text, e.g. `⌘K`. */
	children?: unknown;
};

/** Keyboard key. Slots: `root`. */
export function Kbd(input: KbdProps) {
	const [props, rest, slot] = setup("Kbd", input, {}, ["children"]);
	return (
		<kbd {...rest} class={slot.class("root", "a-kbd")} style={slot.style("root")}>
			{props.children}
		</kbd>
	);
}

export type CodeProps = BaseProps & {
	/** Inline code. */
	children?: unknown;
};

/** Inline code. Slots: `root`. */
export function Code(input: CodeProps) {
	const [props, rest, slot] = setup("Code", input, {}, ["children"]);
	return (
		<code {...rest} class={slot.class("root", "a-code")} style={slot.style("root")}>
			{props.children}
		</code>
	);
}
