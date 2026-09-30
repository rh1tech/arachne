import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	ActivityItem,
	Banner,
	BottomSheet,
	Button,
	ChatBubble,
	ChoiceCard,
	CountUp,
	JsonViewer,
	PageHeader,
	RelativeTime,
	StatusDot,
	ThemeToggle,
	TypingIndicator,
	UserButton,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown"]);

	const sheet = signal(false);
	const theme = signal<"light" | "dark">("light");
	const plan = signal("pro");

	render(
		() => (
			<div>
				<Banner tone="info" title="Banner">
					Hello
				</Banner>
				<PageHeader title="Patterns" description="Demo" />
				<StatusDot tone="success" label="ok" />
				<ThemeToggle value={theme()} onChange={(t) => theme.set(t)} />
				<UserButton name="Ada" email="ada@x.dev" />
				<ChoiceCard checked={plan() === "pro"} label="Pro" onChange={() => plan.set("pro")} />
				<ChatBubble from="me">Hi</ChatBubble>
				<TypingIndicator />
				<JsonViewer value={{ ok: true }} />
				<RelativeTime value={Date.now() - 60_000} />
				<CountUp value={42} duration={10} />
				<ActivityItem title="Event" />
				<button type="button" data-open-sheet="" onClick={() => sheet.set(true)}>
					Sheet
				</button>
				<BottomSheet open={sheet()} onClose={() => sheet.set(false)} title="Sheet">
					Body
				</BottomSheet>
				<Button size="sm">ok</Button>
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
