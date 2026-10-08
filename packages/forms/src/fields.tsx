import { Show } from "@arachnejs/render";
import {
	Button,
	Checkbox,
	Column,
	type ColumnSize,
	Columns,
	FormArea,
	FormField,
	FormSection,
	RadioGroup,
	type RadioOption,
	Select,
	type SelectOption,
	Switch,
	Text,
	TextArea,
	TextInput,
} from "@arachnejs/ui";
import type { FormApi } from "./create-form.ts";

export type TextFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	type?: string | undefined;
	placeholder?: string | undefined;
	help?: string | undefined;
	horizontal?: boolean | undefined;
	/** Leading icon inside the field (see `TextInput` `icon`). */
	icon?: unknown;
	/** Passed to the input, e.g. `email`, `one-time-code`. */
	autocomplete?: string | undefined;
};

export function TextField<T extends Record<string, unknown>>(props: TextFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField
			label={props.label}
			labelFor={props.form.fieldId(props.name)}
			help={props.help}
			error={error()}
			horizontal={props.horizontal}
		>
			<TextInput
				id={props.form.fieldId(props.name)}
				name={props.name}
				type={props.type ?? "text"}
				placeholder={props.placeholder}
				icon={props.icon}
				autocomplete={props.autocomplete}
				value={String(props.form.get(props.name) ?? "")}
				invalid={Boolean(error())}
				onInput={(e: InputEvent) => {
					const raw = (e.target as HTMLInputElement).value;
					if (props.type === "number") {
						const n = raw === "" ? ("" as never) : Number(raw);
						props.form.set(props.name, n as T[keyof T & string]);
						return;
					}
					props.form.set(props.name, raw as T[keyof T & string]);
				}}
			/>
		</FormField>
	);
}

export type TextAreaFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	placeholder?: string | undefined;
	rows?: number | undefined;
	help?: string | undefined;
	horizontal?: boolean | undefined;
};

export function TextAreaField<T extends Record<string, unknown>>(props: TextAreaFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField
			label={props.label}
			labelFor={props.form.fieldId(props.name)}
			help={props.help}
			error={error()}
			horizontal={props.horizontal}
		>
			<TextArea
				id={props.form.fieldId(props.name)}
				name={props.name}
				placeholder={props.placeholder}
				rows={props.rows}
				value={String(props.form.get(props.name) ?? "")}
				invalid={Boolean(error())}
				onInput={(e: InputEvent) => {
					props.form.set(
						props.name,
						(e.target as HTMLTextAreaElement).value as T[keyof T & string],
					);
				}}
			/>
		</FormField>
	);
}

export type CheckboxFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	help?: string | undefined;
};

export function CheckboxField<T extends Record<string, unknown>>(props: CheckboxFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField help={props.help} error={error()}>
			<Checkbox
				id={props.form.fieldId(props.name)}
				name={props.name}
				label={props.label}
				checked={Boolean(props.form.get(props.name))}
				invalid={Boolean(error())}
				onChange={(e: Event) => {
					props.form.set(props.name, (e.target as HTMLInputElement).checked as T[keyof T & string]);
				}}
			/>
		</FormField>
	);
}

export type SwitchFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	help?: string | undefined;
};

export function SwitchField<T extends Record<string, unknown>>(props: SwitchFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField help={props.help} error={error()}>
			<Switch
				id={props.form.fieldId(props.name)}
				name={props.name}
				label={props.label}
				checked={Boolean(props.form.get(props.name))}
				onChange={(e: Event) => {
					props.form.set(props.name, (e.target as HTMLInputElement).checked as T[keyof T & string]);
				}}
			/>
		</FormField>
	);
}

export type SelectFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	options: SelectOption[];
	placeholder?: string | undefined;
	help?: string | undefined;
	horizontal?: boolean | undefined;
};

export function SelectField<T extends Record<string, unknown>>(props: SelectFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField
			label={props.label}
			labelFor={props.form.fieldId(props.name)}
			help={props.help}
			error={error()}
			horizontal={props.horizontal}
		>
			<Select
				id={props.form.fieldId(props.name)}
				name={props.name}
				options={props.options}
				placeholder={props.placeholder}
				value={String(props.form.get(props.name) ?? "")}
				invalid={Boolean(error())}
				onChange={(e: Event) => {
					props.form.set(props.name, (e.target as HTMLSelectElement).value as T[keyof T & string]);
				}}
			/>
		</FormField>
	);
}

export type RadioFieldProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	name: keyof T & string;
	label: string;
	options: RadioOption[];
	help?: string | undefined;
	horizontal?: boolean | undefined;
};

export function RadioField<T extends Record<string, unknown>>(props: RadioFieldProps<T>) {
	const error = () => props.form.errors()[props.name];
	return (
		<FormField label={props.label} help={props.help} error={error()} horizontal={props.horizontal}>
			<RadioGroup
				name={props.name}
				value={String(props.form.get(props.name) ?? "")}
				options={props.options}
				onChange={(e: Event) => {
					props.form.set(props.name, (e.target as HTMLInputElement).value as T[keyof T & string]);
				}}
			/>
		</FormField>
	);
}

export type FormWhenProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	/** Return true to render children. Reads `form.values()` reactively. */
	match: (values: T) => boolean;
	fallback?: unknown;
	children?: unknown;
};

/** Show children only when related form values match (field relationships). */
export function FormWhen<T extends Record<string, unknown>>(props: FormWhenProps<T>) {
	return (
		<Show when={props.match(props.form.values())} fallback={props.fallback ?? null}>
			{props.children}
		</Show>
	);
}

export type FormColumnsProps = {
	mobile?: boolean | undefined;
	gap?: string | undefined;
	class?: string | undefined;
	children?: unknown;
};

/** Multi-column form row. */
export function FormColumns(props: FormColumnsProps) {
	return (
		<Columns mobile={props.mobile} gap={props.gap} class={props.class}>
			{props.children}
		</Columns>
	);
}

export type FormColumnProps = {
	size?: ColumnSize | undefined;
	class?: string | undefined;
	children?: unknown;
};

export function FormColumn(props: FormColumnProps) {
	return (
		<Column size={props.size} class={props.class}>
			{props.children}
		</Column>
	);
}

export type FormProps<T extends Record<string, unknown>> = {
	form: FormApi<T>;
	children?: unknown;
	submitLabel?: string | undefined;
	/** Hide the built-in submit button (use your own in a FormField grouped row). */
	hideSubmit?: boolean | undefined;
	class?: string | undefined;
};

export function Form<T extends Record<string, unknown>>(props: FormProps<T>) {
	return (
		<form
			class={props.class}
			onSubmit={(e: Event) => {
				e.preventDefault();
				void props.form.submit();
			}}
		>
			{props.children}
			{props.hideSubmit ? null : (
				<FormField grouped>
					<Button type="submit" disabled={props.form.submitting()}>
						{props.submitLabel ?? "Submit"}
					</Button>
				</FormField>
			)}
			{props.form.errors()["_form"] ? <Text danger>{props.form.errors()["_form"]}</Text> : null}
		</form>
	);
}

export { FormArea, FormField, FormSection };
