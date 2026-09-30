import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { s } from "@arachnejs/schema";
import {
	createForm,
	Form,
	FormArea,
	FormColumn,
	FormColumns,
	FormSection,
	FormWhen,
	SelectField,
	TextField,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change"]);

	const form = createForm({
		schema: s.object({
			name: s.string(),
			kind: s.string(),
			company: s.string(),
		}),
		initial: { name: "", kind: "personal", company: "" },
		onSubmit: () => undefined,
	});

	render(
		() => (
			<Form form={form} hideSubmit class="test-form">
				<FormSection title="Profile">
					<FormColumns>
						<FormColumn size={6}>
							<TextField form={form} name="name" label="Name" />
						</FormColumn>
						<FormColumn size={6}>
							<SelectField
								form={form}
								name="kind"
								label="Kind"
								options={[
									{ value: "personal", label: "Personal" },
									{ value: "business", label: "Business" },
								]}
							/>
						</FormColumn>
					</FormColumns>
				</FormSection>
				<FormWhen form={form} match={(v) => v.kind === "business"}>
					<div data-test="company-area">
						<FormArea title="Company">
							<TextField form={form} name="company" label="Company" />
						</FormArea>
					</div>
				</FormWhen>
			</Form>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			(root.querySelector(sel) as HTMLElement | null)?.click();
		},
		setKind: (value: string) => {
			form.set("kind", value);
		},
		kind: () => form.get("kind"),
	};
}
