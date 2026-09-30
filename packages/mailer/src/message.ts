import { s, safeParse } from "@arachnejs/schema";
import { htmlToText, type SafeHtml } from "./html.ts";

/** An address: `"a@b.co"`, `"Ada <a@b.co>"` or `{ name, address }`. */
export type Address = string | { name?: string; address: string };

/** One attachment. */
export interface Attachment {
	/** File name shown to the recipient. */
	filename: string;
	/** File contents. */
	content: string | Uint8Array;
	/** MIME type; guessed from the file name when omitted. */
	contentType?: string;
	/** Content-ID for inline images (`<img src="cid:…">`). */
	cid?: string;
}

/** A message to send. Either `html` or `text` is required. */
export interface MailMessage {
	/** Sender; defaults to the mailer's `from`. */
	from?: Address;
	/** Recipients. */
	to: Address | readonly Address[];
	/** Carbon-copy recipients. */
	cc?: Address | readonly Address[];
	/** Blind carbon-copy recipients. */
	bcc?: Address | readonly Address[];
	/** Reply-To addresses. */
	replyTo?: Address | readonly Address[];
	/** Subject line (single line). */
	subject: string;
	/** HTML body. */
	html?: string | SafeHtml;
	/** Plain-text body; derived from `html` when omitted. */
	text?: string;
	/** Extra headers (e.g. `List-Unsubscribe`). */
	headers?: Record<string, string>;
	/** Attachments. */
	attachments?: readonly Attachment[];
	/** Free-form tags some providers support (analytics, suppression lists). */
	tags?: Record<string, string>;
}

/** A validated message as transports receive it. Addresses are formatted strings. */
export interface OutgoingMessage {
	/** Formatted sender. */
	from: string;
	/** Formatted recipients. */
	to: string[];
	/** Formatted CC recipients. */
	cc: string[];
	/** Formatted BCC recipients. */
	bcc: string[];
	/** Formatted Reply-To addresses. */
	replyTo: string[];
	/** Subject line. */
	subject: string;
	/** HTML body, if any. */
	html: string | undefined;
	/** Plain-text body (always present). */
	text: string;
	/** Extra headers. */
	headers: Record<string, string>;
	/** Attachments. */
	attachments: Attachment[];
	/** Provider tags. */
	tags: Record<string, string>;
	/** Generated `Message-ID` (transports may replace it). */
	messageId: string;
}

const email = s.email();
const NEWLINE = /[\r\n]/;

/** Thrown when a message is malformed. `field` names the offending part. */
export class MailError extends Error {
	/** Which field was invalid. */
	readonly field: string;

	constructor(field: string, message: string) {
		super(`${field}: ${message}`);
		this.name = "MailError";
		this.field = field;
	}
}

function formatAddress(field: string, value: Address): string {
	const { name, address } =
		typeof value === "string"
			? (() => {
					const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value);
					return match
						? { name: match[1] ?? "", address: match[2] ?? "" }
						: { name: "", address: value.trim() };
				})()
			: { name: value.name ?? "", address: value.address };
	if (safeParse(email, address).issues) throw new MailError(field, `invalid address "${address}"`);
	if (NEWLINE.test(name)) throw new MailError(field, "line breaks are not allowed in names");
	if (!name) return address;
	const quoted = /[",;<>@()[\]\\]/.test(name) ? `"${name.replace(/(["\\])/g, "\\$1")}"` : name;
	return `${quoted} <${address}>`;
}

function list(field: string, value: Address | readonly Address[] | undefined): string[] {
	if (value === undefined) return [];
	const items = Array.isArray(value) ? (value as readonly Address[]) : [value as Address];
	return items.map((item) => formatAddress(field, item));
}

function domainOf(address: string): string {
	return /@([^>\s]+)>?$/.exec(address)?.[1] ?? "localhost";
}

/** Validate and normalise a message. Throws {@link MailError}. */
export function prepareMessage(
	message: MailMessage,
	defaultFrom: Address | undefined,
): OutgoingMessage {
	const fromValue = message.from ?? defaultFrom;
	if (!fromValue) throw new MailError("from", "no sender (pass from, or set it on the mailer)");
	const from = formatAddress("from", fromValue);
	const to = list("to", message.to);
	if (to.length === 0) throw new MailError("to", "at least one recipient is required");
	if (!message.subject || NEWLINE.test(message.subject)) {
		throw new MailError("subject", "must be a non-empty single line");
	}
	for (const [name, value] of Object.entries(message.headers ?? {})) {
		if (NEWLINE.test(name) || NEWLINE.test(value))
			throw new MailError("headers", `line break in "${name}"`);
	}
	const html = message.html === undefined ? undefined : String(message.html);
	if (html === undefined && message.text === undefined)
		throw new MailError("body", "html or text is required");
	return {
		from,
		to,
		cc: list("cc", message.cc),
		bcc: list("bcc", message.bcc),
		replyTo: list("replyTo", message.replyTo),
		subject: message.subject,
		html,
		text: message.text ?? htmlToText(html ?? ""),
		headers: { ...message.headers },
		attachments: [...(message.attachments ?? [])],
		tags: { ...message.tags },
		messageId: `<${crypto.randomUUID()}@${domainOf(from)}>`,
	};
}
