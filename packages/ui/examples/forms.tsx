import { signal } from "@arachne/signals";
import {
	Autocomplete,
	Checkbox,
	CheckboxGroup,
	Chip,
	ChipGroup,
	CodeBlock,
	ColorInput,
	Control,
	Countdown,
	DateInput,
	type DateRange,
	DateRangePicker,
	Fieldset,
	FormArea,
	FormField,
	FormSection,
	Help,
	JsonInput,
	MonthPicker,
	MultiSelect,
	NativeSelect,
	NumberInput,
	PasswordInput,
	PinInput,
	RadioGroup,
	RangeSlider,
	Rating,
	SearchInput,
	Select,
	SemiCircleProgress,
	Slider,
	Sparkline,
	Switch,
	TagsInput,
	Text,
	TextArea,
	TextInput,
	TimeInput,
	TimePicker,
	ToTop,
} from "../src/index.ts";
import type { Example, ExampleProps } from "./types.ts";

const plans = [
	{ value: "free", label: "Free" },
	{ value: "pro", label: "Pro" },
	{ value: "team", label: "Team" },
];
const regions = [
	{ value: "fra1", label: "Frankfurt" },
	{ value: "iad1", label: "Washington, D.C." },
	{ value: "hnd1", label: "Tokyo" },
];

function TextInputExample(p: ExampleProps) {
	const name = signal("");
	return (
		<TextInput
			aria-label="Full name"
			{...p}
			placeholder="Ada Lovelace"
			value={name()}
			onInput={(e) => name.set((e.target as HTMLInputElement).value)}
		/>
	);
}

function TextAreaExample(p: ExampleProps) {
	const message = signal("");
	return (
		<TextArea
			aria-label="Message"
			{...p}
			rows={3}
			placeholder="Tell us what happened…"
			value={message()}
			onInput={(e) => message.set((e.target as HTMLInputElement).value)}
		/>
	);
}

function CheckboxExample(p: ExampleProps) {
	const updates = signal(true);
	return (
		<Checkbox
			{...p}
			label="Email me about product updates"
			checked={updates()}
			onChange={(e) => updates.set((e.target as HTMLInputElement).checked)}
		/>
	);
}

function SwitchExample(p: ExampleProps) {
	const previews = signal(true);
	return (
		<Switch
			{...p}
			label="Preview deploys"
			checked={previews()}
			onChange={(e) => previews.set((e.target as HTMLInputElement).checked)}
		/>
	);
}

function SelectExample(p: ExampleProps) {
	const plan = signal("pro");
	return (
		<Select
			aria-label="Plan"
			{...p}
			options={plans}
			value={plan()}
			onChange={(e) => plan.set((e.target as HTMLInputElement).value)}
		/>
	);
}

function RadioGroupExample(p: ExampleProps) {
	const plan = signal("pro");
	return (
		<RadioGroup
			{...p}
			label="Plan"
			name="plan"
			options={plans}
			value={plan()}
			onChange={(e) => plan.set((e.target as HTMLInputElement).value)}
		/>
	);
}

function SliderExample(p: ExampleProps) {
	const volume = signal(60);
	return (
		<>
			<Slider aria-label="Volume" {...p} value={volume()} onChange={volume.set} />
			<Text muted>Volume: {volume()}</Text>
		</>
	);
}

function NumberInputExample(p: ExampleProps) {
	const seats = signal(5);
	return (
		<NumberInput aria-label="Seats" {...p} min={1} max={50} value={seats()} onChange={seats.set} />
	);
}

function SearchInputExample(p: ExampleProps) {
	const query = signal("");
	return (
		<SearchInput
			aria-label="Search projects"
			{...p}
			placeholder="Search projects"
			value={query()}
			onChange={query.set}
		/>
	);
}

function ControlExample(p: ExampleProps) {
	const email = signal("");
	return (
		<FormField label="Email" labelFor="control-email">
			<Control {...p} expanded>
				<TextInput
					id="control-email"
					type="email"
					placeholder="you@example.com"
					value={email()}
					onInput={(e) => email.set((e.target as HTMLInputElement).value)}
				/>
			</Control>
		</FormField>
	);
}

function HelpExample(p: ExampleProps) {
	const user = signal("ada");
	const taken = () => ["admin", "root"].includes(user());
	return (
		<FormField label="Username" labelFor="help-user">
			<TextInput
				id="help-user"
				value={user()}
				onInput={(e) => user.set((e.target as HTMLInputElement).value)}
			/>
			<Help {...p} tone={taken() ? "danger" : "success"}>
				{taken() ? "That username is taken." : "This username is available."}
			</Help>
		</FormField>
	);
}

function FormSectionExample(p: ExampleProps) {
	const name = signal("Ada Lovelace");
	return (
		<FormSection {...p} title="Profile" description="Shown on your public page.">
			<FormField label="Display name" labelFor="section-name">
				<TextInput
					id="section-name"
					value={name()}
					onInput={(e) => name.set((e.target as HTMLInputElement).value)}
				/>
			</FormField>
		</FormSection>
	);
}

