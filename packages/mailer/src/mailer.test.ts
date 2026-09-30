import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	createMailer,
	defineTemplate,
	fileTransport,
	htmlToText,
	mailHtml,
	memoryTransport,
	resendTransport,
	smtpTransport,
} from "./index.ts";

const welcome = defineTemplate((data: { name: string; url: string }) => ({
	subject: `Welcome, ${data.name}`,
	html: mailHtml`<h1>Hi ${data.name}</h1><p><a href="${data.url}">Confirm your email</a></p>`,
}));

describe("createMailer", () => {
	test("sends with defaults, validates addresses and derives text from HTML", async () => {
		const transport = memoryTransport();
		const mailer = createMailer({ transport, from: "Arachne <no-reply@arachne.dev>" });
		const result = await mailer.send({
			to: "ada@example.com",
			subject: "Hello",
			html: "<p>Hi <b>Ada</b></p>",
		});
		expect(result.messageId).toBeString();
		expect(transport.sent).toHaveLength(1);
		expect(transport.sent[0]).toMatchObject({
			from: "Arachne <no-reply@arachne.dev>",
			to: ["ada@example.com"],
			subject: "Hello",
			text: "Hi Ada",
		});
		await expect(mailer.send({ to: "not-an-email", subject: "x", text: "y" })).rejects.toThrow(
			"to",
		);
		await expect(mailer.send({ to: "a@b.co", subject: "x" })).rejects.toThrow("html or text");
	});

	test("typed templates render subject, html and text", async () => {
		const transport = memoryTransport();
		const mailer = createMailer({
			transport,
			from: "no-reply@arachne.dev",
			templates: { welcome },
		});
		await mailer.sendTemplate(
			"welcome",
			{ to: "ada@example.com" },
			{ name: "Ada <3", url: "https://x.io/?a=1&b=2" },
		);
		const sent = transport.sent[0];
		expect(sent?.subject).toBe("Welcome, Ada <3");
		expect(sent?.html).toContain("<h1>Hi Ada &lt;3</h1>");
		expect(sent?.html).toContain('href="https://x.io/?a=1&amp;b=2"');
		expect(sent?.text).toContain("Confirm your email (https://x.io/?a=1&b=2)");
	});

	test("retries transient failures", async () => {
		let calls = 0;
		const flaky = {
			name: "flaky",
			async send() {
				calls += 1;
				if (calls < 3) throw new Error("ECONNRESET");
				return { messageId: "ok" };
			},
		};
		const mailer = createMailer({
			transport: flaky,
			from: "a@b.co",
			retry: { attempts: 3, delayMs: 1 },
		});
		expect((await mailer.send({ to: "c@d.co", subject: "s", text: "t" })).messageId).toBe("ok");
		expect(calls).toBe(3);
	});

	test("rejects header injection in subjects", async () => {
		const mailer = createMailer({ transport: memoryTransport(), from: "a@b.co" });
		await expect(
			mailer.send({ to: "c@d.co", subject: "Hi\r\nBcc: evil@x.io", text: "t" }),
		).rejects.toThrow("subject");
	});
});

describe("htmlToText", () => {
	test("keeps structure and links, drops tags and scripts", () => {
		const text = htmlToText(
			"<style>p{}</style><h1>Title</h1><p>One &amp; two</p><ul><li>A</li><li>B</li></ul><a href='https://x.io'>Link</a><script>x()</script>",
		);
		expect(text).toBe("Title\n\nOne & two\n\n- A\n- B\n\nLink (https://x.io)");
	});
});

describe("memoryTransport", () => {
	test("find and clear help tests pick up links", async () => {
		const transport = memoryTransport();
		const mailer = createMailer({ transport, from: "a@b.co" });
		await mailer.send({
			to: "x@y.io",
			subject: "Reset",
			text: "Go to https://app.io/reset?token=abc",
		});
		expect(transport.last("x@y.io")?.subject).toBe("Reset");
		expect(transport.links("x@y.io")).toEqual(["https://app.io/reset?token=abc"]);
		transport.clear();
		expect(transport.sent).toEqual([]);
	});
});

