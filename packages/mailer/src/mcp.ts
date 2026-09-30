import { defineMcpModule, jsonResult, textResult, toolName } from "@arachne/mcp";
import MailComposer from "nodemailer/lib/mail-composer/index.js";
import { z } from "zod";
import { htmlToText } from "./html.ts";
import { type MailMessage, prepareMessage } from "./message.ts";

const address = z.union([
	z.string(),
	z.object({ name: z.string().optional(), address: z.string() }),
]);
const addresses = z.union([address, z.array(address)]);

/** MCP tools for previewing and checking mail with `@arachne/mailer`. */
export const mcpModule = defineMcpModule({
	name: "mailer",
	version: "0.0.1",
	tools: [
		{
			name: toolName("mailer", "preview"),
			description:
				"Validate a message (addresses, single-line subject, headers) and return the normalised message, derived text body and raw .eml source. Nothing is sent.",
			inputSchema: {
				message: z.object({
					from: address,
					to: addresses,
					cc: addresses.optional(),
					bcc: addresses.optional(),
					replyTo: addresses.optional(),
					subject: z.string(),
					html: z.string().optional(),
					text: z.string().optional(),
					headers: z.record(z.string()).optional(),
				}),
			},
			handler: async (args) => {
				try {
					const message = prepareMessage(args["message"] as MailMessage, undefined);
					const eml = await new MailComposer({
						from: message.from,
						to: message.to,
						cc: message.cc,
						subject: message.subject,
						text: message.text,
						...(message.html === undefined ? {} : { html: message.html }),
						headers: message.headers,
						messageId: message.messageId,
					})
						.compile()
						.build();
					return jsonResult({ ...message, eml: eml.toString("utf8") });
				} catch (error) {
					return jsonResult({ error: (error as Error).message }, true);
				}
			},
		},
		{
			name: toolName("mailer", "html_to_text"),
			description: "Derive the plain-text alternative the mailer would send for an HTML body.",
			inputSchema: { html: z.string() },
			handler: (args) => textResult(htmlToText(String(args["html"]))),
		},
		{
			name: toolName("mailer", "api_summary"),
			description: "Summarize @arachne/mailer public API.",
			handler: () =>
				textResult(
					[
						"createMailer({ transport, from, templates, retry }) → send(message) · sendTemplate(name, envelope, data)",
						"message: { from?, to, cc?, bcc?, replyTo?, subject, html?, text?, headers?, attachments?, tags? }",
						"defineTemplate((data) => ({ subject, html, text? })) · mailHtml`…${escaped}` · raw(trusted)",
						"transports: smtpTransport(nodemailer options) · resendTransport({ apiKey }) · memoryTransport() · fileTransport({ dir }) · consoleTransport()",
						"htmlToText(html) — text alternative is derived automatically",
					].join("\n"),
				),
		},
	],
	resources: [
		{
			name: "arachne-mailer-readme",
			uri: "arachne://mailer/readme",
			mimeType: "text/markdown",
			read: async () => ({ text: await Bun.file(new URL("../README.md", import.meta.url)).text() }),
		},
	],
});

export default mcpModule;
