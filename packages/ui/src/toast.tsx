import { For, omitProps, Portal, Show } from "@arachne/render";
import type { Signal } from "@arachne/signals";
import { signal } from "@arachne/signals";
import type { AlertTone } from "./feedback.tsx";
import { createSlots, type SlotProps, withDefaults } from "./system.ts";

export type ToastAction = { label: string; onClick: () => void };

export type ToastItem = {
	id: string;
	title?: string | undefined;
	message: string;
	tone?: AlertTone | undefined;
	action?: ToastAction | undefined;
	/** `closed` while the exit animation plays. */
	state: "open" | "closed";
};

export type ToastInput = {
	id?: string | undefined;
	title?: string | undefined;
	message: string;
	tone?: AlertTone | undefined;
	action?: ToastAction | undefined;
	/** Auto-dismiss delay; `0` keeps the toast until dismissed. Default 4000. */
	durationMs?: number | undefined;
};

export type Toaster = {
	items: () => ToastItem[];
	push: (input: ToastInput) => string;
	dismiss: (id: string) => void;
	/** Pause / resume auto-dismiss (hover, focus). */
	pause: (id: string) => void;
	resume: (id: string) => void;
	clear: () => void;
};

export type ToasterOptions = {
	/** Exit animation length before removal, ms (default 200). */
	exitMs?: number | undefined;
	/** Keep at most this many toasts; oldest are dismissed first. */
	limit?: number | undefined;
};

type Timer = {
	handle?: ReturnType<typeof setTimeout> | undefined;
	remaining: number;
	started: number;
};

let toastCounter = 0;

function toItem(id: string, input: ToastInput): ToastItem {
	return {
		id,
		message: input.message,
		state: "open",
		...(input.title !== undefined ? { title: input.title } : {}),
		...(input.tone !== undefined ? { tone: input.tone } : {}),
		...(input.action !== undefined ? { action: input.action } : {}),
	};
}

/** Replace an existing toast in place or append, keeping at most `limit`. */
function upsert(current: ToastItem[], next: ToastItem, limit?: number): ToastItem[] {
	const exists = current.some((t) => t.id === next.id);
	const list = exists ? current.map((t) => (t.id === next.id ? next : t)) : [...current, next];
	return limit && list.length > limit ? list.slice(-limit) : list;
}

function toastId(): string {
	const c = globalThis.crypto as Crypto | undefined;
	return typeof c?.randomUUID === "function"
		? c.randomUUID()
		: `toast-${Date.now().toString(36)}-${(++toastCounter).toString(36)}`;
}

export function createToaster(options: ToasterOptions = {}): Toaster {
	const items = signal<ToastItem[]>([]) as Signal<ToastItem[]>;
	const timers = new Map<string, Timer>();
	const exitMs = options.exitMs ?? 200;

	const stop = (id: string) => {
		const t = timers.get(id);
		if (t?.handle) clearTimeout(t.handle);
		timers.delete(id);
	};

	const remove = (id: string) => items.set(items().filter((t) => t.id !== id));

	const dismiss = (id: string): void => {
		stop(id);
		if (exitMs <= 0) {
			remove(id);
			return;
		}
		items.set(items().map((t) => (t.id === id ? { ...t, state: "closed" } : t)));
		setTimeout(() => remove(id), exitMs);
	};

	const start = (id: string, ms: number) => {
		const t: Timer = { remaining: ms, started: Date.now() };
		t.handle = setTimeout(() => dismiss(id), ms);
		timers.set(id, t);
	};

	return {
		items: () => items(),
		push(input) {
			const id = input.id ?? toastId();
			stop(id);
			const next = toItem(id, input);
			const list = upsert(items(), next, options.limit);
			for (const t of items()) if (!list.includes(t) && t.id !== id) stop(t.id);
			items.set(list);
			const duration = input.durationMs ?? 4000;
			if (duration > 0) start(id, duration);
			return id;
		},
		dismiss,
		pause(id) {
			const t = timers.get(id);
			if (!t?.handle) return;
			clearTimeout(t.handle);
			t.handle = undefined;
			t.remaining -= Date.now() - t.started;
		},
		resume(id) {
			const t = timers.get(id);
			if (!t || t.handle) return;
			t.started = Date.now();
			t.handle = setTimeout(() => dismiss(id), Math.max(0, t.remaining));
		},
		clear() {
			for (const id of [...timers.keys()]) stop(id);
			items.set([]);
		},
	};
}

