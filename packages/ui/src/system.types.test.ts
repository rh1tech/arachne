/**
 * Type-level contract for pass-through props: checked by `tsc` (typecheck),
 * with a trivial runtime body so `bun test` accepts the file.
 */
import { expect, test } from "bun:test";
import type { ButtonProps } from "./button.tsx";
import type { ModalProps } from "./dialog.tsx";
import type { TextInputProps } from "./input.tsx";

const ok: ButtonProps = {
	id: "save",
	title: "Save",
	"data-track": "save",
	"aria-label": "Save",
	onPointerEnter: (e: PointerEvent) => e,
	"on:custom": () => {},
	classes: { label: "x" },
	style: { "--a-btn-height": "3rem" },
};

// @ts-expect-error misspelled component prop must not be swallowed by pass-through
const typo: ButtonProps = { varient: "ghost" };

const input: TextInputProps = { autocomplete: "email", inputmode: "email", required: true };

// @ts-expect-error unknown attributes are rejected (use data-* for custom ones)
const badInput: TextInputProps = { autocompleet: "email" };

const modal: Pick<ModalProps, "role" | "onClose"> = { role: "alertdialog", onClose: () => {} };

test("pass-through prop types compile", () => {
	expect([ok, typo, input, badInput, modal].length).toBe(5);
});

import { type SlotProps, type SlotsOf, setup } from "./system.ts";

type CardLike = SlotProps<"root" | "header" | "body"> & { title?: string };
const slotNames: SlotsOf<CardLike>[] = ["root", "header", "body"];
// @ts-expect-error "footer" is not a declared slot
const badSlot: SlotsOf<CardLike> = "footer";

test("setup infers slots from the props type", () => {
	const [, , slot] = setup("CardLike", {} as CardLike, {}, ["title"]);
	expect(slot.class("header", "a-card-header")).toBe("a-card-header");
	// @ts-expect-error unknown slot names are rejected
	slot.class("footer");
	expect([slotNames, badSlot].length).toBe(2);
});
