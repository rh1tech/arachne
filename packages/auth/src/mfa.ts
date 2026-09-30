import type { Core, UserRow } from "./core.ts";
import {
	matchTotp,
	newTotpSecret,
	recoveryCodes,
	seal,
	sha256,
	totpStep,
	unseal,
} from "./crypto.ts";
import { AuthError } from "./errors.ts";

/** TOTP two-factor authentication. */
export interface Mfa {
	/** Start enrolment: a new secret and `otpauth://` URI for a QR code. Not active until {@link Mfa.enable}. */
	setup: (userId: string) => Promise<{ secret: string; uri: string }>;
	/** Confirm enrolment with a current code; returns one-time recovery codes (shown once). */
	enable: (userId: string, code: string) => Promise<{ recoveryCodes: string[] }>;
	/** Turn two-factor off (needs the password). */
	disable: (userId: string, password: string) => Promise<void>;
	/** Check a TOTP or recovery code for an enrolled user; consumes it. */
	verify: (row: UserRow, code: string) => Promise<boolean>;
}

/** Build TOTP support over the core. */
export function createMfa(core: Core): Mfa {
	const { db, tables } = core;
	const secretFor = (row: UserRow) =>
		row.mfaSecret ? unseal(core.options.secret, row.mfaSecret) : undefined;
	const store = (secret: string) =>
		core.options.secret ? seal(core.options.secret, secret) : Promise.resolve(secret);

	const verify = async (row: UserRow, code: string): Promise<boolean> => {
		const secret = await secretFor(row);
		if (!secret) return false;
		const clean = code.replace(/\s/g, "");
		const step = await matchTotp(secret, clean, core.now());
		// Each time step works once, so an intercepted code can't be replayed.
		if (step !== undefined && step > row.mfaLastStep) {
			await db.update(tables.users).set({ mfaLastStep: step }).where({ id: row.id }).run();
			return true;
		}
		const hashed = sha256(clean.toLowerCase());
		if (row.recoveryCodes.includes(hashed)) {
			await db
				.update(tables.users)
				.set({ recoveryCodes: row.recoveryCodes.filter((c) => c !== hashed) })
				.where({ id: row.id })
				.run();
			await core.emit(
				"mfa.recovery_code_used",
				row.id,
				{},
				{ remaining: row.recoveryCodes.length - 1 },
			);
			return true;
		}
		return false;
	};

	return {
		async setup(userId) {
			const user = await core.requireUser(userId);
			const secret = newTotpSecret();
			await db
				.update(tables.users)
				.set({ mfaSecret: await store(secret), mfaEnabled: false })
				.where({ id: userId })
				.run();
			const label = `${encodeURIComponent(core.appName)}:${encodeURIComponent(user.email)}`;
			const params = new URLSearchParams({
				secret,
				issuer: core.appName,
				algorithm: "SHA1",
				digits: "6",
				period: "30",
			});
			return { secret, uri: `otpauth://totp/${label}?${params}` };
		},
		async enable(userId, code) {
			const row = await core.userRow(userId);
			const secret = row && (await secretFor(row));
			if (!row || !secret) throw new AuthError("mfa_not_setup", "Start two-factor setup first");
			const step = await matchTotp(secret, code.replace(/\s/g, ""), core.now());
			if (step === undefined) throw new AuthError("invalid_code", "That code is not valid");
			const codes = recoveryCodes();
			await db
				.update(tables.users)
				.set({ mfaEnabled: true, mfaLastStep: step, recoveryCodes: codes.map((c) => sha256(c)) })
				.where({ id: userId })
				.run();
			await core.emit("mfa.enabled", userId);
			return { recoveryCodes: codes };
		},
		async disable(userId, password) {
			const row = await core.userRow(userId);
			if (!row || !(await core.verifyPassword(password, row.passwordHash))) {
				throw new AuthError("invalid_credentials", "Password is incorrect");
			}
			await db
				.update(tables.users)
				.set({
					mfaEnabled: false,
					mfaSecret: null,
					recoveryCodes: [],
					mfaLastStep: totpStep(core.now()),
				})
				.where({ id: userId })
				.run();
			await core.emit("mfa.disabled", userId);
		},
		verify,
	};
}
