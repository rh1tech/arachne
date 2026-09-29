import {
	Autocomplete,
	Buttons,
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
} from "../index.ts";
import { type ContractCase, runContract } from "../test-utils/contract.tsx";

const noop = () => {};
const opts = [
	{ value: "a", label: "A" },
	{ value: "b", label: "B" },
];

/** Register every exported component of this group (see test-utils/contract.tsx). */
export const cases: ContractCase[] = [
	{ name: "TextInput", render: (p) => <TextInput {...p} value="" /> },
	{ name: "TextArea", render: (p) => <TextArea {...p} value="" /> },
	{ name: "Checkbox", host: "input", render: (p) => <Checkbox {...p} label="Agree" /> },
	{ name: "Switch", host: "input", render: (p) => <Switch {...p} label="On" /> },
	{ name: "Select", render: (p) => <Select {...p} options={opts} value="a" /> },
	{ name: "RadioGroup", render: (p) => <RadioGroup {...p} name="r" options={opts} value="a" /> },
	{ name: "Slider", render: (p) => <Slider {...p} value={5} onChange={noop} /> },
	{
		name: "NumberInput",
		host: "input",
		render: (p) => <NumberInput {...p} value={1} onChange={noop} />,
	},
	{
		name: "SearchInput",
		host: "input",
		render: (p) => <SearchInput {...p} value="q" onChange={noop} />,
	},
	{ name: "Control", render: (p) => <Control {...p}>x</Control> },
	{ name: "Help", render: (p) => <Help {...p}>hint</Help> },
	{ name: "FormSection", render: (p) => <FormSection {...p} title="S" /> },
	{ name: "FormArea", render: (p) => <FormArea {...p} title="A" /> },
	{ name: "FormField", render: (p) => <FormField {...p} label="L" help="h" /> },
	{ name: "Buttons", render: (p) => <Buttons {...p} /> },
	{
		name: "PasswordInput",
		host: "input",
		render: (p) => <PasswordInput {...p} value="" onChange={noop} />,
	},
	{ name: "PinInput", render: (p) => <PinInput {...p} value="12" onChange={noop} /> },
	{
		name: "ColorInput",
		host: "input",
		render: (p) => <ColorInput {...p} value="#000000" onChange={noop} />,
	},
	{ name: "DateInput", render: (p) => <DateInput {...p} value="2026-01-01" onChange={noop} /> },
	{ name: "TimeInput", render: (p) => <TimeInput {...p} value="10:00" onChange={noop} /> },
	{ name: "JsonInput", render: (p) => <JsonInput {...p} value="{}" onChange={noop} /> },
	{
		name: "NativeSelect",
		render: (p) => <NativeSelect {...p} options={opts} value="a" onChange={noop} />,
	},
	{ name: "Fieldset", render: (p) => <Fieldset {...p} legend="L" /> },
	{
		name: "CheckboxGroup",
		render: (p) => <CheckboxGroup {...p} options={opts} value={[]} onChange={noop} />,
	},
	{ name: "Chip", render: (p) => <Chip {...p}>c</Chip> },
	{
		name: "ChipGroup",
		render: (p) => <ChipGroup {...p} options={opts} value={[]} onChange={noop} />,
	},
	{ name: "Rating", render: (p) => <Rating {...p} value={2} onChange={noop} /> },
	{ name: "RangeSlider", render: (p) => <RangeSlider {...p} value={[1, 5]} onChange={noop} /> },
	{
		name: "MultiSelect",
		render: (p) => <MultiSelect {...p} options={opts} value={[]} onChange={noop} />,
	},
	{ name: "TagsInput", render: (p) => <TagsInput {...p} value={["x"]} onChange={noop} /> },
	{
		name: "Autocomplete",
		host: "input",
		render: (p) => <Autocomplete {...p} value="" options={["a"]} onChange={noop} />,
	},
	{ name: "MonthPicker", render: (p) => <MonthPicker {...p} value="2026-01" /> },
	{ name: "DateRangePicker", render: (p) => <DateRangePicker {...p} value={{}} onChange={noop} /> },
	{ name: "TimePicker", render: (p) => <TimePicker {...p} value="10:00" /> },
	{ name: "SemiCircleProgress", render: (p) => <SemiCircleProgress {...p} value={40} /> },
	{ name: "Sparkline", render: (p) => <Sparkline {...p} data={[1, 3, 2]} /> },
	{ name: "CodeBlock", render: (p) => <CodeBlock {...p} code="const a = 1;" /> },
	// offset -1: visible at scrollY 0 so the contract can find it.
	{ name: "ToTop", render: (p) => <ToTop {...p} offset={-1} /> },
	{ name: "Countdown", render: (p) => <Countdown {...p} to={Date.now() + 60_000} /> },
];

export function run(root: HTMLElement) {
	return runContract(root, cases);
}