function FormAreaExample(p: ExampleProps) {
	const failed = signal(true);
	const weekly = signal(false);
	return (
		<FormArea
			{...p}
			order={3}
			title="Notifications"
			description="Choose what we email you about."
			bordered
		>
			<Checkbox
				label="Failed deploys"
				checked={failed()}
				onChange={(e) => failed.set((e.target as HTMLInputElement).checked)}
			/>
			<Checkbox
				label="Weekly summary"
				checked={weekly()}
				onChange={(e) => weekly.set((e.target as HTMLInputElement).checked)}
			/>
		</FormArea>
	);
}

function FormFieldExample(p: ExampleProps) {
	const project = signal("marketing-site");
	const invalid = () => !/^[a-z0-9-]+$/.test(project());
	return (
		<FormField
			{...p}
			label="Project name"
			labelFor="field-project"
			help="Lowercase letters, numbers and dashes."
			error={invalid() ? "Use only lowercase letters, numbers and dashes." : undefined}
		>
			<TextInput
				id="field-project"
				invalid={invalid()}
				value={project()}
				onInput={(e) => project.set((e.target as HTMLInputElement).value)}
			/>
		</FormField>
	);
}

function PasswordInputExample(p: ExampleProps) {
	const password = signal("");
	return <PasswordInput aria-label="Password" {...p} value={password()} onChange={password.set} />;
}

function PinInputExample(p: ExampleProps) {
	const code = signal("");
	return (
		<>
			<PinInput
				aria-label="Verification code"
				{...p}
				length={6}
				value={code()}
				onChange={code.set}
			/>
			<Text muted>{code().length === 6 ? `Verifying ${code()}…` : "Enter the 6-digit code."}</Text>
		</>
	);
}

function ColorInputExample(p: ExampleProps) {
	const color = signal("#4f46e5");
	return <ColorInput aria-label="Brand colour" {...p} value={color()} onChange={color.set} />;
}

function DateInputExample(p: ExampleProps) {
	const date = signal("2026-10-01");
	return <DateInput aria-label="Start date" {...p} value={date()} onChange={date.set} />;
}

function TimeInputExample(p: ExampleProps) {
	const time = signal("09:30");
	return <TimeInput aria-label="Start time" {...p} value={time()} onChange={time.set} />;
}

function JsonInputExample(p: ExampleProps) {
	const config = signal('{\n  "region": "fra1",\n  "replicas": 2\n}');
	return <JsonInput aria-label="Config JSON" {...p} value={config()} onChange={config.set} />;
}

function NativeSelectExample(p: ExampleProps) {
	const region = signal("fra1");
	return (
		<NativeSelect
			aria-label="Region"
			{...p}
			options={regions}
			value={region()}
			onChange={region.set}
		/>
	);
}

function FieldsetExample(p: ExampleProps) {
	const street = signal("");
	const city = signal("");
	return (
		<Fieldset {...p} legend="Shipping address">
			<FormField label="Street" labelFor="fs-street">
				<TextInput
					id="fs-street"
					value={street()}
					onInput={(e) => street.set((e.target as HTMLInputElement).value)}
				/>
			</FormField>
			<FormField label="City" labelFor="fs-city">
				<TextInput
					id="fs-city"
					value={city()}
					onInput={(e) => city.set((e.target as HTMLInputElement).value)}
				/>
			</FormField>
		</Fieldset>
	);
}

function CheckboxGroupExample(p: ExampleProps) {
	const selected = signal(["fra1"]);
	return (
		<CheckboxGroup
			{...p}
			legend="Regions"
			options={regions}
			value={selected()}
			onChange={selected.set}
		/>
	);
}

function ChipExample(p: ExampleProps) {
	const on = signal(true);
	return (
		<Chip {...p} checked={on()} onChange={on.set}>
			TypeScript
		</Chip>
	);
}

function ChipGroupExample(p: ExampleProps) {
	const frameworks = signal(["arachne"]);
	return (
		<ChipGroup
			{...p}
			legend="Frameworks"
			multiple
			options={[
				{ value: "arachne", label: "Arachne" },
				{ value: "solid", label: "Solid" },
				{ value: "svelte", label: "Svelte" },
			]}
			value={frameworks()}
			onChange={frameworks.set}
		/>
	);
}

function RatingExample(p: ExampleProps) {
	const stars = signal(4);
	return <Rating aria-label="Rating" {...p} value={stars()} onChange={stars.set} />;
}

function RangeSliderExample(p: ExampleProps) {
	const range = signal<[number, number]>([40, 120]);
	return (
		<>
			<RangeSlider
				aria-label="Price range"
				{...p}
				min={0}
				max={200}
				value={range()}
				onChange={range.set}
			/>
			<Text muted>
				${range()[0]} – ${range()[1]}
			</Text>
		</>
	);
}

function MultiSelectExample(p: ExampleProps) {
	const selected = signal(["fra1", "iad1"]);
	return (
		<MultiSelect
			aria-label="Regions"
			{...p}
			options={regions}
			value={selected()}
			onChange={selected.set}
		/>
	);
}

