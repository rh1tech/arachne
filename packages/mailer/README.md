# @arachne/mailer

Email for Arachne: validated messages, typed templates, automatic plain-text
alternatives, retries, and transports for SMTP (nodemailer), Resend, memory,
`.eml` files and the console.

```ts
import { createMailer, defineTemplate, mailHtml, smtpTransport } from "@arachne/mailer";

const verifyEmail = defineTemplate((data: { name: string; url: string }) => ({
  subject: "Confirm your email",
  html: mailHtml`<p>Hi ${data.name},</p><p><a href="${data.url}">Confirm your email</a></p>`,
  // text is derived: "Hi Ada,\n\nConfirm your email (https://…)"
}));

export const mailer = createMailer({
  transport: smtpTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  }),
  from: "Shop <no-reply@shop.example>",
  templates: { verifyEmail },
  retry: { attempts: 3, delayMs: 500 }, // 500 ms, then 1 s
});

await mailer.sendTemplate("verifyEmail", { to: user.email }, { name: user.name, url });
await mailer.send({
  to: [{ name: "Ada", address: "ada@example.com" }],
  subject: "Invoice",
  html: "<p>Attached.</p>",
  attachments: [{ filename: "invoice.pdf", content: pdfBytes }],
});
```

- `mailHtml` escapes every interpolated value; nest `mailHtml` or `raw()` for trusted markup.
- Addresses (`"a@b.co"`, `"Ada <a@b.co>"`, `{ name, address }`) are validated;
  subjects and headers containing line breaks are rejected (header injection).
- `text` is derived from `html` when omitted (`htmlToText`).

## Transports

| Transport | Use |
|---|---|
| `smtpTransport(options)` | Any SMTP server; nodemailer options (`secure`, `auth`, `pool`, `dkim`, …) |
| `resendTransport({ apiKey })` | Resend HTTP API |
| `memoryTransport()` | Tests and the dev inbox: `sent`, `last(to)`, `links(to)`, `clear()` |
| `fileTransport({ dir })` | Writes `.eml` files you can open in a mail client |
| `consoleTransport()` | Logs a summary |

Implement `MailTransport` (`{ name, send(message), close? }`) for other providers.

## With auth

`Mailer` satisfies `@arachne/auth`'s structural `MailSender`, so pass it
straight to `createAuth({ mailer })`.

## MCP

`arachne_mailer_preview` (validate + derived text + raw `.eml`, no sending),
`arachne_mailer_html_to_text`, `arachne_mailer_api_summary`.
