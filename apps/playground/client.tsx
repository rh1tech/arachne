import { delegateEvents, render } from "@arachne/render";
import { signal } from "@arachne/signals";
import { createToaster, DocMenu, Icon, ToastHost } from "@arachne/ui";
import { flatShowcaseOptions, ShowcaseContent, showcaseSections } from "./showcase.tsx";

const toaster = createToaster();
const showcasePage = signal("overview");

function App() {
	return (
		<div class="docs">
			<aside class="docs-sidebar">
				<DocMenu
					brand={
						<span>
							<Icon name="code" size="sm" /> UI Library
						</span>
					}
					sections={showcaseSections}
					value={showcasePage()}
					onChange={(id) => showcasePage.set(id)}
					defaultOpen={["start", "ref-layout"]}
				/>
			</aside>
			<div class="docs-main">
				<nav class="docs-mobile-nav" aria-label="Component pages">
					<select
						aria-label="Component"
						value={showcasePage()}
						onChange={(e: Event) => showcasePage.set((e.target as HTMLSelectElement).value)}
					>
						{flatShowcaseOptions().map((opt) => (
							<option value={opt.id}>{opt.label}</option>
						))}
					</select>
				</nav>
				<main id="main" class="docs-content" tabindex="-1">
					<ShowcaseContent page={showcasePage()} />
					<ToastHost toaster={toaster} />
				</main>
			</div>
		</div>
	);
}

const mount = document.querySelector("#app");
if (!mount) throw new Error("#app missing");
delegateEvents([
	"click",
	"input",
	"change",
	"keydown",
	"submit",
	"focusin",
	"focusout",
	"contextmenu",
	"pointerdown",
	"pointermove",
	"blur",
]);
render(() => <App />, mount);
