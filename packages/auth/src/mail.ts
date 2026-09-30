import type { AuthMailKind, AuthMailTemplate, MailContext } from "./types.ts";

function escape(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function layout(ctx: MailContext, paragraphs: string[], action?: { label: string; url: string }) {
	const greeting = `Hi${ctx.name ? ` ${ctx.name}` : ""},`;
	const html = [
		`<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#1f2328">`,
		`<p>${escape(greeting)}</p>`,
		...paragraphs.map((p) => `<p>${escape(p)}</p>`),
		action
			? `<p><a href="${escape(action.url)}" style="display:inline-block;padding:10px 16px;background:#1f6feb;color:#fff;border-radius:6px;text-decoration:none">${escape(action.label)}</a></p><p style="font-size:13px;color:#57606a">Or open ${escape(action.url)}</p>`
			: "",
		`<p style="font-size:13px;color:#57606a">— ${escape(ctx.appName)}</p></body></html>`,
	].join("");
	const text = [
		greeting,
		"",
		...paragraphs.flatMap((p) => [p, ""]),
		...(action ? [`${action.label}: ${action.url}`, ""] : []),
		`— ${ctx.appName}`,
	].join("\n");
	return { html, text };
}

/** Built-in mail templates (plain, accessible HTML plus text). */
export const defaultTemplates: Record<AuthMailKind, AuthMailTemplate> = {
	verifyEmail: (ctx) => ({
		subject: `Confirm your email for ${ctx.appName}`,
		...layout(ctx, ["Please confirm your email address. The link expires in 24 hours."], {
			label: "Confirm email",
			url: ctx.url ?? "",
		}),
	}),
	resetPassword: (ctx) => ({
		subject: `Reset your ${ctx.appName} password`,
		...layout(
			ctx,
			[
				"Someone asked to reset your password. The link expires in 1 hour.",
				"If this wasn't you, ignore this email.",
			],
			{ label: "Choose a new password", url: ctx.url ?? "" },
		),
	}),
	passwordChanged: (ctx) => ({
		subject: `Your ${ctx.appName} password was changed`,
		...layout(ctx, [
			"Your password was just changed and your other sessions were signed out.",
			"If this wasn't you, reset your password now.",
		]),
	}),
	emailChangeRequested: (ctx) => ({
		subject: `Your ${ctx.appName} email is changing`,
		...layout(ctx, [
			`A change of your email address to ${ctx.email ?? "a new address"} was requested.`,
			"If this wasn't you, change your password now.",
		]),
	}),
	confirmEmailChange: (ctx) => ({
		subject: `Confirm your new email for ${ctx.appName}`,
		...layout(
			ctx,
			["Confirm this address to finish changing your email. The link expires in 24 hours."],
			{
				label: "Confirm new email",
				url: ctx.url ?? "",
			},
		),
	}),
	signupAttempt: (ctx) => ({
		subject: "Someone tried to sign up with your email",
		...layout(ctx, [
			`Someone tried to create a ${ctx.appName} account with this address, but you already have one.`,
			"If that was you, sign in or reset your password instead.",
		]),
	}),
};