function TagsInputExample(p: ExampleProps) {
	const topics = signal(["signals", "ssr"]);
	return (
		<TagsInput
			aria-label="Topics"
			{...p}
			placeholder="Add a topic and press Enter"
			value={topics()}
			onChange={topics.set}
		/>
	);
}

function AutocompleteExample(p: ExampleProps) {
	const country = signal("");
	return (
		<Autocomplete
			aria-label="Country"
			{...p}
			placeholder="Start typing a country"
			value={country()}
			options={["Germany", "Japan", "United Kingdom", "United States"]}
			onChange={country.set}
		/>
	);
}

function MonthPickerExample(p: ExampleProps) {
	const month = signal("2026-10");
	return (
		<>
			<MonthPicker {...p} value={month()} onChange={month.set} />
			<Text muted>Selected: {month()}</Text>
		</>
	);
}

function DateRangePickerExample(p: ExampleProps) {
	const range = signal<DateRange>({ start: "2026-10-05", end: "2026-10-09" });
	return <DateRangePicker {...p} placeholder="Select dates" value={range()} onChange={range.set} />;
}

function TimePickerExample(p: ExampleProps) {
	const time = signal("09:30");
	return (
		<>
			<TimePicker {...p} value={time()} onChange={time.set} />
			<Text muted>Selected: {time()}</Text>
		</>
	);
}

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	{ name: "TextInput", render: (p) => <TextInputExample {...p} /> },
	{ name: "TextArea", render: (p) => <TextAreaExample {...p} /> },
	{ name: "Checkbox", host: "input", render: (p) => <CheckboxExample {...p} /> },
	{ name: "Switch", host: "input", render: (p) => <SwitchExample {...p} /> },
	{ name: "Select", render: (p) => <SelectExample {...p} /> },
	{ name: "RadioGroup", render: (p) => <RadioGroupExample {...p} /> },
	{ name: "Slider", render: (p) => <SliderExample {...p} /> },
	{ name: "NumberInput", host: "input", render: (p) => <NumberInputExample {...p} /> },
	{ name: "SearchInput", host: "input", render: (p) => <SearchInputExample {...p} /> },
	{ name: "Control", render: (p) => <ControlExample {...p} /> },
	{ name: "Help", render: (p) => <HelpExample {...p} /> },
	{ name: "FormSection", render: (p) => <FormSectionExample {...p} /> },
	{ name: "FormArea", render: (p) => <FormAreaExample {...p} /> },
	{ name: "FormField", render: (p) => <FormFieldExample {...p} /> },
	{ name: "PasswordInput", host: "input", render: (p) => <PasswordInputExample {...p} /> },
	{ name: "PinInput", render: (p) => <PinInputExample {...p} /> },
	{ name: "ColorInput", host: "input", render: (p) => <ColorInputExample {...p} /> },
	{ name: "DateInput", render: (p) => <DateInputExample {...p} /> },
	{ name: "TimeInput", render: (p) => <TimeInputExample {...p} /> },
	{ name: "JsonInput", render: (p) => <JsonInputExample {...p} /> },
	{ name: "NativeSelect", render: (p) => <NativeSelectExample {...p} /> },
	{ name: "Fieldset", render: (p) => <FieldsetExample {...p} /> },
	{ name: "CheckboxGroup", render: (p) => <CheckboxGroupExample {...p} /> },
	{ name: "Chip", render: (p) => <ChipExample {...p} /> },
	{ name: "ChipGroup", render: (p) => <ChipGroupExample {...p} /> },
	{ name: "Rating", render: (p) => <RatingExample {...p} /> },
	{ name: "RangeSlider", render: (p) => <RangeSliderExample {...p} /> },
	{ name: "MultiSelect", render: (p) => <MultiSelectExample {...p} /> },
	{ name: "TagsInput", render: (p) => <TagsInputExample {...p} /> },
	{ name: "Autocomplete", host: "input", render: (p) => <AutocompleteExample {...p} /> },
	{ name: "MonthPicker", render: (p) => <MonthPickerExample {...p} /> },
	{ name: "DateRangePicker", render: (p) => <DateRangePickerExample {...p} /> },
	{ name: "TimePicker", render: (p) => <TimePickerExample {...p} /> },
	{
		name: "SemiCircleProgress",
		render: (p) => <SemiCircleProgress {...p} value={64} label="64%" />,
	},
	{
		name: "Sparkline",
		render: (p) => <Sparkline {...p} label="Weekly signups" data={[12, 18, 15, 22, 28, 24, 35]} />,
	},
	{
		name: "CodeBlock",
		render: (p) => (
			<CodeBlock
				{...p}
				language="tsx"
				radius="lg"
				code={
					'import { Button } from "@arachne/ui";\n\nexport const Save = () => <Button>Save</Button>;'
				}
			/>
		),
	},
	// offset -1: visible at scrollY 0 so the contract can find it.
	{ name: "ToTop", render: (p) => <ToTop {...p} offset={-1} /> },
	{ name: "Countdown", render: (p) => <Countdown {...p} to={Date.now() + 3 * 86_400_000} /> },
];
