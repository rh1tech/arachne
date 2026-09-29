import { omitProps, Portal, Show } from "@arachne/render";
import { effect } from "@arachne/signals";
import { focusableIn, trapFocus, whenConnected } from "./focus.ts";
import { CloseButton } from "./icons.tsx";
import { watchEscape } from "./layers.ts";
import { createPresence } from "./motion.ts";
import { lockBodyScroll } from "./scroll-lock.ts";
import { createId, createSlots, type SlotProps, withDefaults } from "./system.ts";

export type DialogSlot =
	| "root"
	| "backdrop"
	| "panel"
	| "header"
	| "title"
	| "description"
	| "body"
	| "footer"
	| "close";

export type DialogBaseProps = SlotProps<DialogSlot> & {
	/** Whether the dialog is shown (controlled). */
	open: boolean;
	/** Called when the user closes it (close button, Escape, backdrop); set `open` to false. */
	onClose: () => void;
	/** Heading; also the dialog's accessible name. */
	title?: unknown;
	/** Text under the title; also the dialog's accessible description. */
	description?: unknown;
	/** Bottom bar content, usually the action buttons. */
	footer?: unknown;
	/** Body content. */
	children?: unknown;
	/** Close when the backdrop is clicked (default true). */
	closeOnBackdrop?: boolean | undefined;
	/** Close on Escape (default true). */
	closeOnEscape?: boolean | undefined;
	/** Hide the header close button. */
	hideClose?: boolean | undefined;
	/** Accessible name when there is no visible `title`. */
	label?: string | undefined;
	/** Portal target (defaults to `document.body`). */
	mount?: Element | undefined;
	/** `alertdialog` for confirmations that interrupt the user. */
	role?: "dialog" | "alertdialog" | undefined;
};

const OWN_KEYS = [
	"open",
	"onClose",
	"title",
	"description",
	"footer",
	"children",
	"closeOnBackdrop",
	"closeOnEscape",
	"hideClose",
	"label",
	"mount",
	"role",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
	"id",
] as const;

type FrameConfig = {
	/** Theme key (`Modal`, `Drawer`, …). */
	name: string;
	/** Class prefix (`a-modal`, `a-drawer`). */
	base: string;
	/** Extra modifier classes on the panel, e.g. size / side. */
	modifiers: () => Array<string | false | null | undefined>;
	/** Extra `data-*` attributes on the root. */
	data?: (() => Record<string, string | undefined>) | undefined;
};

/**
 * Accessible modal surface shared by Modal / Drawer / BottomSheet.
 * Forwarded attributes land on the panel (`role="dialog"`).
 */
export function DialogFrame(input: DialogBaseProps, config: FrameConfig) {
	const props = withDefaults(config.name, { closeOnBackdrop: true, closeOnEscape: true }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<DialogSlot>(config.name, props, "panel");
	const id = createId(config.base.replace(/^a-/, ""), props.id);
	const presence = createPresence(() => props.open);
	let panel: HTMLElement | undefined;

	effect(() => {
		if (!props.open) return;
		return lockBodyScroll();
	});
	watchEscape(
		() => props.open && props.closeOnEscape !== false,
		() => props.onClose(),
	);

	const view = (
		<Show when={presence.mounted()}>
			<Portal mount={props.mount}>
				<div
					class={slot.class("root", `${config.base}-root`)}
					style={slot.style("root")}
					data-state={presence.state()}
					{...(config.data?.() ?? {})}
				>
					<div
						class={slot.class("backdrop", `${config.base}-backdrop`)}
						style={slot.style("backdrop")}
						data-state={presence.state()}
						tabindex="-1"
						aria-hidden="true"
						onClick={() => {
							if (props.closeOnBackdrop !== false) props.onClose();
						}}
					/>
					{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role is dialog | alertdialog, both support aria-modal */}
					<div
						aria-label={props.title ? undefined : props.label}
						{...rest}
						ref={(el: HTMLElement) => {
							panel = el;
							presence.ref(el);
						}}
						id={id}
						class={slot.class("panel", config.base, ...config.modifiers())}
						style={slot.style("panel")}
						data-state={presence.state()}
						role={props.role ?? "dialog"}
						aria-modal="true"
						aria-labelledby={props.title ? `${id}-title` : undefined}
						aria-describedby={props.description ? `${id}-description` : undefined}
					>
						<Show when={props.title || !props.hideClose}>
							<header
								class={slot.class("header", `${config.base}-header`)}
								style={slot.style("header")}
							>
								<Show when={props.title}>
									<h2
										id={`${id}-title`}
										class={slot.class("title", `${config.base}-title`)}
										style={slot.style("title")}
									>
										{props.title}
									</h2>
								</Show>
								<Show when={!props.hideClose}>
									<CloseButton
										class={slot.class("close", `${config.base}-close`)}
										onClick={() => props.onClose()}
									/>
								</Show>
							</header>
						</Show>
						<Show when={props.description}>
							<p
								id={`${id}-description`}
								class={slot.class("description", `${config.base}-description`)}
								style={slot.style("description")}
							>
								{props.description}
							</p>
						</Show>
						<div
							class={slot.class("body", `${config.base}-body`)}
							style={slot.style("body")}
							data-slot="body"
						>
							{props.children}
						</div>
						<Show when={props.footer}>
							<footer
								class={slot.class("footer", `${config.base}-footer`)}
								style={slot.style("footer")}
							>
								{props.footer}
							</footer>
						</Show>
					</div>
				</div>
			</Portal>
		</Show>
	);

	effect(() => {
		if (!props.open || !presence.mounted()) return;
		// Prefer content over the header close button for initial focus.
		return whenConnected(
			() => panel,
			(el) =>
				trapFocus(el, (root) => {
					const body = root.querySelector(`.${config.base}-body, [data-slot="body"]`);
					return body ? focusableIn(body)[0] : undefined;
				}),
		);
	});

	return view;
}

export type ModalProps = DialogBaseProps & {
	/** Width preset; override freely with `--a-modal-width`. */
	size?: "sm" | "md" | "lg" | "xl" | "full" | undefined;
	/** Vertical placement (default `center`). */
	placement?: "center" | "top" | undefined;
};

/**
 * Centered dialog with focus trap, Escape, scroll lock and enter/exit motion.
 * Slots: `root` `backdrop` `panel` `header` `title` `description` `body` `footer` `close`.
 */
export function Modal(props: ModalProps) {
	return DialogFrame(props, {
		name: "Modal",
		base: "a-modal",
		modifiers: () => [
			props.size && props.size !== "md" && `a-modal-${props.size}`,
			props.placement === "top" && "a-modal-top",
		],
	});
}

export type DrawerProps = DialogBaseProps & {
	/** Edge the drawer slides in from. */
	side?: "left" | "right" | "top" | "bottom" | undefined;
	/** Width (or height, for top / bottom). */
	size?: "sm" | "md" | "lg" | "full" | undefined;
};

/**
 * Edge-anchored dialog. Slots match {@link Modal}.
 */
export function Drawer(props: DrawerProps) {
	return DialogFrame(props, {
		name: "Drawer",
		base: "a-drawer",
		modifiers: () => [
			`a-drawer-${props.side ?? "right"}`,
			props.size && props.size !== "md" && `a-drawer-${props.size}`,
		],
		data: () => ({ "data-side": props.side ?? "right" }),
	});
}
