import { clearDelegatedEvents, delegateEvents, render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	Autocomplete,
	Checkbox,
	CheckboxGroup,
	Chip,
	ChipGroup,
	ColorInput,
	DateInput,
	Fieldset,
	FileInput,
	Icon,
	JsonInput,
	MultiSelect,
	NativeSelect,
	NumberInput,
	PasswordInput,
	PinInput,
	RadioGroup,
	RangeSlider,
	Rating,
	SearchInput,
	Segmented,
	Select,
	Slider,
	Switch,
	TagsInput,
	TextArea,
	TextInput,
	TimeInput,
} from "../index.ts";

export function run(root: HTMLElement) {
	clearDelegatedEvents();
	delegateEvents(["click", "input", "change", "keydown"]);

	const text = signal("hello");
	const area = signal("note");
	const sel = signal("a");
	const check = signal(false);
	const sw = signal(false);
	const radio = signal("x");
	const password = signal("secret");
	const pin = signal("");
	const qty = signal(2);
	const vol = signal(10);
	const query = signal("silk");
	const color = signal("#1e87f0");
	const date = signal("2026-09-28");
	const time = signal("15:30");
	const json = signal('{"ok":true}');
	const checks = signal<string[]>(["a"]);
	const chips = signal<string[]>(["x"]);
	const rating = signal(3);
	const range = signal<[number, number]>([10, 40]);
	const multi = signal<string[]>(["a"]);
	const tags = signal<string[]>(["one"]);
	const auto = signal("");
	const seg = signal("a");

	const opts = [
		{ value: "a", label: "Alpha" },
		{ value: "b", label: "Beta" },
	];

	render(
		() => (
			<div class="harness">
				<TextInput
					class="a-input-text"
					value={text()}
					onInput={(e: InputEvent) => text.set((e.target as HTMLInputElement).value)}
				/>
				<TextInput
					class="a-input-iconed"
					icon={<Icon name="key" />}
					value={text()}
					invalid
					onInput={(e: InputEvent) => text.set((e.target as HTMLInputElement).value)}
				/>
				<TextArea value={area()} onInput={() => {}} />
				<Select value={sel()} options={opts} onChange={() => {}} />
				<NativeSelect value={sel()} options={opts} onChange={() => {}} />
				<Checkbox checked={check()} label="Agree" onChange={() => check.set(!check())} />
				<Switch checked={sw()} label="Digest" onChange={() => sw.set(!sw())} />
				<RadioGroup
					name="lvl"
					value={radio()}
					options={[
						{ value: "x", label: "X" },
						{ value: "y", label: "Y" },
					]}
					onChange={(e: Event) => radio.set((e.target as HTMLInputElement).value)}
				/>
				<FileInput />
				<PasswordInput value={password()} onChange={(v) => password.set(v)} />
				<PinInput value={pin()} length={4} onChange={(v) => pin.set(v)} />
				<div class="a-number-wrap" data-test="number">
					<NumberInput value={qty()} min={0} max={5} onChange={(v) => qty.set(v)} />
				</div>
				<Slider value={vol()} onChange={(v) => vol.set(v)} />
				<SearchInput value={query()} onChange={(v) => query.set(v)} />
				<ColorInput value={color()} onChange={(v) => color.set(v)} />
				<DateInput value={date()} onChange={(v) => date.set(v)} />
				<TimeInput value={time()} onChange={(v) => time.set(v)} />
				<JsonInput value={json()} onChange={(v) => json.set(v)} />
				<Fieldset legend="Prefs">
					<CheckboxGroup value={checks()} options={opts} onChange={(v) => checks.set(v)} />
					<ChipGroup
						value={chips()}
						options={[
							{ value: "x", label: "X" },
							{ value: "y", label: "Y" },
						]}
						onChange={(v) => chips.set(v)}
					/>
					<Chip checked={false} onChange={() => {}}>
						Solo
					</Chip>
					<Rating value={rating()} onChange={(v) => rating.set(v)} />
				</Fieldset>
				<RangeSlider value={range()} onChange={(v) => range.set(v)} />
				<MultiSelect value={multi()} options={opts} onChange={(v) => multi.set(v)} />
				<TagsInput value={tags()} onChange={(v) => tags.set(v)} />
				<Autocomplete value={auto()} options={["alpha", "beta"]} onChange={(v) => auto.set(v)} />
				<Segmented
					value={seg()}
					onChange={(v) => seg.set(v)}
					items={[
						{ id: "a", label: "A" },
						{ id: "b", label: "B" },
					]}
				/>
			</div>
		),
		root,
	);

	return {
		get: (sel: string) => root.querySelector(sel),
		all: (sel: string) => root.querySelectorAll(sel),
		click: (sel: string) => {
			const el = root.querySelector(sel) as HTMLElement | null;
			el?.click();
		},
		setInput: (sel: string, value: string) => {
			const el = root.querySelector(sel) as HTMLInputElement | null;
			if (!el) return;
			el.value = value;
			el.dispatchEvent(new Event("input", { bubbles: true }));
		},
		signals: {
			text,
			rating,
			seg,
			qty,
			password,
			check,
			query,
		},
	};
}
