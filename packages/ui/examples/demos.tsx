/**
 * Interactive showcase versions of components that would cover the page if
 * rendered open (portaled overlays) or that need a trigger to show anything.
 */
import { signal } from "@arachne/signals";
import {
	BottomSheet,
	Button,
	ConfirmDialog,
	createToaster,
	Drawer,
	Group,
	Lightbox,
	Modal,
	Spotlight,
	ToastHost,
} from "../src/index.ts";
import { swatch } from "./placeholder.ts";

function ModalDemo() {
	const open = signal(false);
	return (
		<>
			<Button onClick={() => open.set(true)}>Open modal</Button>
			<Modal
				open={open()}
				onClose={() => open.set(false)}
				title="Edit profile"
				description="Changes are saved when you press Save."
				footer={
					<Group gap="0.5rem">
						<Button variant="ghost" onClick={() => open.set(false)}>
							Cancel
						</Button>
						<Button onClick={() => open.set(false)}>Save</Button>
					</Group>
				}
			>
				Modal body content.
			</Modal>
		</>
	);
}

function DrawerDemo() {
	const open = signal(false);
	return (
		<>
			<Button onClick={() => open.set(true)}>Open drawer</Button>
			<Drawer open={open()} onClose={() => open.set(false)} title="Filters">
				Drawer content.
			</Drawer>
		</>
	);
}

function ConfirmDemo() {
	const open = signal(false);
	return (
		<>
			<Button variant="danger" onClick={() => open.set(true)}>
				Delete project
			</Button>
			<ConfirmDialog
				open={open()}
				danger
				title="Delete project?"
				message="This cannot be undone."
				confirmLabel="Delete"
				onConfirm={() => open.set(false)}
				onCancel={() => open.set(false)}
			/>
		</>
	);
}

function BottomSheetDemo() {
	const open = signal(false);
	return (
		<>
			<Button onClick={() => open.set(true)}>Open sheet</Button>
			<BottomSheet open={open()} onClose={() => open.set(false)} title="Share">
				Sheet content.
			</BottomSheet>
		</>
	);
}

function LightboxDemo() {
	const index = signal<number | null>(null);
	const images = [
		{ src: swatch(210, "One"), alt: "Blue placeholder" },
		{ src: swatch(150, "Two"), alt: "Green placeholder" },
		{ src: swatch(20, "Three"), alt: "Orange placeholder" },
	];
	return (
		<>
			<Button onClick={() => index.set(0)}>Open gallery</Button>
			{index() !== null ? (
				<Lightbox
					images={images}
					index={index() ?? 0}
					onIndexChange={(i: number) => index.set(i)}
					onClose={() => index.set(null)}
				/>
			) : null}
		</>
	);
}

function SpotlightDemo() {
	const open = signal(false);
	return (
		<>
			<Button onClick={() => open.set(true)}>Open command palette</Button>
			<Spotlight
				open={open()}
				onClose={() => open.set(false)}
				actions={[
					{ id: "new", label: "New file", onSelect: () => open.set(false) },
					{ id: "open", label: "Open recent", onSelect: () => open.set(false) },
					{ id: "settings", label: "Settings", onSelect: () => open.set(false) },
				]}
			/>
		</>
	);
}

function ToastDemo() {
	const toaster = createToaster();
	return (
		<>
			<Group gap="0.5rem">
				<Button onClick={() => toaster.push({ title: "Saved", message: "Your changes are live." })}>
					Info toast
				</Button>
				<Button
					variant="success"
					onClick={() => toaster.push({ tone: "success", message: "Deployment finished." })}
				>
					Success
				</Button>
				<Button
					variant="danger"
					onClick={() =>
						toaster.push({
							tone: "danger",
							message: "Build failed.",
							action: { label: "Retry", onClick: () => {} },
						})
					}
				>
					Error with action
				</Button>
			</Group>
			<ToastHost toaster={toaster} aria-label="Demo notifications" />
		</>
	);
}

export const demos: Record<string, () => unknown> = {
	Modal: () => <ModalDemo />,
	Drawer: () => <DrawerDemo />,
	ConfirmDialog: () => <ConfirmDemo />,
	BottomSheet: () => <BottomSheetDemo />,
	Lightbox: () => <LightboxDemo />,
	Spotlight: () => <SpotlightDemo />,
	ToastHost: () => <ToastDemo />,
};
