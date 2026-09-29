import { clearDelegatedEvents, delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import {
	AutosaveIndicator,
	BranchBadge,
	BuildStatus,
	Button,
	Callout,
	ChangelogItem,
	CommitChip,
	CreditCardPreview,
	DensityToggle,
	EndpointRow,
	ErrorState,
	FileTree,
	FloatingToolbar,
	Gauge,
	HttpMethodBadge,
	InviteCard,
	InvoiceRow,
	JsonTree,
	LastSaved,
	LogViewer,
	MemberRow,
	NoResults,
	Pipeline,
	PriorityBadge,
	ProfileHeader,
	ServiceStatus,
	SeverityBadge,
	StorageBar,
	SyncStatus,
	UpgradeBanner,
	UptimeBar,
	UsageMeter,
	VersionTag,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown"]);

	const density = signal<"comfortable" | "compact">("comfortable");
	const fileSel = signal("src");

	render(
		() => (
			<div>
				<Callout tone="tip" title="Tip">
					Ship fast
				</Callout>
				<ChangelogItem version="0.4.0" date="2026-09-28" title="Ops kit">
					Status and billing widgets
				</ChangelogItem>
				<VersionTag version="1.2.3" />
				<HttpMethodBadge method="POST" />
				<EndpointRow method="GET" path="/v1/users" summary="List users" />
				<JsonTree
					data={{
						kind: "object",
						entries: [
							{ key: "ok", value: { kind: "primitive", value: true } },
							{
								key: "items",
								value: {
									kind: "array",
									items: [{ kind: "primitive", value: 1 }],
								},
							},
						],
					}}
				/>
				<LogViewer
					lines={[
						{ time: "10:01", level: "info", message: "boot" },
						{ time: "10:02", level: "error", message: "fail" },
					]}
				/>
				<ServiceStatus name="API" status="operational" />
				<UptimeBar days={[1, 1, 0.99, 0.9, 1]} />
				<UsageMeter label="Seats" used={3} limit={5} />
				<UpgradeBanner title="Upgrade" action={<Button size="sm">Go Pro</Button>}>
					Unlock SSO
				</UpgradeBanner>
				<ProfileHeader name="Ada" handle="ada" bio="Engineer" />
				{/* biome-ignore lint/a11y/useValidAriaRole: `role` is the member role (admin/member), not an ARIA role */}
				<MemberRow name="Grace" email="g@ex.com" role="admin" onRemove={() => {}} />
				<PriorityBadge priority="high" />
				<SeverityBadge severity="critical" />
				<CommitChip sha="abc1234deadbeef" message="fix claimElement" />
				<BranchBadge name="main" />
				<BuildStatus status="running" />
				<Pipeline
					steps={[
						{ id: "1", label: "Build", status: "success" },
						{ id: "2", label: "Test", status: "running" },
					]}
				/>
				<SyncStatus state="synced" />
				<AutosaveIndicator state="saved" />
				<LastSaved at="just now" />
				<FloatingToolbar>
					<Button size="sm" variant="ghost">
						B
					</Button>
				</FloatingToolbar>
				<DensityToggle value={density()} onChange={(v) => density.set(v)} />
				<NoResults query="xyz" />
				<ErrorState description="Try again" />
				<CreditCardPreview last4="4242" brand="Visa" exp="12/28" />
				<InvoiceRow id="inv_1" date="Sep 1" amount="$49" status="paid" />
				<StorageBar usedGb={12} totalGb={100} />
				<FileTree
					selected={fileSel()}
					onSelect={(id) => fileSel.set(id)}
					nodes={[
						{
							id: "src",
							name: "src",
							kind: "folder",
							children: [{ id: "app", name: "app.ts", kind: "file" }],
						},
					]}
				/>
				<Gauge value={72} label="CPU" />
				{/* biome-ignore lint/a11y/useValidAriaRole: `role` is the member role (admin/member), not an ARIA role */}
				<InviteCard email="new@ex.com" role="member" onResend={() => {}} onRevoke={() => {}} />
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
