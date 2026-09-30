export { escapeHtml, htmlToText, mailHtml, raw, SafeHtml } from "./html.ts";
export {
	createMailer,
	defineTemplate,
	type Mailer,
	type MailerOptions,
	type MailTemplate,
	type RenderedMail,
	type RetryOptions,
	type TemplateEnvelope,
} from "./mailer.ts";
export {
	type Address,
	type Attachment,
	MailError,
	type MailMessage,
	type OutgoingMessage,
	prepareMessage,
} from "./message.ts";
export {
	consoleTransport,
	type FileTransportOptions,
	fileTransport,
	type MailTransport,
	type MemoryTransport,
	memoryTransport,
	type ResendOptions,
	resendTransport,
	type SendResult,
	type SmtpOptions,
	smtpTransport,
} from "./transports.ts";
