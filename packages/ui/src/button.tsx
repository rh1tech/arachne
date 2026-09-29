import { omitProps } from "@arachne/render";
import { Icon } from "./icons.tsx";
import { createSlots, type SlotProps, withDefaults } from "./system.ts";

export type ButtonVariant =
	| "solid"
	| "default"
	| "soft"
	| "outline"
	| "ghost"
	| "link"
	| "danger"
	| "warning"
	| "success"
	| undefined;

export type ButtonSlot = "root" | "label" | "start" | "end" | "spinner";

export type ButtonProps = SlotProps<ButtonSlot> & {
	variant?: ButtonVariant;
	size?: "xs" | "sm" | "md" | "lg" | undefined;
	type?: "button" | "submit" | "reset" | undefined;
	disabled?: boolean | undefined;
	/** Keeps focus and width; blocks clicks and announces `aria-busy`. */
	loading?: boolean | undefined;
	/** Render as a link. */
	href?: string | undefined;
	target?: string | undefined;
	/** Leading / trailing content (icons, badges, kbd). */
	start?: unknown;
	end?: unknown;
	/** Square icon-only button; pass `aria-label`. */
	iconOnly?: boolean | undefined;
	fullWidth?: boolean | undefined;
	onClick?: ((e: MouseEvent) => void) | undefined;
	children?: unknown;
};

const OWN_KEYS = [
	"variant",
	"size",
	"type",
	"disabled",
	"loading",
	"href",
	"target",
	"start",
	"end",
	"iconOnly",
	"fullWidth",
	"onClick",
	"children",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/**
 * Button (or link when `href` is set).
 * Slots: `root` `label` `start` `end` `spinner`. State: `data-variant`,
 * `data-size`, `data-loading`, `data-disabled`.
 */
export function Button(input: ButtonProps) {
	const props = withDefaults("Button", { variant: "solid", size: "md", type: "button" }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<ButtonSlot>("Button", props);
	const inert = () => Boolean(props.disabled || props.loading);

	const className = () =>
		slot.class(
			"root",
			"a-btn",
			`a-btn-${props.variant}`,
			props.size !== "md" && `a-btn-${props.size}`,
			props.loading && "a-btn-loading",
			props.iconOnly && "a-btn-icon",
			props.fullWidth && "a-btn-block",
		);

	const onClick = (e: MouseEvent) => {
		if (inert()) {
			e.preventDefault();
			return;
		}
		props.onClick?.(e);
	};

	// Plain conditionals (compiled to memoized inserts) instead of <Show>: no
	// wrapper hosts on the kit's most-instantiated component.
	const content = (
		<>
			{props.loading ? (
				<Icon name="spinner" size="sm" class={slot.class("spinner", "a-btn-spinner")} />
			) : null}
			<span class={slot.class("label", "a-btn-label")} style={slot.style("label")}>
				{props.start ? (
					<span class={slot.class("start", "a-btn-section")} style={slot.style("start")}>
						{props.start}
					</span>
				) : null}
				<span class="a-btn-label-text">{props.children}</span>
				{props.end ? (
					<span class={slot.class("end", "a-btn-section")} style={slot.style("end")}>
						{props.end}
					</span>
				) : null}
			</span>
		</>
	);

	if (props.href !== undefined) {
		return (
			<a
				{...rest}
				href={inert() ? undefined : props.href}
				target={props.target}
				rel={props.target === "_blank" ? "noopener noreferrer" : undefined}
				class={className()}
				style={slot.style("root")}
				aria-disabled={inert() || undefined}
				aria-busy={props.loading || undefined}
				data-variant={props.variant}
				data-size={props.size}
				data-loading={props.loading ? "" : undefined}
				onClick={onClick}
			>
				{content}
			</a>
		);
	}

	return (
		<button
			{...rest}
			type={props.type}
			class={className()}
			style={slot.style("root")}
			disabled={Boolean(props.disabled)}
			aria-disabled={props.loading || undefined}
			aria-busy={props.loading || undefined}
			data-variant={props.variant}
			data-size={props.size}
			data-loading={props.loading ? "" : undefined}
			onClick={onClick}
		>
			{content}
		</button>
	);
}