export type ToastPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

export type ToastSlot =
	| "root"
	| "toast"
	| "icon"
	| "copy"
	| "title"
	| "message"
	| "action"
	| "dismiss";

export type ToastHostProps = SlotProps<ToastSlot> & {
	toaster: Toaster;
	position?: ToastPosition | undefined;
	/** Custom toast body; receives the item and a dismiss callback. */
	render?: ((toast: ToastItem, dismiss: () => void) => unknown) | undefined;
};

const OWN_KEYS = [
	"toaster",
	"position",
	"render",
	"class",
	"style",
	"classes",
	"styles",
	"unstyled",
] as const;

/**
 * Live region for toasts. Existing toasts keep their DOM when others come and
 * go; timers pause on hover/focus. Slots: `root` `toast` `icon` `copy` `title`
 * `message` `action` `dismiss`.
 */
export function ToastHost(input: ToastHostProps) {
	const props = withDefaults("ToastHost", { position: "bottom-right" }, input);
	const rest = omitProps(props, OWN_KEYS);
	const slot = createSlots<ToastSlot>("ToastHost", props);
	// Stable row identity: rows are keyed by id, content reads the latest item.
	const ids = () => props.toaster.items().map((t) => t.id);
	const byId = (id: string) => props.toaster.items().find((t) => t.id === id);

	return (
		<Portal>
			<section
				aria-label="Notifications"
				{...rest}
				class={slot.class("root", "a-toast-host", `a-toast-host-${props.position}`)}
				style={slot.style("root")}
				data-position={props.position}
			>
				<For each={ids()}>
					{(id) => {
						const toast = () => byId(id);
						const tone = () => toast()?.tone ?? "info";
						const assertive = () => tone() === "danger" || tone() === "warning";
						const dismiss = () => props.toaster.dismiss(id);
						return (
							// biome-ignore lint/a11y/noStaticElementInteractions: pause-on-hover/focus for the auto-dismiss timer (WCAG 2.2.1)
							<div
								class={slot.class("toast", "a-toast", `a-toast-${tone()}`)}
								style={slot.style("toast")}
								role={assertive() ? "alert" : "status"}
								aria-live={assertive() ? "assertive" : "polite"}
								aria-atomic="true"
								data-state={toast()?.state ?? "closed"}
								data-tone={tone()}
								onMouseEnter={() => props.toaster.pause(id)}
								onMouseLeave={() => props.toaster.resume(id)}
								onFocusIn={() => props.toaster.pause(id)}
								onFocusOut={() => props.toaster.resume(id)}
							>
								{props.render ? (
									props.render(toast() as ToastItem, dismiss)
								) : (
									<>
										<span class={slot.class("icon", "a-toast-icon")} aria-hidden="true" />
										<div class={slot.class("copy", "a-toast-copy")}>
											<Show when={toast()?.title}>
												<strong class={slot.class("title", "a-toast-title")}>
													{toast()?.title}
												</strong>
											</Show>
											<span class={slot.class("message", "a-toast-message")}>
												{toast()?.message}
											</span>
										</div>
										<Show when={toast()?.action}>
											<button
												type="button"
												class={slot.class("action", "a-toast-action")}
												onClick={() => {
													toast()?.action?.onClick();
													dismiss();
												}}
											>
												{toast()?.action?.label}
											</button>
										</Show>
										<button
											type="button"
											class={slot.class("dismiss", "a-toast-dismiss")}
											aria-label="Dismiss"
											onClick={dismiss}
										>
											×
										</button>
									</>
								)}
							</div>
						);
					}}
				</For>
			</section>
		</Portal>
	);
}
