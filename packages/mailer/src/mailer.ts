import type { SafeHtml } from "./html.ts";
import { type Address, type MailMessage, prepareMessage } from "./message.ts";
import type { MailTransport, SendResult } from "./transports.ts";

/** What a template renders. `text` is derived from `html` when omitted. */
export interface RenderedMail {
	/** Subject line. */
	subject: string;
	/** HTML body. */
	html?: string | SafeHtml;
	/** Plain-text body. */
	text?: string;
}

/** A template: data in, rendered mail out (sync or async). */
export type MailTemplate<D> = (data: D) => RenderedMail | Promise<RenderedMail>;

/** Identity helper that fixes a template's data type. */
export function defineTemplate<D>(template: MailTemplate<D>): MailTemplate<D> {
	return template;
}

/** Retry policy for transient transport failures. */
export interface RetryOptions {
	/** Total attempts (including the first). Default 1 (no retry). */
	attempts?: number;
	/** Delay before the second attempt; doubles each time. Default 500 ms. */
	delayMs?: number;
}

/** Options for {@link createMailer}. */
export interface MailerOptions<T extends Record<string, MailTemplate<never>>> {
	/** Delivery mechanism. */
	transport: MailTransport;
	/** Default sender. */
	from?: Address;
	/** Named templates for {@link Mailer.sendTemplate}. */
	templates?: T;
	/** Retry policy. */
	retry?: RetryOptions;
	/** Called after each delivery attempt fails. */
	onError?: (error: unknown, attempt: number) => void;
}

/** Envelope fields for a template send (everything except the rendered content). */
export type TemplateEnvelope = Omit<MailMessage, "subject" | "html" | "text">;

type TemplateData<T, K extends keyof T> = T[K] extends MailTemplate<infer D> ? D : never;

/** Sends mail. Structurally satisfies `@arachnejs/auth`'s `MailSender`. */
export interface Mailer<T extends Record<string, MailTemplate<never>> = Record<string, never>> {
	/** Validate and deliver one message. */
	send: (message: MailMessage) => Promise<SendResult>;
	/** Render a named template and deliver it. */
	sendTemplate: <K extends keyof T & string>(
		name: K,
		envelope: TemplateEnvelope,
		data: TemplateData<T, K>,
	) => Promise<SendResult>;
	/** The transport (e.g. to read a memory inbox). */
	readonly transport: MailTransport;
	/** Close the transport. */
	close: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a mailer. Messages are validated (addresses, single-line subject,
 * no header injection) before the transport sees them.
 *
 * @example
 * ```ts
 * const mailer = createMailer({
 *   transport: smtpTransport({ host: "smtp.example.com", port: 587, auth: { user, pass } }),
 *   from: "Shop <no-reply@shop.example>",
 *   templates: { welcome },
 *   retry: { attempts: 3 },
 * });
 * await mailer.sendTemplate("welcome", { to: user.email }, { name: user.name, url });
 * ```
 */
export function createMailer<T extends Record<string, MailTemplate<never>> = Record<string, never>>(
	options: MailerOptions<T>,
): Mailer<T> {
	const attempts = Math.max(1, options.retry?.attempts ?? 1);
	const delay = options.retry?.delayMs ?? 500;

	const send = async (message: MailMessage): Promise<SendResult> => {
		const outgoing = prepareMessage(message, options.from);
		let lastError: unknown;
		for (let attempt = 1; attempt <= attempts; attempt += 1) {
			try {
				return await options.transport.send(outgoing);
			} catch (error) {
				lastError = error;
				options.onError?.(error, attempt);
				if (attempt < attempts) await sleep(delay * 2 ** (attempt - 1));
			}
		}
		throw lastError;
	};

	return {
		send,
		async sendTemplate(name, envelope, data) {
			const template = options.templates?.[name] as MailTemplate<unknown> | undefined;
			if (!template) throw new Error(`unknown mail template "${name}"`);
			const rendered = await template(data);
			return send({
				...envelope,
				subject: rendered.subject,
				...(rendered.html === undefined ? {} : { html: rendered.html }),
				...(rendered.text === undefined ? {} : { text: rendered.text }),
			});
		},
		transport: options.transport,
		async close() {
			await options.transport.close?.();
		},
	};
}
