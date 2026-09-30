import type { AuthUser } from "@arachne/auth";
import { For, Show } from "@arachne/render";
import { currentRouter, Link, type RouteDefinition, type RouteProps } from "@arachne/router";
import { createClient } from "@arachne/server/client";
import { signal } from "@arachne/signals";
import type { Api } from "./api.ts";

interface PageData {
	user: AuthUser | null;
}
interface NoteRow {
	id: string;
	title: string;
	body: string;
	createdAt: string;
}

const api = createClient<Api>();
const refresh = (to = currentRouter()?.location().href ?? "/") =>
	currentRouter()?.navigate(to, { replace: true });

/** POST JSON to an auth endpoint; resolves to an error message or undefined. */
async function post(path: string, body: Record<string, unknown>): Promise<string | undefined> {
	const response = await fetch(path, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
	if (response.ok) return undefined;
	const payload = (await response.json().catch(() => ({}))) as {
		error?: { message?: string; issues?: Array<{ path: string; message: string }> };
	};
	const issue = payload.error?.issues?.[0];
	return issue
		? `${issue.path}: ${issue.message}`
		: (payload.error?.message ?? `Request failed (${response.status})`);
}

const fields = (event: SubmitEvent) =>
	Object.fromEntries(new FormData(event.currentTarget as HTMLFormElement)) as Record<
		string,
		string
	>;

function Layout(props: RouteProps) {
	const user = () => (props.data as PageData | undefined)?.user ?? null;
	const signOut = async () => {
		await post("/auth/logout", {});
		await currentRouter()?.navigate("/");
	};
	return (
		<div class="app">
			<header class="bar">
				<Link href="/" class="brand">
					Notebook
				</Link>
				<nav aria-label="Main">
					<Show
						when={user()}
						fallback={
							<>
								<Link href="/login">Sign in</Link>
								<Link href="/register" class="button">
									Create account
								</Link>
							</>
						}
					>
						<Link href="/notes">My notes</Link>
						<span class="who">{user()?.email}</span>
						<button type="button" class="link" onClick={signOut}>
							Sign out
						</button>
					</Show>
				</nav>
			</header>
			<main id="main">{props.children}</main>
		</div>
	);
}

function Home(props: RouteProps) {
	const user = (props.data as PageData).user;
	return (
		<section class="hero">
			<h1>Your notes, anywhere.</h1>
			<p>
				A full-stack Arachne example: server-rendered pages, accounts with email verification, and a
				typed notes API.
			</p>
			<Show
				when={user}
				fallback={
					<Link href="/register" class="button">
						Get started
					</Link>
				}
			>
				<Link href="/notes" class="button">
					Open my notes
				</Link>
			</Show>
		</section>
	);
}

function AuthForm(props: {
	title: string;
	submit: string;
	onSubmit: (values: Record<string, string>) => Promise<string | undefined>;
	children?: unknown;
	footer?: unknown;
}) {
	const error = signal<string | undefined>(undefined);
	const busy = signal(false);
	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		busy.set(true);
		error.set(await props.onSubmit(fields(event)));
		busy.set(false);
	};
	return (
		<section class="panel">
			<h1>{props.title}</h1>
			<form onSubmit={submit} novalidate>
				{props.children}
				<Show when={error()}>
					<p class="error" role="alert">
						{error()}
					</p>
				</Show>
				<button type="submit" disabled={busy()}>
					{busy() ? "Please wait…" : props.submit}
				</button>
			</form>
			{props.footer}
		</section>
	);
}

function Login() {
	return (
		<AuthForm
			title="Sign in"
			submit="Sign in"
			onSubmit={async (values) => {
				const error = await post("/auth/login", values);
				if (!error) await currentRouter()?.navigate("/notes");
				return error;
			}}
			footer={
				<p class="hint">
					<Link href="/forgot-password">Forgot your password?</Link> ·{" "}
					<Link href="/register">Create an account</Link>
				</p>
			}
		>
			<label>
				Email <input name="email" type="email" autocomplete="email" required />
			</label>
			<label>
				Password <input name="password" type="password" autocomplete="current-password" required />
			</label>
		</AuthForm>
	);
}

function Register() {
	const sent = signal(false);
	return (
		<Show
			when={!sent()}
			fallback={
				<section class="panel">
					<h1>Check your email</h1>
					<p>
						We sent a confirmation link. In development it is printed in the terminal running `bun
						run dev`.
					</p>
				</section>
			}
		>
			<AuthForm
				title="Create your account"
				submit="Create account"
				onSubmit={async (values) => {
					const error = await post("/auth/register", values);
					if (!error) sent.set(true);
					return error;
				}}
			>
				<label>
					Name <input name="name" autocomplete="name" />
				</label>
				<label>
					Email <input name="email" type="email" autocomplete="email" required />
				</label>
				<label>
					Password{" "}
					<input
						name="password"
						type="password"
						autocomplete="new-password"
						minlength="12"
						required
					/>
					<small>At least 12 characters.</small>
				</label>
			</AuthForm>
		</Show>
	);
}

