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
	TextArea,
	TextInput,
	TimeInput,
	TimePicker,
	ToTop,
} from "../src/index.ts";
import type { Example } from "./types.ts";

const noop = () => {};

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

/** One example per exported component of this group (showcase, docs and contract tests use these). */
export const examples: Example[] = [
	{
		name: "TextInput",
		render: (p) => <TextInput aria-label="Full name" {...p} placeholder="Ada Lovelace" value="" />,
	},
	{
		name: "TextArea",
		render: (p) => (
			<TextArea
				aria-label="Message"
				{...p}
				rows={3}
				placeholder="Tell us what happened…"
				value=""
			/>
		),
	},
	{
		name: "Checkbox",
		host: "input",
		render: (p) => <Checkbox {...p} label="Email me about product updates" checked />,
	},
	{
		name: "Switch",
		host: "input",
		render: (p) => <Switch {...p} label="Preview deploys" checked />,
	},
	{
		name: "Select",
		render: (p) => <Select aria-label="Plan" {...p} options={plans} value="pro" />,
	},
	{
		name: "RadioGroup",
		render: (p) => <RadioGroup {...p} label="Plan" name="plan" options={plans} value="pro" />,
	},
	{
		name: "Slider",
		render: (p) => <Slider aria-label="Volume" {...p} value={60} onChange={noop} />,
	},
	{
		name: "NumberInput",
		host: "input",
		render: (p) => <NumberInput aria-label="Seats" {...p} value={5} onChange={noop} />,
	},
	{
		name: "SearchInput",
		host: "input",
		render: (p) => <SearchInput aria-label="Search projects" {...p} value="" onChange={noop} />,
	},
	{
		name: "Control",
		render: (p) => (
			<FormField label="Email" labelFor="control-email">
				<Control {...p} expanded>
					<TextInput id="control-email" type="email" value="" placeholder="you@example.com" />
				</Control>
			</FormField>
		),
	},
	{
		name: "Help",
		render: (p) => (
			<FormField label="Username" labelFor="help-user">
				<TextInput id="help-user" value="ada" />
				<Help {...p} tone="success">
					This username is available.
				</Help>
			</FormField>
		),
	},
	{
		name: "FormSection",
		render: (p) => (
			<FormSection {...p} title="Profile" description="Shown on your public page.">
				<FormField label="Display name" labelFor="section-name">
					<TextInput id="section-name" value="Ada Lovelace" />
				</FormField>
			</FormSection>
		),
	},
	{
		name: "FormArea",
		render: (p) => (
			<FormArea
				{...p}
				order={3}
				title="Notifications"
				description="Choose what we email you about."
				bordered
			>
				<Checkbox label="Failed deploys" checked />
				<Checkbox label="Weekly summary" />
			</FormArea>
		),
	},
	{
		name: "FormField",
		render: (p) => (
			<FormField
				{...p}
				label="Project name"
				labelFor="field-project"
				help="Lowercase letters, numbers and dashes."
			>
				<TextInput id="field-project" value="marketing-site" />
			</FormField>
		),
	},
	{
		name: "PasswordInput",
		host: "input",
		render: (p) => <PasswordInput aria-label="Password" {...p} value="" onChange={noop} />,
	},
	{
		name: "PinInput",
		render: (p) => (
			<PinInput aria-label="Verification code" {...p} length={6} value="42" onChange={noop} />
		),
	},
	{
		name: "ColorInput",
		host: "input",
		render: (p) => <ColorInput aria-label="Brand colour" {...p} value="#4f46e5" onChange={noop} />,
	},
	{
		name: "DateInput",
		render: (p) => <DateInput aria-label="Start date" {...p} value="2026-10-01" onChange={noop} />,
	},
	{
		name: "TimeInput",
		render: (p) => <TimeInput aria-label="Start time" {...p} value="09:30" onChange={noop} />,
	},
	{
		name: "JsonInput",
		render: (p) => (
			<JsonInput
				aria-label="Config JSON"
				{...p}
				value={'{\n  "region": "fra1",\n  "replicas": 2\n}'}
				onChange={noop}
			/>
		),
	},
	{
		name: "NativeSelect",
		render: (p) => (
			<NativeSelect aria-label="Region" {...p} options={regions} value="fra1" onChange={noop} />
		),
	},
	{
		name: "Fieldset",
		render: (p) => (
			<Fieldset {...p} legend="Shipping address">
				<FormField label="Street" labelFor="fs-street">
					<TextInput id="fs-street" value="" />
				</FormField>
				<FormField label="City" labelFor="fs-city">
					<TextInput id="fs-city" value="" />
				</FormField>
			</Fieldset>
		),
	},
	{
		name: "CheckboxGroup",
		render: (p) => (
			<CheckboxGroup {...p} legend="Regions" options={regions} value={["fra1"]} onChange={noop} />
		),
	},
	{
		name: "Chip",
		render: (p) => (
			<Chip {...p} checked onChange={noop}>
				TypeScript
			</Chip>
		),
	},
	{
		name: "ChipGroup",
		render: (p) => (
			<ChipGroup
				{...p}
				legend="Frameworks"
				multiple
				options={[
					{ value: "arachne", label: "Arachne" },
					{ value: "solid", label: "Solid" },
					{ value: "svelte", label: "Svelte" },
				]}
				value={["arachne"]}
				onChange={noop}
			/>
		),
	},
	{
		name: "Rating",
		render: (p) => <Rating aria-label="Rating" {...p} value={4} onChange={noop} />,
	},
	{
		name: "RangeSlider",
		render: (p) => (
			<RangeSlider
				aria-label="Price range"
				{...p}
				min={0}
				max={200}
				value={[40, 120]}
				onChange={noop}
			/>
		),
	},
	{
		name: "MultiSelect",
		render: (p) => (
			<MultiSelect
				aria-label="Regions"
				{...p}
				options={regions}
				value={["fra1", "iad1"]}
				onChange={noop}
			/>
		),
	},
	{
		name: "TagsInput",
		render: (p) => (
			<TagsInput
				aria-label="Topics"
				{...p}
				placeholder="Add a topic"
				value={["signals", "ssr"]}
				onChange={noop}
			/>
		),
	},
	{
		name: "Autocomplete",
		host: "input",
		render: (p) => (
			<Autocomplete
				aria-label="Country"
				{...p}
				value=""
				options={["Germany", "Japan", "United Kingdom", "United States"]}
				onChange={noop}
			/>
		),
	},
	{ name: "MonthPicker", render: (p) => <MonthPicker {...p} value="2026-10" /> },
	{
		name: "DateRangePicker",
		render: (p) => (
			<DateRangePicker
				{...p}
				placeholder="Select dates"
				value={{ start: "2026-10-05", end: "2026-10-09" }}
				onChange={noop}
			/>
		),
	},
	{ name: "TimePicker", render: (p) => <TimePicker {...p} value="09:30" /> },
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
