import { render } from "@arachnejs/render";
import { signal } from "@arachnejs/signals";
import {
	Autocomplete,
	Checkbox,
	FormField,
	FormSection,
	NativeSelect,
	NumberInput,
	PinInput,
	Rating,
	Select,
	SemiCircleProgress,
	Sparkline,
	TagsInput,
	TextInput,
	TimePicker,
} from "../index.ts";

export function run(root: HTMLElement) {
	const err = signal<string | undefined>(undefined);
	const pin = signal("");
	const text = signal("abc");
	const checked = signal(false);
	const opts = signal<Array<{ value: string; label: string }>>([]);
	const sel = signal("b");
	const num = signal(10);
	const ac = signal("");
	const rating = signal(2);
	const count = signal(5);
	const tags = signal<string[]>(["React"]);
	const semi = signal(10);
	const spark = signal([1, 2, 3]);

	const dispose = render(
		() => (
			<div>
				<FormSection data-test="section-default" title="Default level" />
				<FormSection data-test="section-h2" order={2} title="Top level" />
				<FormField label="Email" labelFor="email" error={err()} help="We never share it">
					<TextInput id="email" value="" />
				</FormField>
				<div data-test="pin">
					<PinInput value={pin()} length={4} onChange={(v) => pin.set(v)} />
				</div>
				<TextInput
					data-test="reject"
					value={text()}
					onInput={(e: InputEvent) => {
						const v = (e.target as HTMLInputElement).value;
						if (v.length <= 3) text.set(v);
					}}
				/>
				<Checkbox id="locked" checked={checked()} onChange={() => undefined} />
				<Select id="async-select" value={sel()} options={opts()} />
				<NativeSelect
					id="async-native"
					value={sel()}
					options={opts()}
					onChange={(v) => sel.set(v)}
				/>
				<NumberInput
					id="num"
					value={num()}
					min={10}
					max={50}
					step={0.1}
					onChange={(v) => num.set(v)}
				/>
				<Autocomplete
					id="ac"
					value={ac()}
					options={["Apple", "Apricot", "Banana"]}
					onChange={(v) => ac.set(v)}
				/>
				<Rating value={rating()} count={count()} onChange={(v) => rating.set(v)} />
				<TagsInput value={tags()} onChange={(v) => tags.set(v)} />
				<SemiCircleProgress value={semi()} />
				<Sparkline data={spark()} />
				<TimePicker value="09:00" minutesStep={0} />
			</div>
		),
		root,
	);
	return { dispose, err, pin, text, checked, opts, sel, num, ac, rating, count, tags, semi, spark };
}