describe("fileTransport", () => {
	const dir = mkdtempSync(join(tmpdir(), "arachne-mail-"));
	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	test("writes RFC 5322 .eml files", async () => {
		const mailer = createMailer({ transport: fileTransport({ dir }), from: "a@b.co" });
		await mailer.send({ to: "x@y.io", subject: "Saved", text: "Body text", html: "<p>Body</p>" });
		const [file] = readdirSync(dir);
		expect(file).toEndWith(".eml");
		const raw = readFileSync(join(dir, file as string), "utf8");
		expect(raw).toContain("Subject: Saved");
		expect(raw).toContain("To: x@y.io");
		expect(raw).toContain("multipart/alternative");
	});
});

describe("resendTransport", () => {
	test("posts the message to the Resend API", async () => {
		const requests: Request[] = [];
		const transport = resendTransport({
			apiKey: "re_test",
			fetch: async (request) => {
				requests.push(request);
				return Response.json({ id: "email_123" });
			},
		});
		const mailer = createMailer({ transport, from: "a@b.co" });
		const result = await mailer.send({
			to: ["x@y.io"],
			subject: "S",
			text: "T",
			replyTo: "r@b.co",
		});
		expect(result.messageId).toBe("email_123");
		const request = requests[0] as Request;
		expect(request.url).toBe("https://api.resend.com/emails");
		expect(request.headers.get("authorization")).toBe("Bearer re_test");
		expect(await request.json()).toMatchObject({
			from: "a@b.co",
			to: ["x@y.io"],
			subject: "S",
			reply_to: ["r@b.co"],
		});
	});

	test("API errors reject with the provider message", async () => {
		const transport = resendTransport({
			apiKey: "k",
			fetch: async () => Response.json({ message: "domain not verified" }, { status: 403 }),
		});
		const mailer = createMailer({ transport, from: "a@b.co" });
		await expect(mailer.send({ to: "x@y.io", subject: "S", text: "T" })).rejects.toThrow(
			"domain not verified",
		);
	});
});

describe("smtpTransport", () => {
	let server: Bun.TCPSocketListener<{ data: boolean; buffer: string }> | undefined;
	const received: string[] = [];

	beforeAll(() => {
		// Minimal SMTP sink: enough of RFC 5321 for one plain-text delivery.
		server = Bun.listen<{ data: boolean; buffer: string }>({
			hostname: "127.0.0.1",
			port: 0,
			socket: {
				open(socket) {
					socket.data = { data: false, buffer: "" };
					socket.write("220 sink ESMTP\r\n");
				},
				data(socket, chunk) {
					socket.data.buffer += chunk.toString();
					let index = socket.data.buffer.indexOf("\r\n");
					while (index !== -1) {
						const line = socket.data.buffer.slice(0, index);
						socket.data.buffer = socket.data.buffer.slice(index + 2);
						if (socket.data.data) {
							if (line === ".") {
								socket.data.data = false;
								socket.write("250 queued\r\n");
							} else received.push(line);
						} else if (/^(EHLO|HELO)/i.test(line)) socket.write("250 sink\r\n");
						else if (/^DATA/i.test(line)) {
							socket.data.data = true;
							socket.write("354 go\r\n");
						} else if (/^QUIT/i.test(line)) socket.end("221 bye\r\n");
						else socket.write("250 ok\r\n");
						index = socket.data.buffer.indexOf("\r\n");
					}
				},
			},
		});
	});
	afterAll(() => server?.stop(true));

	test("delivers through an SMTP server", async () => {
		const transport = smtpTransport({
			host: "127.0.0.1",
			port: server?.port ?? 0,
			secure: false,
			ignoreTLS: true,
		});
		const mailer = createMailer({ transport, from: "a@b.co" });
		const result = await mailer.send({ to: "x@y.io", subject: "Over SMTP", text: "Hello SMTP" });
		expect(result.messageId).toBeString();
		expect(received.join("\n")).toContain("Subject: Over SMTP");
		expect(received.join("\n")).toContain("Hello SMTP");
		await transport.close?.();
	});
});
