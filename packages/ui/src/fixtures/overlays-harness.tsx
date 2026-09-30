import { render, Show } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	Accordion,
	Button,
	configureUI,
	createToaster,
	Drawer,
	Menu,
	Modal,
	Popover,
	Tabs,
	ToastHost,
	Tooltip,
} from "../index.ts";

export function run(root: HTMLElement) {
	const modalOpen = signal(false);
	const modalClosed = signal(0);
	const drawerOpen = signal(false);
	const menuOpen = signal(false);
	const selected = signal("");
	const popOpen = signal(false);
	const tab = signal("a");
	const acc = signal<string | null>(null);
	const accMany = signal<string[]>([]);
	const mounted = signal(true);
	const toaster = createToaster({ exitMs: 0 });

	configureUI({
		components: {
			Modal: { classes: { panel: "theme-panel" } },
			Button: { defaultProps: { size: "sm" } },
		},
	});

	const dispose = render(
		() => (
			<div>
				<button type="button" data-test="outside">
					outside
				</button>
				<Button data-test="modal-trigger" onClick={() => modalOpen.set(true)}>
					Open modal
				</Button>
				<Modal
					open={modalOpen()}
					onClose={() => {
						modalOpen.set(false);
						modalClosed.set(modalClosed() + 1);
					}}
					title="Edit profile"
					description="Update your details"
					id="profile-modal"
					data-test="modal"
					classes={{ body: "my-body" }}
					styles={{ panel: { "--a-modal-width": "30rem" } }}
					footer={<button type="button">Save</button>}
				>
					<input data-test="modal-input" />
				</Modal>

				<Drawer open={drawerOpen()} onClose={() => drawerOpen.set(false)} title="Filters">
					<button type="button" data-test="drawer-first">
						First
					</button>
				</Drawer>

				<div class="a-menu-host">
					<button type="button" data-test="menu-trigger" onClick={() => menuOpen.set(!menuOpen())}>
						Actions
					</button>
					<Menu
						open={menuOpen()}
						onClose={() => menuOpen.set(false)}
						items={[
							{ label: "Rename", onSelect: () => selected.set("rename") },
							{ label: "Archive", onSelect: () => selected.set("archive"), disabled: true },
							{ label: "Delete", onSelect: () => selected.set("delete"), danger: true },
						]}
					/>
				</div>

				<Show when={mounted()}>
					<Popover open={popOpen()} onOpenChange={(v) => popOpen.set(v)} label="More">
						<p>Popover body</p>
					</Popover>
				</Show>

				<Tabs
					id="tabs"
					value={tab()}
					onChange={(id) => tab.set(id)}
					items={[
						{ id: "a", label: "Alpha", panel: <p>Panel A</p> },
						{ id: "b", label: "Beta", panel: <p>Panel B</p>, disabled: true },
						{ id: "c", label: "Gamma", panel: <p>Panel C</p> },
					]}
				/>

				<Tooltip content="Helpful hint" openDelay={0}>
					<button type="button" data-test="tip-trigger">
						?
					</button>
				</Tooltip>

				<Accordion
					value={acc()}
					onChange={(v) => acc.set(v as string | null)}
					items={[
						{ id: "one", title: "One", content: <input data-test="acc-input" /> },
						{ id: "two", title: "Two", content: "Second" },
					]}
				/>
				<Accordion
					multiple
					class="acc-many"
					value={accMany()}
					onChange={(v) => accMany.set(v as string[])}
					items={[
						{ id: "x", title: "X", content: "x" },
						{ id: "y", title: "Y", content: "y" },
					]}
				/>

				<ToastHost toaster={toaster} />
			</div>
		),
		root,
	);

	return {
		dispose: () => {
			dispose();
			configureUI({});
		},
		modalOpen,
		modalClosed,
		drawerOpen,
		menuOpen,
		selected,
		popOpen,
		tab,
		acc,
		accMany,
		mounted,
		toaster,
	};
}
