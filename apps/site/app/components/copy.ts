const COPIED_MS = 1600;

/**
 * Delegated click handler for `[data-copy]` buttons inside rendered HTML:
 * copies the text of the `<pre>` next to the button.
 */
export async function copyCode(event: MouseEvent): Promise<void> {
	const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-copy]");
	const code = button?.parentElement?.querySelector("pre")?.textContent;
	if (!button || code == null) return;
	try {
		await navigator.clipboard.writeText(code.replace(/\n$/, ""));
		button.textContent = "Copied";
	} catch {
		button.textContent = "Press ⌘C";
		const range = document.createRange();
		range.selectNodeContents(button.parentElement?.querySelector("pre") as Node);
		getSelection()?.removeAllRanges();
		getSelection()?.addRange(range);
	}
	setTimeout(() => {
		button.textContent = "Copy";
	}, COPIED_MS);
}
