import { createUniqueId } from "@arachne/render";
import type { Schema } from "@arachne/schema";
import { formatIssues, safeParse } from "@arachne/schema";
import { type Signal, signal } from "@arachne/signals";

export type FormErrors = Record<string, string>;

export interface CreateFormOptions<T extends Record<string, unknown>> {
	schema: Schema<T>;
	initial: T;
	onSubmit: (values: T) => void | Promise<void>;
	/** Prefix for generated field ids (default: unique per form). */
	id?: string | undefined;
}

export interface FormApi<T extends Record<string, unknown>> {
	values: () => T;
	errors: () => FormErrors;
	submitting: () => boolean;
	get: <K extends keyof T & string>(name: K) => T[K];
	set: <K extends keyof T & string>(name: K, value: T[K]) => void;
	setValues: (next: T) => void;
	validate: () => boolean;
	submit: () => Promise<boolean>;
	reset: () => void;
	/** Form id prefix. */
	id: string;
	/** DOM id for a field — unique across forms on the page. */
	fieldId: (name: string) => string;
}

function segment(key: unknown): string {
	return typeof key === "object" && key && "key" in key
		? String((key as { key: unknown }).key)
		: String(key);
}

/** Map issues to `{ "address.city": message }`; path-less issues go to `_form`. */
function mapIssues(issues: NonNullable<ReturnType<typeof safeParse>["issues"]>): FormErrors {
	const mapped: FormErrors = {};
	for (const issue of issues) {
		const path = issue.path ?? [];
		const name = path.length ? path.map(segment).join(".") : "_form";
		if (!mapped[name]) mapped[name] = issue.message;
	}
	if (Object.keys(mapped).length === 0) {
		mapped["_form"] = formatIssues(issues);
	}
	return mapped;
}

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: typeof error === "string"
			? error
			: "Submit failed";
}

export function createForm<T extends Record<string, unknown>>(
	options: CreateFormOptions<T>,
): FormApi<T> {
	const values = signal({ ...options.initial }) as Signal<T>;
	const errors = signal<FormErrors>({});
	const submitting = signal(false);
	const id = options.id ?? `form-${createUniqueId()}`;

	const api: FormApi<T> = {
		id,
		fieldId: (name) => `${id}-${name}`,
		values: () => values(),
		errors: () => errors(),
		submitting: () => submitting(),
		get(name) {
			return values()[name];
		},
		set(name, value) {
			values.set({ ...values(), [name]: value });
			const next = { ...errors() };
			delete next[name];
			errors.set(next);
		},
		setValues(next) {
			values.set({ ...next });
		},
		validate() {
			const result = safeParse(options.schema, values());
			if (!result.issues) {
				errors.set({});
				return true;
			}
			errors.set(mapIssues(result.issues));
			return false;
		},
		async submit() {
			if (submitting.peek()) return false;
			if (!api.validate()) return false;
			submitting.set(true);
			try {
				await options.onSubmit(values());
				return true;
			} catch (error) {
				errors.set({ ...errors(), _form: errorMessage(error) });
				return false;
			} finally {
				submitting.set(false);
			}
		},
		reset() {
			values.set({ ...options.initial });
			errors.set({});
		},
	};

	return api;
}
