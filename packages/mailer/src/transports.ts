import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import nodemailer from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import type { OutgoingMessage } from "./message.ts";

/** What a transport reports after accepting a message. */
export interface SendResult {
	/** Message id assigned by the transport or provider. */
	messageId: string;
}

/** Delivers prepared messages. */
export interface MailTransport {
	/** Transport name for logs. */
	readonly name: string;
	/** Deliver one message. Throw on failure (the mailer may retry). */
	send: (message: OutgoingMessage) => Promise<SendResult>;
	/** Release connections. */
	close?: () => void | Promise<void>;
}

/** Transport that keeps messages in memory (tests and the dev inbox). */
export interface MemoryTransport extends MailTransport {
	/** Every message, oldest first. */
	readonly sent: OutgoingMessage[];
	/** Latest message, optionally the latest sent to `recipient`. */
	last: (recipient?: string) => OutgoingMessage | undefined;
	/** URLs found in messages to `recipient` (text body), oldest first. */
	links: (recipient?: string) => string[];
	/** Forget all messages. */
	clear: () => void;
}

const URL_PATTERN = /https?:\/\/[^\s<>()"']+/g;

/** Keep messages in memory. */
export function memoryTransport(): MemoryTransport {
	const sent: OutgoingMessage[] = [];
	const to = (recipient?: string) =>
		recipient ? sent.filter((m) => m.to.some((address) => address.includes(recipient))) : sent;
	return {
		name: "memory",
		sent,
		async send(message) {
			sent.push(message);
			return { messageId: message.messageId };
		},
		last: (recipient) => to(recipient).at(-1),
		links: (recipient) => to(recipient).flatMap((m) => m.text.match(URL_PATTERN) ?? []),
		clear() {
			sent.length = 0;
		},
	};
}

/** Print a summary of each message (development). */
export function consoleTransport(log: (line: string) => void = console.info): MailTransport {
	return {
		name: "console",
		async send(message) {
			log(`[mail] ${message.from} → ${message.to.join(", ")}: ${message.subject}\n${message.text}`);
			return { messageId: message.messageId };
		},
	};
}

function nodemailerMessage(message: OutgoingMessage) {
	return {
		messageId: message.messageId,
		from: message.from,
		to: message.to,
		cc: message.cc,
		bcc: message.bcc,
		replyTo: message.replyTo,
		subject: message.subject,
		text: message.text,
		...(message.html === undefined ? {} : { html: message.html }),
		headers: message.headers,
		attachments: message.attachments.map((attachment) => ({
			filename: attachment.filename,
			content:
				typeof attachment.content === "string"
					? attachment.content
					: Buffer.from(attachment.content),
			...(attachment.contentType ? { contentType: attachment.contentType } : {}),
			...(attachment.cid ? { cid: attachment.cid } : {}),
		})),
	};
}

/** Options for {@link fileTransport}. */
export interface FileTransportOptions {
	/** Directory for `.eml` files (created if missing). */
	dir: string;
}

/** Write each message as an RFC 5322 `.eml` file (open it in any mail client). */
export function fileTransport(options: FileTransportOptions): MailTransport {
	return {
		name: "file",
		async send(message) {
			await mkdir(options.dir, { recursive: true });
			const raw = await new MailComposer(nodemailerMessage(message)).compile().build();
			const safeId = message.messageId.replace(/[^A-Za-z0-9.-]/g, "");
			await writeFile(join(options.dir, `${Date.now()}-${safeId}.eml`), raw);
			return { messageId: message.messageId };
		},
	};
}

/** SMTP connection options (nodemailer's, e.g. `host`, `port`, `secure`, `auth`, `pool`, `dkim`). */
export type SmtpOptions = SMTPTransport.Options;

/** Deliver over SMTP (STARTTLS, auth, pooling and DKIM via nodemailer). */
export function smtpTransport(options: SmtpOptions): MailTransport {
	const transporter = nodemailer.createTransport(options);
	return {
		name: "smtp",
		async send(message) {
			const info = await transporter.sendMail(nodemailerMessage(message));
			return { messageId: info.messageId ?? message.messageId };
		},
		close: () => transporter.close(),
	};
}

/** Options for {@link resendTransport}. */
export interface ResendOptions {
	/** Resend API key (`re_…`); read it from the environment. */
	apiKey: string;
	/** API base. Default `https://api.resend.com`. */
	baseUrl?: string;
	/** Fetch implementation (tests). */
	fetch?: (request: Request) => Promise<Response>;
}

function base64(content: string | Uint8Array): string {
	return Buffer.from(content).toString("base64");
}

/** Deliver through the Resend HTTP API. */
export function resendTransport(options: ResendOptions): MailTransport {
	const doFetch = options.fetch ?? ((request: Request) => fetch(request));
	return {
		name: "resend",
		async send(message) {
			const response = await doFetch(
				new Request(`${options.baseUrl ?? "https://api.resend.com"}/emails`, {
					method: "POST",
					headers: {
						authorization: `Bearer ${options.apiKey}`,
						"content-type": "application/json",
					},
					body: JSON.stringify({
						from: message.from,
						to: message.to,
						cc: message.cc,
						bcc: message.bcc,
						reply_to: message.replyTo,
						subject: message.subject,
						html: message.html,
						text: message.text,
						headers: message.headers,
						attachments: message.attachments.map((a) => ({
							filename: a.filename,
							content: base64(a.content),
						})),
						tags: Object.entries(message.tags).map(([name, value]) => ({ name, value })),
					}),
				}),
			);
			const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
			if (!response.ok) throw new Error(`resend: ${body.message ?? `HTTP ${response.status}`}`);
			return { messageId: body.id ?? message.messageId };
		},
	};
}
