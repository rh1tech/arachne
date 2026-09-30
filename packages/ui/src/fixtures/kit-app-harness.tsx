import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	AnnouncementBar,
	BrowserFrame,
	BulkBar,
	Button,
	CartLine,
	CommandBar,
	CopyId,
	EnvBadge,
	FeatureCompare,
	FilterChip,
	InboxItem,
	LiveBadge,
	LocaleSwitcher,
	Mention,
	OrderSummary,
	OrgSwitcher,
	Paper,
	PhoneFrame,
	Price,
	ProductCard,
	PropertyList,
	QuantityInput,
	ReactionBar,
	ResultCount,
	SecretField,
	ShareButton,
	StatCard,
	TableOfContents,
	Text,
	UnreadBadge,
	ViewToggle,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown"]);

	const qty = signal(2);
	const locale = signal("en");
	const view = signal<"list" | "grid">("grid");
	const announce = signal(true);

	render(
		() => (
			<div>
				{announce() ? (
					<AnnouncementBar dismissible onDismiss={() => announce.set(false)}>
						Ship day
					</AnnouncementBar>
				) : null}
				<CommandBar>
					<Button size="sm">New</Button>
					<ShareButton size="sm" />
				</CommandBar>
				<TableOfContents
					title="On this page"
					items={[
						{ id: "a", label: "Intro", active: true },
						{ id: "b", label: "API" },
					]}
				/>
				<PropertyList
					items={[
						{ label: "Owner", value: "Ada" },
						{ label: "Region", value: "eu-west" },
					]}
				/>
				<StatCard label="MRR" value="$12k" trend={8} />
				<QuantityInput value={qty()} onChange={(v) => qty.set(v)} />
				<Price amount={29} period="mo" strike={39} />
				<ProductCard title="Kit" price={49} badge="New" onAdd={() => {}} />
				<CartLine
					title="Kit"
					price={49}
					quantity={qty()}
					onQuantityChange={(v) => qty.set(v)}
					onRemove={() => {}}
				/>
				<OrderSummary
					lines={[
						{ label: "Subtotal", value: "$98" },
						{ label: "Tax", value: "$8", muted: true },
					]}
					total="$106"
				/>
				<CopyId value="proj_abc" label="ID" />
				<EnvBadge env="staging" />
				<LocaleSwitcher
					value={locale()}
					options={[
						{ value: "en", label: "EN" },
						{ value: "de", label: "DE" },
					]}
					onChange={(v) => locale.set(v)}
				/>
				<OrgSwitcher org={{ id: "1", name: "Arachne", plan: "Pro" }} />
				<InboxItem title="Deployed" body="main green" time="2m" unread />
				<ReactionBar
					reactions={[
						{ emoji: "👍", count: 3, active: true },
						{ emoji: "🎉", count: 1 },
					]}
				/>
				<p>
					Hi <Mention name="ada" />
				</p>
				<BrowserFrame url="https://arachne.dev">
					<Text>Preview</Text>
				</BrowserFrame>
				<PhoneFrame>
					<Paper>Mobile</Paper>
				</PhoneFrame>
				<FeatureCompare
					plans={["Free", "Pro"]}
					rows={[
						{ feature: "Projects", values: ["3", "∞"] },
						{ feature: "SSO", values: [false, true] },
					]}
				/>
				<ViewToggle value={view()} onChange={(v) => view.set(v)} />
				<ResultCount count={12} />
				<FilterChip label="Open" onRemove={() => {}} />
				<BulkBar count={2} onClear={() => {}}>
					<Button size="sm" variant="ghost">
						Archive
					</Button>
				</BulkBar>
				<LiveBadge />
				<UnreadBadge count={4} />
				<SecretField label="Key" value="sk_live_abc123" />
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel) ?? document.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
	};
}