function ForgotPassword() {
	const sent = signal(false);
	return (
		<Show
			when={!sent()}
			fallback={
				<section class="panel">
					<h1>Check your email</h1>
					<p>If an account exists, a reset link is on its way.</p>
				</section>
			}
		>
			<AuthForm
				title="Reset your password"
				submit="Send reset link"
				onSubmit={async (values) => {
					const error = await post("/auth/password/forgot", values);
					if (!error) sent.set(true);
					return error;
				}}
			>
				<label>
					Email <input name="email" type="email" autocomplete="email" required />
				</label>
			</AuthForm>
		</Show>
	);
}

function ResetPassword(props: RouteProps) {
	const token = (props.data as { token: string }).token;
	return (
		<AuthForm
			title="Choose a new password"
			submit="Save password"
			onSubmit={async (values) => {
				const error = await post("/auth/password/reset", { token, password: values["password"] });
				if (!error) await currentRouter()?.navigate("/login");
				return error;
			}}
		>
			<label>
				New password{" "}
				<input
					name="password"
					type="password"
					autocomplete="new-password"
					minlength="12"
					required
				/>
			</label>
		</AuthForm>
	);
}

function VerifyEmail(props: RouteProps) {
	const data = props.data as { verified: boolean; email?: string; message?: string };
	return (
		<section class="panel">
			<Show
				when={data.verified}
				fallback={
					<>
						<h1>Link not valid</h1>
						<p>{data.message}</p>
					</>
				}
			>
				<h1>Email confirmed</h1>
				<p>
					{data.email} is confirmed. <Link href="/login">Sign in</Link>.
				</p>
			</Show>
		</section>
	);
}

function Notes(props: RouteProps) {
	const data = props.data as PageData & { notes: NoteRow[] };
	const error = signal<string | undefined>(undefined);
	const add = async (event: SubmitEvent) => {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const values = fields(event);
		try {
			await api.post("/api/notes", {
				body: { title: values["title"] ?? "", body: values["body"] ?? "" },
			});
			form.reset();
			error.set(undefined);
			await refresh();
		} catch (caught) {
			error.set((caught as Error).message);
		}
	};
	const remove = async (id: string) => {
		await api.delete("/api/notes/:id", { params: { id } });
		await refresh();
	};
	return (
		<section class="notes">
			<h1>My notes</h1>
			<form class="compose" onSubmit={add}>
				<label>
					Title <input name="title" required maxlength="200" />
				</label>
				<label>
					Note <textarea name="body" rows="3" maxlength="10000" />
				</label>
				<Show when={error()}>
					<p class="error" role="alert">
						{error()}
					</p>
				</Show>
				<button type="submit">Add note</button>
			</form>
			<Show
				when={data.notes.length > 0}
				fallback={<p class="empty">No notes yet. Write your first one above.</p>}
			>
				<ul class="list">
					<For each={data.notes}>
						{(note) => (
							<li>
								<article>
									<h2>{note.title}</h2>
									<p>{note.body}</p>
									<button
										type="button"
										class="link danger"
										onClick={() => remove(note.id)}
										aria-label={`Delete ${note.title}`}
									>
										Delete
									</button>
								</article>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</section>
	);
}

export function NotFound() {
	return (
		<section class="panel">
			<h1>Page not found</h1>
			<p>
				<Link href="/">Back to the start</Link>
			</p>
		</section>
	);
}

/** Loader errors: 401 from /notes becomes a sign-in prompt. */
export function ErrorPage(props: { error: unknown }) {
	const status = (props.error as { status?: number })?.status;
	return (
		<section class="panel">
			<h1>{status === 401 ? "Please sign in" : "Something went wrong"}</h1>
			<p>{(props.error as Error)?.message}</p>
			<Show when={status === 401}>
				<Link href="/login" class="button">
					Sign in
				</Link>
			</Show>
		</section>
	);
}

export const routes: RouteDefinition[] = [
	{
		path: "/",
		component: Layout,
		children: [
			{ path: "", component: Home, head: { title: "Home" } },
			{ path: "login", component: Login, head: { title: "Sign in" } },
			{ path: "register", component: Register, head: { title: "Create account" } },
			{ path: "forgot-password", component: ForgotPassword, head: { title: "Reset password" } },
			{ path: "reset-password", component: ResetPassword, head: { title: "New password" } },
			{ path: "verify-email", component: VerifyEmail, head: { title: "Confirm email" } },
			{ path: "notes", component: Notes, head: { title: "My notes" } },
		],
	},
];
