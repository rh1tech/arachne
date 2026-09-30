import { render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import { clampToViewport, wrapIndex } from "../advanced.tsx";
import { percentOf } from "../display.tsx";
import { matchesAccept } from "../files-nav.tsx";
import {
	Alert,
	Carousel,
	ColorSwatch,
	ConfirmDialog,
	ContextMenu,
	Heading,
	Highlight,
	Marquee,
	Meter,
	NavigationProgress,
	NavLink,
	PasswordStrength,
	Progress,
	RingProgress,
	Segmented,
	type SortableItem,
	SortableList,
	Spotlight,
	StatCard,
	Steps,
	Subtitle,
	Title,
	UnreadBadge,
} from "../index.ts";
import { formatMoney, Price } from "../kit-app.tsx";

export function run(root: HTMLElement) {
	const level = signal<1 | 2 | 3 | 4 | 5 | 6>(2);
	const order = signal<1 | 2 | 3 | 4 | 5 | 6>(2);
	const ring = signal(10);
	const meter = signal(20);
	const password = signal("");
	const trend = signal(2);
	const unread = signal(0);
	const navVisible = signal(false);
	const progressMax = signal(0);
	const highlight = signal("ar");
	const swatch = signal("#ff0000");
	const slide = signal<string | undefined>(undefined);
	const slides = signal([
		{ id: "s1", content: "One" },
		{ id: "s2", content: "Two" },
		{ id: "s3", content: "Three" },
	]);
	const sortable = signal<SortableItem[]>([
		{ id: "a", label: "A" },
		{ id: "b", label: "B" },
		{ id: "c", label: "C" },
	]);
	const confirmOpen = signal(false);
	const confirmed = signal(0);
	const cancelled = signal(0);
	const spotOpen = signal(false);
	const ran = signal("");
	const ctxPicked = signal("");
	const currency = signal("EUR");

	const dispose = render(
		() => (
			<div>
				<button type="button" data-test="outside">
					outside
				</button>
				<Title size={level()}>Title</Title>
				<Title data-test="ordered" order={order()}>
					Ordered
				</Title>
				<Subtitle data-test="sub">Subtitle</Subtitle>
				<Subtitle data-test="sub-heading" order={3}>
					Sub heading
				</Subtitle>
				<Heading level={level() > 3 ? 3 : (level() as 1 | 2 | 3)}>Heading</Heading>
				<RingProgress value={ring()} />
				<Meter value={meter()} label="Disk" />
				<PasswordStrength password={password()} />
				<StatCard label="Revenue" value="1" trend={trend()} />
				<UnreadBadge count={unread()} />
				<NavigationProgress visible={navVisible()} value={40} />
				<Progress value={5} max={progressMax()} />
				<Highlight text="Arachne framework" highlight={highlight()} />
				<ColorSwatch color={swatch()} />
				<Alert tone="danger">Broken</Alert>
				<Alert tone="info">Fyi</Alert>
				<NavLink label="Docs" href="/docs" active />
				<Price amount={10} currency={currency()} />
				<Marquee>
					<span class="marquee-item">tick</span>
				</Marquee>
				<Segmented
					label="View"
					value="a"
					onChange={() => undefined}
					items={[
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					]}
				/>
				<Steps
					value="two"
					items={[
						{ id: "one", label: "One" },
						{ id: "two", label: "Two" },
					]}
				/>
				<Carousel slides={slides()} value={slide()} onChange={(id) => slide.set(id)} />
				<SortableList items={sortable()} onChange={(next) => sortable.set(next)} />
				<ConfirmDialog
					open={confirmOpen()}
					title="Delete project?"
					message="This cannot be undone."
					danger
					onConfirm={() => {
						confirmed.set(confirmed() + 1);
						confirmOpen.set(false);
					}}
					onCancel={() => {
						cancelled.set(cancelled() + 1);
						confirmOpen.set(false);
					}}
				/>
				<Spotlight
					open={spotOpen()}
					onClose={() => spotOpen.set(false)}
					actions={[
						{ id: "new", label: "New file", onSelect: () => ran.set("new") },
						{ id: "open", label: "Open file", onSelect: () => ran.set("open") },
						{ id: "quit", label: "Quit", onSelect: () => ran.set("quit") },
					]}
				/>
				<ContextMenu
					items={[
						{ id: "cut", label: "Cut", disabled: true, onSelect: () => ctxPicked.set("cut") },
						{ id: "copy", label: "Copy", onSelect: () => ctxPicked.set("copy") },
						{ id: "paste", label: "Paste", onSelect: () => ctxPicked.set("paste") },
					]}
				>
					<div data-test="ctx-target">Right click me</div>
				</ContextMenu>
			</div>
		),
		root,
	);

	return {
		order,
		dispose,
		level,
		ring,
		meter,
		password,
		trend,
		unread,
		navVisible,
		progressMax,
		highlight,
		swatch,
		slide,
		slides,
		sortable,
		confirmOpen,
		confirmed,
		cancelled,
		spotOpen,
		ran,
		ctxPicked,
		currency,
		helpers: { clampToViewport, wrapIndex, percentOf, matchesAccept, formatMoney },
	};
}
